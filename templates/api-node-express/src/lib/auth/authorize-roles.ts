/**
 * Autorização por papel — opcional; usar junto de `authMiddleware`.
 */
import { logger } from "@/core/config/logger";
import { ensureCorrelationId } from "@/core/http/correlation";
import { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "./auth-middleware";

export default function authorizeRoles(roles: string[]) {
  const allowed = new Set(roles.map((r) => r.toLowerCase()));

  return (req: Request, res: Response, next: NextFunction) => {
    const { user } = req as AuthenticatedRequest;
    const role = (user?.role ?? "").toLowerCase();

    if (!role || !allowed.has(role)) {
      logger.warn("Access denied by role middleware", {
        path: req.path,
        method: req.method,
        userId: user?.id,
        role: user?.role,
        requiredRoles: [...allowed],
      });

      const correlationId = ensureCorrelationId(
        (req as { correlationId?: string }).correlationId,
      );
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Acesso negado",
        },
        links: [
          { rel: "self", href: req.path, method: req.method },
          { rel: "login", href: "/api/auth/login", method: "POST" },
        ],
        meta: { correlationId },
      });
    }

    return next();
  };
}
