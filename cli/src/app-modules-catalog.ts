/**
 * Módulos opcionais de aplicação (V3): cópia após o stack `api-node-express`, sem alterar o baseline.
 * Cada entrada aponta para `templates/<dir>/` com `module.json` { id, version } e ficheiros sob `src/` (etc.).
 */
export type ApplicationModuleId =
  | "swagger-rich"
  | "observability-basic"
  | "auth-jwt"
  | "rate-limit-basic";

export const APPLICATION_MODULES: Record<
  ApplicationModuleId,
  { dir: string; label: string }
> = {
  "swagger-rich": {
    dir: "application-modules/swagger-rich",
    label: "Documentação OpenAPI enriquecida (extensão opcional ao stack base)",
  },
  "observability-basic": {
    dir: "application-modules/observability-basic",
    label: "Access log HTTP estruturado (duração, correlation id)",
  },
  "auth-jwt": {
    dir: "application-modules/auth-jwt",
    label: "Verificação Bearer JWT (HS256) emitida por sistema externo — verify-only",
  },
  "rate-limit-basic": {
    dir: "application-modules/rate-limit-basic",
    label: "Rate limit in-process por IP (janela fixa, sem Redis)",
  },
};
