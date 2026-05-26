const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function isSuperAdmin(userId) {
  const { data } = await supabase.from('users').select('is_superadmin').eq('id', userId).single();
  return data?.is_superadmin === true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
      const { data, error } = await supabase
        .from('offices')
        .select('id, name, color, flag, layout, config')
        .order('id');
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const superAdmin = await isSuperAdmin(caller.id);
      if (!superAdmin) return res.status(403).json({ error: 'Forbidden: superadmin required' });
      const { id, config } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data, error } = await supabase.from('offices').update({ config }).eq('id', id).select();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
