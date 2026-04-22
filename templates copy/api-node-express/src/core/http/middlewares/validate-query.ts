import { ensureCorrelationId } from "@/core/http/correlation";
import { NextFunction, Request, Response } from "express";
import { ZodError, ZodObject, ZodRawShape } from "zod";

type RequestWithValidatedQuery<T> = Request & {
  validatedQuery?: T;
};

export type ValidatedQueryRequest<TQuery> = Request & {
  validatedQuery: TQuery;
};

export const validateQuery =
  <T extends ZodRawShape>(schema: ZodObject<T>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsedQuery = schema.parse(req.query);

      (
        req as RequestWithValidatedQuery<Record<string, unknown>>
      ).validatedQuery = parsedQuery;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const correlationId = ensureCorrelationId(
          (req as { correlationId?: string }).correlationId,
        );
        res.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "Invalid query params",
            details: {
              errors: error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
          },
          meta: { correlationId },
        });

        return;
      }

      next(error);
    }
  };
