const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyToken(headers) {
  const userId = headers['x-user-id'];
  const email = headers['x-user-email'];
  const name = headers['x-user-name'];
  const tenantId = headers['x-tenant-id'];

  if (!userId || !email || !tenantId) {
    throw new Error('Missing identity headers');
  }

  if (!email.endsWith('@gig.com')) {
    throw new Error('Unauthorized domain');
  }

  if (tenantId !== process.env.azure_tenant_id) {
    throw new Error('Wrong tenant');
  }

  // Verify user exists in Supabase (was created via real SSO login)
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('email', email)
    .single();

  if (!data) {
    throw new Error('User not found — please login first');
  }

  return { id: userId, email, name: name || email.split('@')[0] };
}

async function isAdmin(supabase, userId) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

module.exports = { verifyToken, isAdmin };
