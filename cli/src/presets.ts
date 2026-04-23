import type { InfraLayerId } from "./generate";
import { parseInfraArg } from "./parse-infra";

export const PRESET_IDS = [
  "minimal",
  "aws-standard",
  "internal-enterprise",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const PRESETS: Record<
  PresetId,
  { infra: readonly InfraLayerId[]; description: string }
> = {
  minimal: {
    infra: [],
    description: "Somente API Node/Express; sem camadas Terraform.",
  },
  "aws-standard": {
    infra: ["foundation", "terraformRemoteState"],
    description:
      "Foundation (VPC/ECS/…) + remote state (S3 + DynamoDB lock, template mínimo).",
  },
  "internal-enterprise": {
    infra: ["foundation", "aurora", "s3", "terraformRemoteState"],
    description:
      "Todas as camadas do catálogo: foundation, aurora, s3 + remote state (S3 + lock).",
  },
};

export function isPresetId(value: string): value is PresetId {
  return (PRESET_IDS as readonly string[]).includes(value.trim());
}

/**
 * Valida o id do preset e falha cedo se for desconhecido.
 */
export function resolvePresetId(raw: string): PresetId {
  const id = raw.trim();
  if (!isPresetId(id)) {
    throw new Error(
      `Preset desconhecido: "${raw}". Use: ${PRESET_IDS.join(", ")}`,
    );
  }
  return id;
}

const PRESET_REQUIRES_YES_MSG =
  "Nesta versão, `--preset` exige `--yes` (modo não interativo). " +
  "Ex.: `project-factory create minha-api --yes --preset aws-standard`. " +
  "Presets definem infra padrão; no modo interativo use `--infra` ou o checkbox sem preset.";

export function assertPresetRequiresYes(
  presetRaw: string | undefined,
  yes: boolean,
): void {
  if (presetRaw?.trim() && !yes) {
    throw new Error(PRESET_REQUIRES_YES_MSG);
  }
}

export type ResolveCreateInfraArgs = {
  presetRaw: string | undefined;
  yes: boolean;
  /** Valor da opção `--infra` após parse (pode ser `undefined`). */
  infraRaw: string | undefined;
  /** `true` se o usuário passou `--infra` na linha de comando (valor pode ser lista vazia). */
  infraFromCli: boolean;
};

/**
 * Define a lista de camadas Terraform para o fluxo não interativo (`--yes`).
 * Regras: `--infra` explícito vence; com `--preset` é obrigatório `--yes` (MVP).
 */
export function resolveCreateInfra(args: ResolveCreateInfraArgs): InfraLayerId[] {
  const presetTrimmed = args.presetRaw?.trim() ?? "";
  const hasPreset = presetTrimmed.length > 0;

  assertPresetRequiresYes(args.presetRaw, args.yes);

  if (args.infraFromCli) {
    return parseInfraArg(args.infraRaw);
  }

  if (hasPreset) {
    const id = resolvePresetId(presetTrimmed);
    return [...PRESETS[id].infra];
  }

  return parseInfraArg(args.infraRaw);
}
