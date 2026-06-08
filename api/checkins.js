const { createClient } = require('@supabase/supabase-js');
const { verifyToken, isAdmin } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-User-Email, X-User-Name, X-Tenant-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try {
    caller = await verifyToken(req.headers);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: ' + e.message });
  }

  try {
    if (req.method === 'GET') {
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      let query = supabase.from('checkins').select('*');
      if (!callerIsAdmin) query = query.eq('user_id', caller.id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { office, desk_id, date } = req.body;
      if (!office || !desk_id || !date) return res.status(400).json({ error: 'Missing fields' });
      const { data, error } = await supabase.from('checkins').upsert({
        office, desk_id, date,
        user_id: caller.id,
        user_name: caller.name,
        at: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }, { onConflict: 'office,desk_id,date,user_id' });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { office, desk_id, date, user_id } = req.query;
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      if (user_id !== caller.id && !callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { error } = await supabase.from('checkins').delete()
        .match({ office, desk_id, date, user_id: callerIsAdmin ? user_id : caller.id });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
