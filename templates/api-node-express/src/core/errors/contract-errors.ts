import { AppError } from "@/core/errors-app-error";

/** 401 — credenciais em falta ou inválidas (alinhado ao envelope do stack e ao módulo `auth-jwt`). */
export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado.", details?: unknown) {
    super({ code: "UNAUTHORIZED", message, statusCode: 401, details });
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 403 — autenticado sem permissão para o recurso. */
export class ForbiddenError extends AppError {
  constructor(message = "Proibido.", details?: unknown) {
    super({ code: "FORBIDDEN", message, statusCode: 403, details });
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 404 — recurso de domínio inexistente (não confundir com `ROUTE_NOT_FOUND` do handler global). */
export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado.", details?: unknown) {
    super({ code: "NOT_FOUND", message, statusCode: 404, details });
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 409 — conflito de estado (ex.: duplicado, versão obsoleta). */
export class ConflictError extends AppError {
  constructor(message = "Conflito.", details?: unknown) {
    super({ code: "CONFLICT", message, statusCode: 409, details });
    this.name = "ConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — validação de domínio ou regras de entrada (alinhado ao código `VALIDATION_ERROR` do `validateBody`). */
export class ValidationError extends AppError {
  constructor(message = "Erro de validação.", details?: unknown) {
    super({ code: "VALIDATION_ERROR", message, statusCode: 400, details });
    this.name = "ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
