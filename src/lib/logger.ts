import pino from "pino";
import type { Env } from "../config/env.js";

export function createLogger(env: Env): pino.Logger {
  const isDev = process.env.NODE_ENV !== "production";

  return pino({
    level: env.LOG_LEVEL,
    transport: isDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  });
}

export type Logger = pino.Logger;
