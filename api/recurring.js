const { createClient } = require('@supabase/supabase-js');
const { verifyToken, isAdmin } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try {
    caller = await verifyToken(req.headers);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: ' + e.message });
  }

  if (req.method !== 'GET') {
    const callerIsAdmin = await isAdmin(supabase, caller.id);
    if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden: admin required' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('recurring_fixed').select('*');
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { office, desk_id, person, days } = req.body;
      const { data, error } = await supabase.from('recurring_fixed').upsert(
        { office, desk_id, person, days }, { onConflict: 'office,desk_id' }
      );
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { office, desk_id } = req.query;
      const { error } = await supabase.from('recurring_fixed').delete().match({ office, desk_id });
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
