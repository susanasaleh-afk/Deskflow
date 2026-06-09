const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 24 * 60 * 60 * 1000, // cache keys for 24 hours
  rateLimit: true,
});

// Cache verified tokens to avoid re-verifying on every request
const _tokenCache = new Map();

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

async function verifyToken(headers) {
  const authHeader = headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.slice(7);

  // return cached result if token hasn't changed
  if (_tokenCache.has(token)) {
    const cached = _tokenCache.get(token);
    if (cached.exp > Date.now() / 1000) return cached.user;
    _tokenCache.delete(token);
  }

  const payload = await new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) reject(new Error('Invalid token: ' + err.message));
      else resolve(decoded);
    });
  });

  if (payload.tid !== process.env.AZURE_TENANT_ID) throw new Error('Wrong tenant');
  if (payload.exp < Date.now() / 1000) throw new Error('Token expired');

  const email = payload.preferred_username || payload.upn || '';
  if (!email.endsWith('@gig.com')) throw new Error('Unauthorized domain');

  const user = {
    id: payload.oid || payload.sub,
    email,
    name: payload.name || email.split('@')[0],
  };

  // cache for the lifetime of the token
  _tokenCache.set(token, { user, exp: payload.exp });

  // keep cache small
  if (_tokenCache.size > 500) {
    const now = Date.now() / 1000;
    for (const [k, v] of _tokenCache) {
      if (v.exp < now) _tokenCache.delete(k);
    }
  }

  return user;
}

// Cache isAdmin results to avoid a DB hit on every request
const _adminCache = new Map();

async function isAdmin(supabase, userId) {
  const cached = _adminCache.get(userId);
  if (cached && cached.exp > Date.now()) return cached.value;

  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single();
  const value = data?.is_admin === true;

  // cache for 5 minutes
  _adminCache.set(userId, { value, exp: Date.now() + 5 * 60 * 1000 });
  return value;
}

module.exports = { verifyToken, isAdmin };
