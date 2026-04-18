import { ensureCorrelationId } from "@/core/http/correlation";
import { NextFunction, Request, Response } from "express";
import { ZodError, ZodObject } from "zod";

export const validateBody =
  (schema: ZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const correlationId = ensureCorrelationId(
          (req as { correlationId?: string }).correlationId,
        );
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation error",
            details: {
              errors: error.issues.map((err) => ({
                path: err.path.join("."),
                message: err.message,
              })),
            },
          },
          meta: { correlationId },
        });
      }
      next(error); // Pass other errors to the next error handler
    }
  };