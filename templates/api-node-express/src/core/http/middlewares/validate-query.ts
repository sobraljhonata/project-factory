import { ensureCorrelationId } from "@/core/http/correlation";
import { NextFunction, Request, Response } from "express";
import { ZodError, ZodObject } from "zod";

type RequestWithValidatedQuery<T> = Request & {
  validatedQuery?: T;
};

export type ValidatedQueryRequest<TQuery> = Request & {
  validatedQuery: TQuery;
};

/**
 * Valida `req.query` com um schema **Zod** (tipicamente `z.object` ou `z.strictObject`) e
 * grava o resultado em `req.validatedQuery`.
 *
 * **Strict (rejeitar chaves desconhecidas) — opt-in por rota:** o middleware **não** aplica
 * strict globalmente. Usa `z.strictObject({ ... })` ou `z.object({ ... }).strict()` **no schema
 * dessa rota** quando quiseres falhar se o cliente enviar query params extra. Rotas sem strict
 * continuam a ignorar chaves não declaradas (comportamento por defeito do `z.object`).
 *
 * **Filtros permitidos:** apenas as chaves definidas no schema são validadas e expostas em
 * `validatedQuery`; combina `paginationQuerySchema`, `sortQuerySchema` e campos próprios com
 * `.merge()` / `.extend()` conforme necessário.
 *
 * **Erro:** query inválida → **400** JSON com `code: "INVALID_QUERY"` e `details.errors`
 * (issues Zod), mais `meta.correlationId`, no mesmo envelope que `docs/web-core-contract.md`
 * no repositório **project-factory** (não copiado para o app gerado).
 */
export const validateQuery =
  (schema: ZodObject) =>
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
