import type { IncomingHttpHeaders } from "http";

export interface HttpResponse<T = any> {
  statusCode: number;
  body: T;
}

/**
 * Cabeçalhos expostos de forma controlada no `HttpRequest` (sem credenciais em claro).
 * Ver `pickSafeHeaders` e `docs/web-core-contract.md` no repositório **project-factory** (não copiado para o app gerado).
 */
export interface SafeHeaders {
  accept?: string;
  "content-type"?: string;
  "user-agent"?: string;
  "x-request-id"?: string;
  /**
   * Só presente quando o pedido incluiu `Authorization`. Valor **sempre** mascarado
   * (`Bearer <redacted>` ou `<redacted>`); nunca o segredo em claro.
   */
  authorization?: string;
}

export interface HttpRequest {
  body?: any;
  params?: any;
  query?: any;
  /** Query validado por `validateQuery` (Zod); preferir na controller quando disponível. */
  validatedQuery?: unknown;
  /**
   * Subconjunto seguro para leitura em controllers, logs e métricas.
   * Preenchido pelo `express-route-adapter`; preferir a `headers` cru.
   */
  safeHeaders?: SafeHeaders;
  /**
   * Cabeçalhos HTTP crus (`IncomingHttpHeaders` do Node / Express).
   * @deprecated Preferir `safeHeaders` para leitura. Reservar `headers` para integrações
   * que precisem do valor exacto (ex.: cópia pontual para downstream); **não** logar este objecto completo.
   */
  headers?: IncomingHttpHeaders;
  pathParams?: any;
  user?: any;
  correlationId?: string;
}