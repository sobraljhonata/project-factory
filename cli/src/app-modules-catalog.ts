/**
 * Módulos opcionais de aplicação (V3): cópia após o stack `api-node-express`, sem alterar o baseline.
 * Cada entrada aponta para `templates/<dir>/` com `module.json` { id, version } e ficheiros sob `src/` (etc.).
 */
export type ApplicationModuleId = "swagger-rich" | "observability-basic" | "auth-jwt";

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
    label: "Gancho mínimo para métricas / tracing (placeholder documentado)",
  },
  "auth-jwt": {
    dir: "application-modules/auth-jwt",
    label: "Verificação Bearer JWT (HS256) emitida por sistema externo — verify-only",
  },
};
