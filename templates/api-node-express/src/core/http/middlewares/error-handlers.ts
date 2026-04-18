import { Express, NextFunction, Request, Response } from "express";
import { AppError } from "@/core/errors-app-error";
import { logger } from "@/core/config/logger";
import { ensureCorrelationId } from "@/core/http/correlation";
import { mapErrorToHttpResponse } from "@/core/http/http-error-response";

function notFoundHandler(req: Request, res: Response) {
  const correlationId = ensureCorrelationId((req as { correlationId?: string }).correlationId);
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Rota não encontrada",
    },
    meta: { correlationId },
  });
}

function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const correlationId = ensureCorrelationId((req as { correlationId?: string }).correlationId);

  if (err instanceof AppError) {
    const httpResponse = mapErrorToHttpResponse(err, correlationId);
    return res.status(httpResponse.statusCode).json(httpResponse.body);
  }

  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    correlationId,
    error:
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err,
  });

  const httpResponse = mapErrorToHttpResponse(err, correlationId);
  return res.status(httpResponse.statusCode).json(httpResponse.body);
}

export default function setupErrorHandlers(app: Express) {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
