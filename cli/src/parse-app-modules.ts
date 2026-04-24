import {
  APPLICATION_MODULES,
  type ApplicationModuleId,
} from "./app-modules-catalog";

/**
 * Parseia `--module swagger-rich,observability-basic,auth-jwt` (vírgulas, duplicatas removidas).
 */
export function parseApplicationModulesArg(
  raw: string | undefined,
): ApplicationModuleId[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  const allowed = new Set(
    Object.keys(APPLICATION_MODULES) as ApplicationModuleId[],
  );
  const out: ApplicationModuleId[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "") {
      continue;
    }
    const k = trimmed as ApplicationModuleId;
    if (!allowed.has(k)) {
      throw new Error(
        `Módulo de aplicação inválido: "${part}". Use: ${[...allowed].join(", ")}`,
      );
    }
    if (!out.includes(k)) {
      out.push(k);
    }
  }
  return out;
}
