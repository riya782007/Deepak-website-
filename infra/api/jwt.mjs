// Verifies Cognito ID tokens with Node's own crypto (no dependencies to bundle).
import {createPublicKey, verify} from 'node:crypto';

const b64 = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let cache = {url: '', keys: null, at: 0};

async function keys(url, fetchImpl) {
  if (cache.url === url && cache.keys && Date.now() - cache.at < 6 * 3600e3) return cache.keys;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error('jwks ' + res.status);
  const {keys: list} = await res.json();
  cache = {url, at: Date.now(), keys: Object.fromEntries(list.map(k => [k.kid, createPublicKey({key: k, format: 'jwk'})]))};
  return cache.keys;
}

// Returns the token's claims, or throws. `now` and `fetchImpl` are injectable for tests.
export async function verifyIdToken(token, {region, poolId, clientId, now = Date.now(), fetchImpl = fetch, jwks}) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed');
  const header = JSON.parse(b64(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256') throw new Error('alg');
  const iss = `https://cognito-idp.${region}.amazonaws.com/${poolId}`;
  const keyset = jwks || await keys(iss + '/.well-known/jwks.json', fetchImpl);
  const key = keyset[header.kid];
  if (!key) throw new Error('kid');
  if (!verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, b64(parts[2]))) throw new Error('signature');
  if (claims.iss !== iss) throw new Error('iss');
  if (claims.token_use !== 'id') throw new Error('token_use');
  if (claims.aud !== clientId) throw new Error('aud');
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now) throw new Error('expired');
  return claims;
}
