import crypto from 'crypto';

export const newSeed = () => crypto.randomBytes(32).toString('hex');
export const hashSeed = (seed) => crypto.createHash('sha256').update(seed).digest('hex');

// Provably Fair: SHA-256 HMAC -> 52-bit integer -> crash point (house edge ~1%)
export function crashPointFromSeeds(serverSeed, clientSeed, nonce) {
  const hex = crypto.createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`).digest('hex');
  const h = parseInt(hex.slice(0, 13), 16);
  const e = 2 ** 52;
  const crash = Math.floor((100 * e - h) / (e - h)) / 100;
  return Math.max(1.0, Math.min(crash, 10000));
}