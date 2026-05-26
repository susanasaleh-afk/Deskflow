const { createClient } = require('@supabase/supabase-js');
const { verifyToken, isAdmin } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try {
    caller = await verifyToken(req.headers.authorization);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: ' + e.message });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('offices')
        .select('id, name, color, flag, layout, config')
        .order('id');
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });

      const { id, config } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const { data, error } = await supabase
        .from('offices')
        .update({ config })
        .eq('id', id)
        .select();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
