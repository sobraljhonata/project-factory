import { NextFunction, Request, Response } from "express";

const parseOrigins = (raw?: string): string[] =>
  (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const ALLOWED_ORIGINS = parseOrigins(process.env.CORS_ORIGINS); // ex: "https://app.com,https://admin.app.com"
const ALLOW_CREDENTIALS = (process.env.CORS_CREDENTIALS ?? "false").toLowerCase() === "true";

function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true; // non-CORS ou clientes sem Origin (curl, mobile nativo)
  if (ALLOWED_ORIGINS.length === 0) {
    // Em produção, lista vazia não pode equivaler a "qualquer origem"
    return process.env.NODE_ENV !== "production";
  }
  return ALLOWED_ORIGINS.includes(origin);
}

export default function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;

  if (isOriginAllowed(origin)) {
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else {
      // para requisições sem cabeçalho Origin
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    if (ALLOW_CREDENTIALS) res.setHeader("Access-Control-Allow-Credentials", "true");
    // cache de preflight por 24h
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  // Responde preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
}