import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'scrypt';
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, KEY_LENGTH, { N: COST, r: BLOCK_SIZE, p: PARALLELISM });
  return [PREFIX, COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64'), derived.toString('base64')].join('$');
}

export function isHashedPassword(stored: string): boolean {
  return String(stored || '').startsWith(`${PREFIX}$`);
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accepts scrypt hashes and legacy plaintext rows; callers upgrade plaintext rows after a successful login. */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  if (!isHashedPassword(stored)) {
    return safeEqual(Buffer.from(password), Buffer.from(stored));
  }
  const [, cost, blockSize, parallelism, salt, hash] = stored.split('$');
  const expected = Buffer.from(hash || '', 'base64');
  if (!expected.length) return false;
  const derived = scryptSync(password, Buffer.from(salt || '', 'base64'), expected.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelism)
  });
  return safeEqual(derived, expected);
}
