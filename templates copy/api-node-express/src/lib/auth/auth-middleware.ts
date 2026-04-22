/**
 * Middleware JWT Bearer — opcional. Não é aplicado por padrão no `createApp`.
 * Use em rotas de `src/modules/...` quando precisar: `app.use('/api/...', authMiddleware)`.
 */
import { ENV } from "@/core/config/env";
import { logger } from "@/core/config/logger";
import { ensureCorrelationId } from "@/core/http/correlation";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export type AppJwtPayload = JwtPayload & {
  sub: string;
  email?: string;
  role?: string;
};

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export default function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization ?? "";
    const [scheme = "", token] = authHeader.split(" ");

    if (!token || !/^Bearer$/i.test(scheme)) {
      logger.warn("Missing or invalid Authorization header", {
        path: req.path,
        method: req.method,
      });

      const correlationId = ensureCorrelationId(
        (req as { correlationId?: string }).correlationId,
      );
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Credenciais ausentes ou inválidas",
        },
        links: [{ rel: "login", href: "/api/auth/login", method: "POST" }],
        meta: { correlationId },
      });
    }

    const secret = ENV.JWT_ACCESS_SECRET;
    if (!secret) {
      logger.error("JWT_ACCESS_SECRET is not configured");
      const correlationId = ensureCorrelationId(
        (req as { correlationId?: string }).correlationId,
      );
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Configuração de autenticação inválida",
        },
        meta: { correlationId },
      });
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as AppJwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };

    return next();
  } catch (err) {
    logger.warn("JWT verification failed", {
      path: req.path,
      method: req.method,
      error:
        err instanceof Error ? { message: err.message, name: err.name } : err,
    });

    const correlationId = ensureCorrelationId(
      (req as { correlationId?: string }).correlationId,
    );
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Credenciais ausentes ou inválidas",
      },
      links: [{ rel: "login", href: "/api/auth/login", method: "POST" }],
      meta: { correlationId },
    });
  }
}
