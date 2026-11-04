import { ServerError } from '@colyseus/core';
import type { Database } from '../../db/client.ts';
import { authenticate } from './service.ts';

export interface AuthData {
  readonly accountId: string;
}

/** Room `onAuth` helper: rejects connections without a valid token. */
export async function requireAccount(db: Database, token: unknown): Promise<AuthData> {
  const accountId = await authenticate(db, token);
  if (!accountId) throw new ServerError(401, 'invalid_token');
  return { accountId };
}
