/**
 * Helpers HTTP **legacy** para devolver `HttpResponse` com envelope de erro único
 * (`{ error, meta }`), alinhado a [docs/web-core-contract.md](../../../../docs/web-core-contract.md)
 * no repositório project-factory (V3.5.1).
 *
 * **Preferido:** `throw new UnauthorizedError(...)` (e outras subclasses de `AppError`) para o
 * `express-route-adapter` / `mapErrorToHttpResponse` tratarem o pedido.
 *
 * Quando usares estas funções a partir de um controller, passa `correlationId` do `HttpRequest`
 * em segundo argumento para manter `meta` coerente com o header do pedido.
 */
import { errorResponse } from "@/core/http/http-error-response";
import { HttpResponse } from "@/core/protocols";

export const serverError = (
  _error?: Error | unknown,
  correlationId?: string,
): HttpResponse =>
  errorResponse(
    500,
    "INTERNAL_SERVER_ERROR",
    "Ocorreu um erro inesperado. Tente novamente mais tarde.",
    correlationId,
  );

export const badRequest = (error: Error, correlationId?: string): HttpResponse =>
  errorResponse(400, "BAD_REQUEST", error.message, correlationId, {
    name: error.name,
  });

export const badRequestResource = (resource: unknown, correlationId?: string): HttpResponse =>
  errorResponse(400, "BAD_REQUEST", "Pedido inválido.", correlationId, resource);

export const unAuthorized = (data?: unknown, correlationId?: string): HttpResponse => {
  const message =
    typeof data === "string" && data.trim().length > 0 ? data : "Não autorizado.";
  return errorResponse(401, "UNAUTHORIZED", message, correlationId, data);
};

export const unauthorizedResource = (resource: unknown, correlationId?: string): HttpResponse =>
  errorResponse(401, "UNAUTHORIZED", "Não autorizado.", correlationId, resource);

export const forbidden = (data?: unknown, correlationId?: string): HttpResponse => {
  const message =
    typeof data === "string" && data.trim().length > 0 ? data : "Proibido.";
  return errorResponse(403, "FORBIDDEN", message, correlationId, data);
};

export const notFound = (data: unknown, correlationId?: string): HttpResponse => {
  const message =
    typeof data === "string" && data.trim().length > 0
      ? data
      : "Recurso não encontrado.";
  return errorResponse(404, "NOT_FOUND", message, correlationId, data);
};
