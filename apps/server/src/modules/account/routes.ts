import { createEndpoint } from '@colyseus/core';
import { z } from 'zod';
import type { Database } from '../../db/client.ts';
import type { Logger } from '../../logger.ts';
import type { RateLimiter } from './rateLimit.ts';
import { redeemInvite } from './service.ts';

/** Header set by the server itself from the socket address (see app.ts); clients cannot spoof it. */
export const CLIENT_IP_HEADER = 'x-elemental-client-ip';

const RedeemBody = z.strictObject({ inviteCode: z.string().trim().min(1).max(64) });

export function createRedeemEndpoint(deps: { db: Database; limiter: RateLimiter; logger: Logger }) {
  return createEndpoint('/auth/redeem', { method: 'POST', body: RedeemBody }, async (ctx) => {
    const ip = ctx.headers?.get(CLIENT_IP_HEADER) ?? 'unknown';
    if (!deps.limiter.hit(ip)) throw ctx.error(429, { message: 'too_many_attempts' });
    const result = await redeemInvite(deps.db, ctx.body.inviteCode);
    if (!result) {
      deps.logger.info({ ip }, 'invite rejected');
      throw ctx.error(403, { message: 'invalid_invite' });
    }
    deps.logger.info({ accountId: result.accountId }, 'account created');
    ctx.setStatus(201);
    return { accountId: result.accountId, token: result.token };
  });
}
