import { defineRoom, Room } from '@colyseus/core';
import { Client } from '@colyseus/sdk';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type App, createApp } from '../src/app.ts';
import { ConfigError, loadConfig } from '../src/config.ts';
import { createLogger } from '../src/logger.ts';

const env = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  CORS_ORIGIN: 'http://localhost:5173',
  PORT: '0',
};

class EchoRoom extends Room {
  override onCreate() {
    this.onMessage('ping', (client, n: number) => client.send('pong', n + 1));
  }
}

describe('config', () => {
  it('applies defaults', () => {
    expect(loadConfig(env)).toMatchObject({ PORT: 0, AI_ACTION_DELAY_MS: 400, INVITE_CODES: '' });
  });

  it('refuses to start when a required variable is missing', () => {
    expect(() => loadConfig({ ...env, DATABASE_URL: undefined })).toThrow(ConfigError);
    expect(() => loadConfig({ ...env, CORS_ORIGIN: '' })).toThrow(/CORS_ORIGIN/);
  });
});

describe('server bootstrap', () => {
  let app: App;
  let port: number;
  beforeAll(async () => {
    const config = loadConfig(env);
    app = createApp({
      config,
      logger: createLogger('silent'),
      rooms: { echo: defineRoom(EchoRoom) },
    });
    port = await app.listen(0);
  });
  afterAll(async () => {
    await app.close();
  });

  it('GET /health → { status: "ok" } with the configured CORS origin', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('a test room accepts a connection from the SDK client', async () => {
    const client = new Client(`ws://localhost:${port}`);
    const room = await client.joinOrCreate('echo');
    const pong = await new Promise((resolve) => {
      room.onMessage('pong', resolve);
      room.send('ping', 41);
    });
    expect(pong).toBe(42);
    await room.leave();
  });
});

describe('logger', () => {
  it('redacts tokens and authorization headers', () => {
    const lines: string[] = [];
    const logger = createLogger('info', { write: (line: string) => lines.push(line) });
    logger.info(
      {
        token: 'secret-1',
        account: { token: 'secret-2' },
        headers: { authorization: 'Bearer secret-3' },
      },
      'auth',
    );
    const output = lines.join('');
    expect(output).toContain('[redacted]');
    expect(output).not.toMatch(/secret-\d/);
  });
});
