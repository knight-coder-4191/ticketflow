const crypto = require('crypto');

// Load environment variables or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'ticketflow_default_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

let bcryptModule = null;
try {
  bcryptModule = require('bcryptjs');
} catch (e) {
  bcryptModule = null;
}

let jwtModule = null;
try {
  jwtModule = require('jsonwebtoken');
} catch (e) {
  jwtModule = null;
}

/**
 * Hash password securely with salt (OWASP standard)
 */
async function hashPassword(plainPassword) {
  if (bcryptModule) {
    const salt = await bcryptModule.genSalt(10);
    return await bcryptModule.hash(plainPassword, salt);
  }
  // Pure Node.js crypto PBKDF2 fallback
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(plainPassword, salt, 10000, 64, 'sha512', (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`pbkdf2$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify password against stored hash
 */
async function comparePassword(plainPassword, storedHash) {
  if (!storedHash || !plainPassword) return false;

  if (bcryptModule && storedHash.startsWith('$2')) {
    return await bcryptModule.compare(plainPassword, storedHash);
  }

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const salt = parts[1];
    const key = parts[2];
    return new Promise((resolve) => {
      crypto.pbkdf2(plainPassword, salt, 10000, 64, 'sha512', (err, derivedKey) => {
        if (err) return resolve(false);
        resolve(derivedKey.toString('hex') === key);
      });
    });
  }

  // Support direct bcrypt compare if module is available
  if (bcryptModule) {
    try {
      return await bcryptModule.compare(plainPassword, storedHash);
    } catch (e) {
      // Continue to next check
    }
  }

  // Fallback constant-time compare
  const sha = crypto.createHmac('sha256', JWT_SECRET).update(plainPassword).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sha), Buffer.from(storedHash.padStart(64, '0').slice(-64)));
}

/**
 * Encode Base64URL
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decode Base64URL
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Sign JSON Web Token (RFC 7519 compliant)
 */
function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  if (jwtModule) {
    return jwtModule.sign(payload, JWT_SECRET, { expiresIn });
  }

  // Native HMAC-SHA256 JWT generation
  const header = { alg: 'HS256', typ: 'JWT' };
  let expSeconds = 86400; // default 24h
  if (typeof expiresIn === 'string' && expiresIn.endsWith('h')) {
    expSeconds = parseInt(expiresIn, 10) * 3600;
  } else if (typeof expiresIn === 'number') {
    expSeconds = expiresIn;
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expSeconds;
  const tokenPayload = { ...payload, iat, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JSON Web Token
 */
function verifyToken(token) {
  if (jwtModule) {
    try {
      return jwtModule.verify(token, JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken
};
