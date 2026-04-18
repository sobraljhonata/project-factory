// src/config/logger.ts
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Evita `{}` no JSON quando se passa `Error` em `meta` (message/stack não são enumeráveis). */
function toSerializable(value: unknown): unknown {
  if (value instanceof Error) {
    const withSql = value as Error & {
      parent?: { code?: string; errno?: number; sqlMessage?: string; sql?: string };
    };
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(withSql.parent
        ? {
            sql: {
              code: withSql.parent.code,
              errno: withSql.parent.errno,
              sqlMessage: withSql.parent.sqlMessage,
            },
          }
        : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        toSerializable(v),
      ]),
    );
  }
  return value;
}

function normalizeMeta(
  meta?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  return Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [k, toSerializable(v)]),
  ) as Record<string, unknown>;
}

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  database: (message: string, meta?: Record<string, unknown>) => void;
}

const formatLog = (
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) => {
  const base = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  };

  return meta ? { ...base, ...normalizeMeta(meta) } : base;
};
const addColorConsole = {
  red(message: string) {
    return `\x1b[31m ${message} \x1b[0m`
  },
  green(message: string) {
    return `\x1b[32m ${message} \x1b[0m`
  },
  yellow(message: string) {
    return `\x1b[33m ${message} \x1b[0m`
  },
  blue(message: string) {
    return `\x1b[34m ${message} \x1b[0m`
  },
  magenta(message: string) {
    return `\x1b[35m ${message} \x1b[0m`
  },
  cyan(message: string) {
    return `\x1b[36m ${message} \x1b[0m`
  }
}
export const logger: Logger = {
  debug: (message, meta) => {
    if (process.env.NODE_ENV === "production") return; // opcional: mutar debug em prod
    // eslint-disable-next-line no-console
    console.debug(addColorConsole.cyan(JSON.stringify(formatLog("debug", message, meta))));
  },
  info: (message, meta) => {
    // eslint-disable-next-line no-console
    console.info(addColorConsole.blue(JSON.stringify(formatLog("info", message, meta))));
  },
  warn: (message, meta) => {
    // eslint-disable-next-line no-console
    console.warn(addColorConsole.yellow(JSON.stringify(formatLog("warn", message, meta))));
  },
  error: (message, meta) => {
    // eslint-disable-next-line no-console
    console.error(addColorConsole.red(JSON.stringify(formatLog("error", message, meta))));
  },
  database: (message, meta) => {
    if (process.env.NODE_ENV === "production") return; // opcional: mutar debug em prod
    // eslint-disable-next-line no-console
    console.debug(addColorConsole.magenta(JSON.stringify(formatLog("debug", message, meta))));
  },
};