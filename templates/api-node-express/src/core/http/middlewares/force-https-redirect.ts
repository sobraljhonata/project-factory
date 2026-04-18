import { ENV } from "@/core/config/env";
import { NextFunction, Request, Response } from "express";

/**
 * Reforço atrás do ALB: se o cliente chegou com HTTP (X-Forwarded-Proto: http),
 * redireciona 301 para HTTPS. O listener 80 do ALB já deve redirecionar quando há ACM;
 * isso cobre desvios e mantém política explícita na app.
 * Health checks do ALB costumam não enviar X-Forwarded-Proto — não redireciona.
 */
export function forceHttpsRedirect(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!ENV.FORCE_HTTPS_REDIRECT) {
    next();
    return;
  }

  const pathname = req.path || "/";
  if (pathname === "/health" || pathname === "/ready") {
    next();
    return;
  }

  const raw = req.get("x-forwarded-proto");
  if (!raw) {
    next();
    return;
  }

  const proto = raw.split(",")[0]?.trim().toLowerCase();
  if (proto !== "http") {
    next();
    return;
  }

  const host = req.get("host");
  if (!host) {
    next();
    return;
  }

  const pathAndQuery = req.originalUrl || req.url;
  res.redirect(301, `https://${host}${pathAndQuery}`);
}
