// src/config/logger.ts
// export type LogLevel = "debug" | "info" | "warn" | "error";

// export interface Logger {
//   debug: (message: string, meta?: Record<string, unknown>) => void;
//   info: (message: string, meta?: Record<string, unknown>) => void;
//   warn: (message: string, meta?: Record<string, unknown>) => void;
//   error: (message: string, meta?: Record<string, unknown>) => void;
// }

// const formatLog = (
//   level: LogLevel,
//   message: string,
//   meta?: Record<string, unknown>
// ) => {
//   const base = {
//     level,
//     message,
//     timestamp: new Date().toISOString(),
//     env: process.env.NODE_ENV,
//   };

//   return meta ? { ...base, ...meta } : base;
// };

// export const logger: Logger = {
//   debug: (message, meta) => {
//     if (process.env.NODE_ENV === "production") return; // opcional: mutar debug em prod
//     // eslint-disable-next-line no-console
//     console.debug(JSON.stringify(formatLog("debug", message, meta)));
//   },
//   info: (message, meta) => {
//     // eslint-disable-next-line no-console
//     console.info(JSON.stringify(formatLog("info", message, meta)));
//   },
//   warn: (message, meta) => {
//     // eslint-disable-next-line no-console
//     console.warn(JSON.stringify(formatLog("warn", message, meta)));
//   },
//   error: (message, meta) => {
//     // eslint-disable-next-line no-console
//     console.error(JSON.stringify(formatLog("error", message, meta)));
//   },
// };