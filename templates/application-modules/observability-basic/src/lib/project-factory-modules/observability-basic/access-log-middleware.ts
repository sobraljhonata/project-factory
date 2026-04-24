/**
 * Módulo opcional project-factory (`observability-basic`): access log HTTP estruturado.
 * Não regista body, headers nem query string.
 */
import type { Express, NextFunction, Request, Response } from "express";
import { logger } from "@/core/config/logger";

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

export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const started = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - started;
    const path = req.path;
    const meta: Record<string, unknown> = {
      event: "http_access",
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      correlationId: readCorrelationId(req),
    };

    if (isBypassAccessLogPath(path)) {
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
