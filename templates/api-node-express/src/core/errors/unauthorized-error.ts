import { UnauthorizedError } from "./contract-errors";

/**
 * @deprecated Preferir `UnauthorizedError` em `@/core/errors` ou `contract-errors.ts`.
 * Mantém o nome de classe e a mensagem por defeito do template antigo; continua a ser
 * tratada como `AppError` (401 `UNAUTHORIZED`) em `mapErrorToHttpResponse`.
 */
export class unAuthorizedError extends UnauthorizedError {
  constructor(message = "Verifique os dados de login.") {
    super(message);
    this.name = "unAuthorizedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
