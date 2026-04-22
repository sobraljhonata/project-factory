import { Request, Response, NextFunction } from "express";

/**
 * Cabeçalhos de segurança "essenciais" sem libs externas.
 * Se preferir, pode trocar depois por `helmet` e remover isto.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Oculta tecnologia
  res.removeHeader?.("X-Powered-By");

  // Evita MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Referrer Policy conservadora
  res.setHeader("Referrer-Policy", "no-referrer");

  // HSTS apenas em produção (requer HTTPS)
  if (process.env.NODE_ENV === "production") {
    // 6 meses
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  next();
}