import { createHash, randomBytes } from 'node:crypto';

// docs/04 §6 — 32 random bytes handed to the client once; only the SHA-256 is stored.
export const generateToken = (): string => randomBytes(32).toString('base64url');
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
