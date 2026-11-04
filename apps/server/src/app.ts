import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createRouter,
  defineServer,
  type Endpoint,
  matchMaker,
  type RegisteredHandler,
} from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Config } from './config.ts';
import type { Logger } from './logger.ts';
import { healthEndpoint } from './modules/health/routes.ts';

export interface AppOptions {
  readonly config: Config;
  readonly logger: Logger;
  readonly rooms: Record<string, RegisteredHandler>;
  readonly endpoints?: Record<string, Endpoint>;
}

export interface App {
  readonly http: HttpServer;
  listen(port?: number): Promise<number>;
  close(): Promise<void>;
}

/** Modular monolith (docs/04 §1.5): one Colyseus process; modules contribute rooms and routes. */
export function createApp(options: AppOptions): App {
  const { config, logger } = options;
  // CORS restricted to the configured client origin.
  matchMaker.controller.getCorsHeaders = () => ({
    'Access-Control-Allow-Origin': config.CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '2592000',
    Vary: 'Origin',
  });
  const http = createServer();
  const server = defineServer({
    greet: false,
    gracefullyShutdown: false,
    transport: new WebSocketTransport({ server: http }),
    rooms: options.rooms,
    routes: createRouter({ health: healthEndpoint, ...options.endpoints }),
  });
  return {
    http,
    async listen(port = config.PORT) {
      await server.listen(port);
      const actual = (http.address() as AddressInfo).port;
      logger.info({ port: actual }, 'server listening');
      return actual;
    },
    async close() {
      await server.gracefullyShutdown(false);
    },
  };
}
