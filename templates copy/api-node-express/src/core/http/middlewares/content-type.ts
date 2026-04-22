import { NextFunction, Request, Response } from "express";

/**
 * Define "application/json" como padrão APENAS quando:
 * - ainda não há Content-Type definido, e
 * - o cliente aceita JSON (Accept contém application/json)
 * Evita quebrar downloads (CSV, PDF, imagens etc.).
 */
export default function contentType(req: Request, res: Response, next: NextFunction) {
  const alreadySet = res.getHeader("Content-Type");
  if (!alreadySet) {
    const accept = (req.headers["accept"] || "").toString().toLowerCase();
    if (accept.includes("application/json") || accept.includes("*/*")) {
      res.type("application/json");
    }
  }
  return next();
}