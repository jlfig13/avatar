import { bigserial, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// docs/04 §6 — slice 1 database.
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const invites = pgTable('invites', {
  code: text('code').primaryKey(),
  maxUses: integer('max_uses').notNull(),
  uses: integer('uses').notNull().default(0),
  createdAt: createdAt(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  inviteCode: text('invite_code')
    .notNull()
    .references(() => invites.code),
  /** SHA-256 of the token; the token itself is never stored. */
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => accounts.id),
  name: text('name').notNull(),
  element: text('element', { enum: ['water', 'earth', 'fire', 'air'] }).notNull(),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  attributes: jsonb('attributes').notNull(),
  createdAt: createdAt(),
});

export const telemetryEvents = pgTable('telemetry_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  accountId: uuid('account_id').references(() => accounts.id),
  sessionId: uuid('session_id').notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: createdAt(),
});
