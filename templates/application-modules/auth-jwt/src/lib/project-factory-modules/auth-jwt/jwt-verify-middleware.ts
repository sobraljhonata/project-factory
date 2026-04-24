/**
 * Módulo opcional project-factory (`auth-jwt`): verificação Bearer JWT (HS256).
 * Tokens são emitidos por sistema externo — sem login, refresh ou armazenamento de utilizadores.
 */
import type { Express, NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload, type VerifyOptions } from "jsonwebtoken";
import type { ENV } from "@/core/config/env";
import { ensureCorrelationId } from "@/core/http/correlation";

const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ["HS256"];

type AuthJwtEnvPick = Pick<typeof ENV, "JWT_SECRET" | "JWT_ISSUER" | "JWT_AUDIENCE">;

function isPublicJwtBypass(req: Request): boolean {
  const p = req.path;
  if (p === "/health" || p === "/ready") {
    return true;
  }
  if (req.method === "GET" && /\/ping$/i.test(p)) {
    return true;
  }
  return false;
}

export function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const parts = authorization.trim().split(/\s+/);
  if (parts.length !== 2) {
    return null;
  }
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme ?? "") || !token) {
    return null;
  }
  return token;
}

export function verifyBearerJwt(
  token: string,
  config: { secret: string; issuer?: string; audience?: string },
): JwtPayload {
  const opts: VerifyOptions = {
    algorithms: ALLOWED_ALGORITHMS,
  };
  if (config.issuer) {
    opts.issuer = config.issuer;
  }
  if (config.audience) {
    opts.audience = config.audience;
  }
  const decoded = jwt.verify(token, config.secret, opts);
  if (typeof decoded === "string") {
    throw new jwt.JsonWebTokenError("payload inesperado em string");
  }
  return decoded;
}

function sendUnauthorized(res: Response, req: Request, message: string): void {
  const correlationId = ensureCorrelationId(
    (req as { correlationId?: string }).correlationId,
  );
  res.status(401).json({
    error: { code: "UNAUTHORIZED", message },
    meta: { correlationId },
  });
}

function bearerJwtVerifyMiddleware(env: AuthJwtEnvPick) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isPublicJwtBypass(req)) {
      next();
      return;
    }

    const raw = extractBearerToken(req.headers.authorization);
    if (!raw) {
      sendUnauthorized(res, req, "Token Bearer ausente ou inválido");
      return;
    }

    try {
      const payload = verifyBearerJwt(raw, {
        secret: env.JWT_SECRET,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      });
      req.auth = { payload };
      next();
    } catch {
      sendUnauthorized(res, req, "Token inválido ou expirado");
    }
  };
}

/** Regista middleware global de verificação JWT (chamado só se o módulo estiver presente no projeto). */
export function registerBearerJwtVerify(app: Express, env: AuthJwtEnvPick): void {
  app.use(bearerJwtVerifyMiddleware(env));
}
