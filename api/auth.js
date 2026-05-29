const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.azure_tenant_id}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

async function verifyToken(headers) {
  const authHeader = headers['authorization'];

  // If Bearer token present — verify cryptographically, NO fallback
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) reject(new Error('Invalid token: ' + err.message));
        else resolve(decoded);
      });
    });

    if (payload.tid !== process.env.azure_tenant_id) throw new Error('Wrong tenant');
    if (payload.exp < Date.now() / 1000) throw new Error('Token expired');

    const email = payload.preferred_username || payload.upn || '';
    if (!email.endsWith('@gig.com')) throw new Error('Unauthorized domain');

    return {
      id: payload.oid || payload.sub,
      email,
      name: payload.name || email.split('@')[0],
    };
  }

  // No Bearer token — use identity headers
  const userId = headers['x-user-id'];
  const email = headers['x-user-email'];
  const name = headers['x-user-name'];
  const tenantId = headers['x-tenant-id'];

  if (!userId || !email || !tenantId) throw new Error('Missing identity');
  if (!email.endsWith('@gig.com')) throw new Error('Unauthorized domain');
  if (tenantId !== process.env.azure_tenant_id) throw new Error('Wrong tenant');

  const { data } = await supabase.from('users').select('id').eq('id', userId).eq('email', email).single();
  if (!data) throw new Error('User not found');

  return { id: userId, email, name: name || email.split('@')[0] };
}

async function isAdmin(supabase, userId) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

module.exports = { verifyToken, isAdmin };
