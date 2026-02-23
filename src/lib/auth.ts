const COOKIE_NAME = 'auth_token';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/** Encode string to Uint8Array for Web Crypto */
function encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Derive an HMAC-SHA256 key from the secret */
async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Sign a payload and return "payload.signature" (base64url) */
export async function signToken(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${payload}.${sigB64}`;
}

/** Verify token and return the payload, or null on failure */
export async function verifyToken(token: string, secret: string): Promise<string | null> {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;

  const payload = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const key = await getKey(secret);
  // Convert base64url back to base64
  const base64 = sigB64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  let sigBytes: Uint8Array;
  try {
    sigBytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encode(payload));
  return valid ? payload : null;
}

/** Build the Set-Cookie header value for the auth token */
export function buildAuthCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

/** Build the Set-Cookie header to clear the auth cookie */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Extract the token value from a Cookie header string */
export function extractToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
