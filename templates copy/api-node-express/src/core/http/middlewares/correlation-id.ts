import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

const CORRELATION_HEADER = "x-correlation-id";

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const headerValue = req.header(CORRELATION_HEADER);
  const correlationId =
    headerValue && headerValue.trim().length > 0
      ? headerValue.trim()
      : randomUUID();

  // pendura no request para uso interno
  (req as any).correlationId = correlationId;

  // expõe no response também
  res.setHeader(CORRELATION_HEADER, correlationId);

  next();
}