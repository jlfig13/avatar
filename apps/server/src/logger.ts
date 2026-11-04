import pino, { type DestinationStream, type Logger } from 'pino';

/** Structured JSON logs. Secrets (tokens, authorization headers) are always redacted. */
export function createLogger(level: string, destination?: DestinationStream): Logger {
  const options = {
    level,
    base: { service: 'elemental-server' },
    redact: {
      paths: [
        'token',
        '*.token',
        '*.*.token',
        'authorization',
        '*.authorization',
        'headers.authorization',
        '*.headers.authorization',
      ],
      censor: '[redacted]',
    },
  };
  return destination ? pino(options, destination) : pino(options);
}

export type { Logger };
