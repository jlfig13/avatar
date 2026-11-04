import type { Database } from './client.ts';
import { invites } from './schema.ts';

/** Default uses per invite when INVITE_CODES has no explicit count (`CODE:N`). */
export const DEFAULT_INVITE_USES = 1;

/** Parses INVITE_CODES ("ALPHA-001,ALPHA-002:5") into codes and max uses. */
export function parseInviteCodes(raw: string): { code: string; maxUses: number }[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code = '', uses] = entry.split(':');
      const maxUses = uses ? Number.parseInt(uses, 10) : DEFAULT_INVITE_USES;
      if (!code || !Number.isInteger(maxUses) || maxUses < 1)
        throw new Error(`Invalid invite entry "${entry}"`);
      return { code, maxUses };
    });
}

/** Idempotent: existing codes are left untouched. Returns how many were inserted. */
export async function seedInvites(db: Database, raw: string): Promise<number> {
  const rows = parseInviteCodes(raw);
  if (rows.length === 0) return 0;
  const inserted = await db
    .insert(invites)
    .values(rows)
    .onConflictDoNothing()
    .returning({ code: invites.code });
  return inserted.length;
}
