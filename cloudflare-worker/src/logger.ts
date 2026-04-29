type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let _minLevel: LogLevel = 'info';

export const logger = {
  setLevel(level: LogLevel): void {
    _minLevel = level;
  },

  info (scope: string, msg: string, data?: unknown): void { emit('info',  scope, msg, data); },
  warn (scope: string, msg: string, data?: unknown): void { emit('warn',  scope, msg, data); },
  error(scope: string, msg: string, data?: unknown): void { emit('error', scope, msg, data); },
  debug(scope: string, msg: string, data?: unknown): void { emit('debug', scope, msg, data); },
};

function emit(level: LogLevel, scope: string, msg: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[_minLevel]) return;

  const entry: Record<string, unknown> = { level, scope, msg, ts: Date.now() };
  if (data !== undefined) entry['data'] = data;

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
