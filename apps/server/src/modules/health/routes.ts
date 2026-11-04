import { createEndpoint } from '@colyseus/core';

export const healthEndpoint = createEndpoint('/health', { method: 'GET' }, async () => ({
  status: 'ok' as const,
}));
