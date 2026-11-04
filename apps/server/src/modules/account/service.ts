import { and, eq, lt, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.ts';
import { accounts, invites } from '../../db/schema.ts';
import { generateToken, hashToken } from './tokens.ts';

/** Consumes one use of the invite and creates an anonymous account. Null if invalid or exhausted. */
export async function redeemInvite(
  db: Database,
  inviteCode: string,
): Promise<{ accountId: string; token: string } | null> {
  return db.transaction(async (tx) => {
    const consumed = await tx
      .update(invites)
      .set({ uses: sql`${invites.uses} + 1` })
      .where(and(eq(invites.code, inviteCode), lt(invites.uses, invites.maxUses)))
      .returning({ code: invites.code });
    if (consumed.length === 0) return null;
    const token = generateToken();
    const [account] = await tx
      .insert(accounts)
      .values({ inviteCode, tokenHash: hashToken(token) })
      .returning({ id: accounts.id });
    if (!account) throw new Error('account insert returned nothing');
    return { accountId: account.id, token };
  });
}

/** Account id for a valid token (and refreshes lastSeenAt), else null. */
export async function authenticate(db: Database, token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length < 16 || token.length > 128) return null;
  const [row] = await db
    .update(accounts)
    .set({ lastSeenAt: new Date() })
    .where(eq(accounts.tokenHash, hashToken(token)))
    .returning({ id: accounts.id });
  return row?.id ?? null;
}
