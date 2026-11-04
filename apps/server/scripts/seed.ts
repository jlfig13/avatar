// pnpm db:seed — creates the invites listed in INVITE_CODES (idempotent).
import { connect } from '../src/db/client.ts';
import { seedInvites } from '../src/db/seed.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const handle = connect(url);
try {
  const inserted = await seedInvites(handle.db, process.env.INVITE_CODES ?? '');
  console.log(`invites inserted: ${inserted}`);
} finally {
  await handle.close();
}
