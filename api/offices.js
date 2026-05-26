const { createClient } = require('@supabase/supabase-js');
const { verifyToken, isAdmin } = require('./auth');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
        .from('users')
        .select('id, name, email, office, is_admin, is_superadmin')
        .order('name');
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      const callerIsSuperAdmin = await isSuperAdmin(caller.id);
      const { id, office } = req.body;

      if (id === caller.id) {
        const { data, error } = await supabase.from('users').upsert(
          { id: caller.id, name: caller.name, email: caller.email, office: office || 'Marbella' },
          { onConflict: 'id' }
        );
        if (error) throw error;
        return res.status(200).json(data);
      }

      if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });

      const safeUpdate = { id };
      if (office !== undefined) safeUpdate.office = office;
      if (req.body.name !== undefined) safeUpdate.name = req.body.name;
      if (req.body.email !== undefined) safeUpdate.email = req.body.email;
      if (req.body.is_admin !== undefined && callerIsSuperAdmin) safeUpdate.is_admin = !!req.body.is_admin;

      const { data, error } = await supabase.from('users').upsert(safeUpdate, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const callerIsAdmin = await isAdmin(supabase, caller.id);
      if (!callerIsAdmin) return res.status(403).json({ error: 'Forbidden' });
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
