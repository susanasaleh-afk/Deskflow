const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://gig-deskflow.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-User-Email, X-User-Name, X-Tenant-Id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let caller;
  try {
    caller = await verifyToken(req.headers);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: ' + e.message });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, office, is_admin, is_superadmin')
      .eq('id', caller.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'User not found' });

    return res.status(200).json({
      id: data.id,
      name: data.name,
      email: data.email,
      office: data.office,
      is_admin: data.is_admin === true,
      is_superadmin: data.is_superadmin === true
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
