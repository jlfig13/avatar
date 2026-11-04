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
import { CLIENT_IP_HEADER } from './modules/account/routes.ts';
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

/** Records the socket address for rate limiting, overwriting anything the client sent. */
function tagClientIp(http: HttpServer) {
  http.prependListener('request', (req) => {
    const ip = req.socket.remoteAddress ?? 'unknown';
    req.headers[CLIENT_IP_HEADER] = ip;
    // The router builds its Request from rawHeaders: drop any client-sent copy and add ours.
    const raw: string[] = [];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i] ?? '';
      if (name.toLowerCase() !== CLIENT_IP_HEADER) raw.push(name, req.rawHeaders[i + 1] ?? '');
    }
    raw.push(CLIENT_IP_HEADER, ip);
    req.rawHeaders.splice(0, req.rawHeaders.length, ...raw);
  });
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
      // Must run after listen(): Colyseus re-wraps the request listeners while binding its routes.
      tagClientIp(http);
      const actual = (http.address() as AddressInfo).port;
      logger.info({ port: actual }, 'server listening');
      return actual;
    },
    async close() {
      await server.gracefullyShutdown(false);
    },
  };
}
