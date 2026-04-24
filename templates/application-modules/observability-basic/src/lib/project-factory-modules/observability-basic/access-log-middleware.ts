/**
 * Módulo opcional project-factory (`observability-basic`): access log HTTP estruturado.
 * Não regista body, headers nem query string.
 */
import type { Express, NextFunction, Request, Response } from "express";
import { logger } from "@/core/config/logger";

const MAX_ACCESS_LOG_PATH_LENGTH = 512;

function isBypassAccessLogPath(p: string): boolean {
  if (p === "/health" || p === "/ready" || p === "/ping") {
    return true;
  }
  if (/\/ping$/i.test(p)) {
    return true;
  }
  return false;
}

function readCorrelationId(req: Request): string {
  const id = (req as Request & { correlationId?: string }).correlationId;
  return typeof id === "string" && id.length > 0 ? id : "";
}

/** Trunca só o valor logado; a decisão de bypass usa sempre `req.path` completo. */
function truncateAccessLogPath(full: string): { path: string; pathTruncated: boolean } {
  if (full.length <= MAX_ACCESS_LOG_PATH_LENGTH) {
    return { path: full, pathTruncated: false };
  }
  return { path: full.slice(0, MAX_ACCESS_LOG_PATH_LENGTH), pathTruncated: true };
}

export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedNs = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedNs = process.hrtime.bigint() - startedNs;
    const durationMs = Math.max(0, Math.round(Number(elapsedNs) / 1_000_000));

    const rawPath = req.path;
    const { path: loggedPath, pathTruncated } = truncateAccessLogPath(rawPath);
    const meta: Record<string, unknown> = {
      event: "http_access",
      method: req.method,
      path: loggedPath,
      statusCode: res.statusCode,
      durationMs,
      correlationId: readCorrelationId(req),
    };
    if (pathTruncated) {
      meta.pathTruncated = true;
    }

    if (isBypassAccessLogPath(rawPath)) {
      logger.debug("http_access", meta);
    } else {
      logger.info("http_access", meta);
    }
  });

  next();
}

export function registerHttpAccessLog(app: Express): void {
  app.use(httpAccessLogMiddleware);
}
