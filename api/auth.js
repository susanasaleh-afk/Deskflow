// Shared auth helper for all API endpoints
const https = require('https');

// Cache JWKS keys
let jwksCache = null;
let jwksCacheTime = 0;

async function getJwks() {
  if (jwksCache && Date.now() - jwksCacheTime < 3600000) return jwksCache;
  const tenantId = process.env.azure_tenant_id;
  return new Promise((resolve, reject) => {
    https.get(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        jwksCache = JSON.parse(data);
        jwksCacheTime = Date.now();
        resolve(jwksCache);
      });
    }).on('error', reject);
  });
}

async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }
  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const tenantId = process.env.azure_tenant_id;
  if (!payload.oid && !payload.sub) throw new Error('No user ID in token');
  if (payload.tid !== tenantId) throw new Error('Wrong tenant');
  if (payload.exp < Date.now() / 1000) throw new Error('Token expired');
  const email = payload.preferred_username || payload.upn || '';
  if (!email.endsWith('@gig.com')) throw new Error('Unauthorized domain');
  return {
    id: payload.oid || payload.sub,
    email,
    name: payload.name || email.split('@')[0],
  };
}

async function isAdmin(supabase, userId) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single();
  return data?.is_admin === true;
}

module.exports = { verifyToken, isAdmin };
