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
  // Try JWT Bearer token first
  const authHeader = headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await new Promise((resolve, reject) => {
        jwt.verify(token, getKey, {
          audience: process.env.azure_client_id,
          issuer: `https://login.microsoftonline.com/${process.env.azure_tenant_id}/v2.0`,
          algorithms: ['RS256']
        }, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });
      const email = payload.preferred_username || payload.upn || '';
      if (!email.endsWith('@gig.com')) throw new Error('Unauthorized domain');
      return {
        id: payload.oid || payload.sub,
        email,
        name: payload.name || email.split('@')[0],
      };
    } catch(e) {
      console.warn('JWT verification failed:', e.message);
      // Fall through to header-based auth
    }
  }

  // Fallback: identity headers (for existing sessions)
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
