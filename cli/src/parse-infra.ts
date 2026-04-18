import type { InfraLayerId } from "./generate";
import { INFRA_LAYERS } from "./generate";

/**
 * Parseia `--infra foundation,s3` (vírgulas, espaços ignorados, duplicatas removidas).
 */
export function parseInfraArg(raw: string | undefined): InfraLayerId[] {
  if (!raw || raw.trim() === "") {
    return [];
  }
  const allowed = new Set(Object.keys(INFRA_LAYERS) as InfraLayerId[]);
  const out: InfraLayerId[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (trimmed === "") {
      continue;
    }
    const k = trimmed as InfraLayerId;
    if (!allowed.has(k)) {
      throw new Error(
        `Infra inválida: "${part}". Use: ${[...allowed].join(", ")}`,
      );
    }
    if (!out.includes(k)) {
      out.push(k);
    }
  }
  return out;
}
