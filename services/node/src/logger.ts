type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = (process.env.LOG_LEVEL as Level | undefined) ?? 'info';

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

export function createLogger(scope: string) {
  const log = (level: Level, msg: string, data?: Record<string, unknown>) => {
    if (order[level] < order[minLevel]) return;
    const line = {
      t: new Date().toISOString(),
      level,
      scope,
      msg,
      ...(data ? (serialize(data) as Record<string, unknown>) : {}),
    };
    const out = JSON.stringify(line);
    if (level === 'error') process.stderr.write(out + '\n');
    else process.stdout.write(out + '\n');
  };
  return {
    debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  };
}

export type Logger = ReturnType<typeof createLogger>;
