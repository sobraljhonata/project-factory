import fs from "node:fs";
import path from "node:path";

import { Command, CommanderError } from "commander";

import {
  getTemplatesRoot,
  INFRA_LAYERS,
  readTemplateManifest,
  type InfraLayerId,
} from "./generate";
import { writeCliParseErrorJson } from "./json-cli";

const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export type VersionCompare = "behind" | "equal" | "ahead";

export type BehindBump = "major" | "minor" | "patch";

export type ComponentDrift = {
  label: string;
  projectVersion: string;
  factoryVersion: string;
  compare: VersionCompare;
  /** Preenchido quando `compare === "behind"`: qual parte do semver ficou atrás do factory. */
  behindBump?: BehindBump;
};

export type UpgradeDryRunReport = {
  projectRoot: string;
  templatesRoot: string;
  errors: string[];
  components: ComponentDrift[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseSemverTriplet(v: string, context: string): [number, number, number] {
  const t = v.trim();
  if (!SEMVER_RE.test(t)) {
    throw new Error(`${context}: versão "${v}" não é semver MAJOR.MINOR.PATCH.`);
  }
  const [a, b, c] = t.split(".").map((x) => Number(x));
  if ([a, b, c].some((n) => !Number.isFinite(n))) {
    throw new Error(`${context}: versão "${v}" inválida.`);
  }
  return [a, b, c];
}

export function compareSemver(projectVersion: string, factoryVersion: string): VersionCompare {
  const [p1, p2, p3] = parseSemverTriplet(projectVersion, "projeto");
  const [f1, f2, f3] = parseSemverTriplet(factoryVersion, "factory");
  if (p1 !== f1) {
    return p1 < f1 ? "behind" : "ahead";
  }
  if (p2 !== f2) {
    return p2 < f2 ? "behind" : "ahead";
  }
  if (p3 !== f3) {
    return p3 < f3 ? "behind" : "ahead";
  }
  return "equal";
}

/**
 * Quando o projeto está atrás do factory (`compareSemver` → `behind`), indica se a defasagem é em MAJOR, MINOR ou PATCH.
 */
export function computeBehindBump(
  projectVersion: string,
  factoryVersion: string,
): BehindBump {
  const [pM, pm, pp] = parseSemverTriplet(projectVersion, "projeto");
  const [fM, fm, fp] = parseSemverTriplet(factoryVersion, "factory");
  if (fM > pM) {
    return "major";
  }
  if (fm > pm) {
    return "minor";
  }
  return "patch";
}

/** Heurística de risco para comunicação (não substitui revisão humana). */
export function riskForBehindBump(bump: BehindBump): "HIGH" | "LOW" {
  return bump === "major" ? "HIGH" : "LOW";
}

/**
 * Localiza o diretório do stack em `templates/` pelo `id` do manifest (exclui `infra/` da varredura inicial).
 */
export function findStackTemplateDir(
  templatesRoot: string,
  templateId: string,
): string | null {
  const direct = path.join(templatesRoot, templateId);
  const directManifest = path.join(direct, "template.json");
  if (fs.existsSync(directManifest)) {
    try {
      const m = readTemplateManifest(direct);
      if (m.id === templateId) {
        return direct;
      }
    } catch {
      /* continua */
    }
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(templatesRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name === "infra") {
      continue;
    }
    const dir = path.join(templatesRoot, ent.name);
    const manifestPath = path.join(dir, "template.json");
    if (!fs.existsSync(manifestPath)) {
      continue;
    }
    try {
      const m = readTemplateManifest(dir);
      if (m.id === templateId) {
        return dir;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function resolveInfraLayerDir(
  templatesRoot: string,
  infraId: string,
): string | null {
  const layer = INFRA_LAYERS[infraId as InfraLayerId];
  if (!layer) {
    return null;
  }
  const dir = path.join(templatesRoot, layer.dir);
  return fs.existsSync(path.join(dir, "template.json")) ? dir : null;
}

function readProjectMetadata(projectRoot: string): {
  ok: true;
  data: {
    template: string;
    templateVersion: string;
    infraTemplates: { id: string; version: string }[];
  };
} | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const metaPath = path.join(projectRoot, ".project-factory.json");
  if (!fs.existsSync(metaPath)) {
    return { ok: false, errors: [`.project-factory.json ausente em ${projectRoot}`] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return { ok: false, errors: [".project-factory.json não é JSON válido."] };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, errors: [".project-factory.json deve ser um objeto."] };
  }
  const o = parsed as Record<string, unknown>;
  if (!isNonEmptyString(o.template)) {
    errors.push('Campo "template" ausente ou inválido em .project-factory.json.');
  }
  if (!isNonEmptyString(o.templateVersion) || !SEMVER_RE.test(o.templateVersion.trim())) {
    errors.push(
      'Campo "templateVersion" ausente ou não semver MAJOR.MINOR.PATCH em .project-factory.json.',
    );
  }
  if (!Array.isArray(o.infraTemplates)) {
    errors.push('Campo "infraTemplates" deve ser um array em .project-factory.json.');
  } else {
    for (let i = 0; i < o.infraTemplates.length; i++) {
      const item = o.infraTemplates[i];
      if (
        item === null ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        !isNonEmptyString((item as Record<string, unknown>).id) ||
        !isNonEmptyString((item as Record<string, unknown>).version)
      ) {
        errors.push(`infraTemplates[${i}] inválido (esperado { id, version }).`);
        break;
      }
      const ver = String((item as Record<string, unknown>).version).trim();
      if (!SEMVER_RE.test(ver)) {
        errors.push(`infraTemplates[${i}].version deve ser semver MAJOR.MINOR.PATCH.`);
        break;
      }
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const infraTemplates = (o.infraTemplates as { id: string; version: string }[]).map(
    (x) => ({
      id: String(x.id).trim(),
      version: String(x.version).trim(),
    }),
  );

  return {
    ok: true,
    data: {
      template: String(o.template).trim(),
      templateVersion: String(o.templateVersion).trim(),
      infraTemplates,
    },
  };
}

/**
 * Compara versões do projeto gerado com os `template.json` atuais sob `templatesRoot`.
 */
export function analyzeUpgradeDryRun(
  projectRoot: string,
  templatesRoot: string,
): UpgradeDryRunReport {
  const absProject = path.resolve(projectRoot);
  const absTemplates = path.resolve(templatesRoot);
  const errors: string[] = [];
  const components: ComponentDrift[] = [];

  if (!fs.existsSync(absTemplates) || !fs.statSync(absTemplates).isDirectory()) {
    return {
      projectRoot: absProject,
      templatesRoot: absTemplates,
      errors: [`Pasta de templates do factory inexistente ou inválida: ${absTemplates}`],
      components: [],
    };
  }

  if (!fs.existsSync(absProject) || !fs.statSync(absProject).isDirectory()) {
    return {
      projectRoot: absProject,
      templatesRoot: absTemplates,
      errors: [`Diretório do projeto inválido ou inexistente: ${absProject}`],
      components: [],
    };
  }

  const meta = readProjectMetadata(absProject);
  if (!meta.ok) {
    return {
      projectRoot: absProject,
      templatesRoot: absTemplates,
      errors: meta.errors,
      components: [],
    };
  }

  const stackDir = findStackTemplateDir(absTemplates, meta.data.template);
  if (stackDir === null) {
    errors.push(
      `Stack "${meta.data.template}" não encontrado em ${absTemplates} (nenhum template.json com esse id).`,
    );
  } else {
    try {
      const factoryManifest = readTemplateManifest(stackDir, meta.data.template);
      const cmp = compareSemver(meta.data.templateVersion, factoryManifest.version);
      const behindBump =
        cmp === "behind"
          ? computeBehindBump(meta.data.templateVersion, factoryManifest.version)
          : undefined;
      components.push({
        label: `stack:${factoryManifest.id}`,
        projectVersion: meta.data.templateVersion,
        factoryVersion: factoryManifest.version,
        compare: cmp,
        behindBump,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Falha ao ler manifest do stack "${meta.data.template}": ${msg}`);
    }
  }

  for (const layer of meta.data.infraTemplates) {
    const infraDir = resolveInfraLayerDir(absTemplates, layer.id);
    if (infraDir === null) {
      errors.push(
        `Camada infra "${layer.id}" não reconhecida ou sem template.json em templates/ (ids suportados: ${Object.keys(INFRA_LAYERS).join(", ")}).`,
      );
      continue;
    }
    try {
      const factoryManifest = readTemplateManifest(infraDir, layer.id);
      const cmp = compareSemver(layer.version, factoryManifest.version);
      const behindBump =
        cmp === "behind"
          ? computeBehindBump(layer.version, factoryManifest.version)
          : undefined;
      components.push({
        label: `infra:${factoryManifest.id}`,
        projectVersion: layer.version,
        factoryVersion: factoryManifest.version,
        compare: cmp,
        behindBump,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Falha ao ler manifest da camada "${layer.id}": ${msg}`);
    }
  }

  return {
    projectRoot: absProject,
    templatesRoot: absTemplates,
    errors,
    components,
  };
}

const UPGRADE_TIP_DOCTOR =
  "Tip: for contract, files and placeholders run `project-factory doctor`";

function worstRiskFromComponents(components: ComponentDrift[]): "HIGH" | "LOW" | null {
  let worstRisk: "HIGH" | "LOW" | null = null;
  for (const c of components) {
    if (c.compare !== "behind") {
      continue;
    }
    const bump = c.behindBump ?? computeBehindBump(c.projectVersion, c.factoryVersion);
    const risk = riskForBehindBump(bump);
    if (risk === "HIGH") {
      worstRisk = "HIGH";
    } else if (worstRisk !== "HIGH") {
      worstRisk = "LOW";
    }
  }
  return worstRisk;
}

/**
 * Payload JSON estável para CI/scripts (`upgrade --dry-run --json`). Não altera `analyzeUpgradeDryRun`.
 */
export function serializeUpgradeDryRunReport(
  report: UpgradeDryRunReport,
): Record<string, unknown> {
  const exitCode = upgradeDryRunExitCode(report);
  const hasErrors = report.errors.length > 0;
  const hasBehind = report.components.some((c) => c.compare === "behind");
  const upgradeStatus: "UP_TO_DATE" | "BEHIND" | "FAILED" = hasErrors
    ? "FAILED"
    : hasBehind
      ? "BEHIND"
      : "UP_TO_DATE";
  const worstRisk = worstRiskFromComponents(report.components);
  const behind = report.components.filter((c) => c.compare === "behind").length;
  const ahead = report.components.filter((c) => c.compare === "ahead").length;
  const equal = report.components.filter((c) => c.compare === "equal").length;

  const componentsOut = report.components.map((c) => {
    const row: Record<string, unknown> = {
      label: c.label,
      projectVersion: c.projectVersion,
      factoryVersion: c.factoryVersion,
      compare: c.compare,
    };
    if (c.behindBump !== undefined) {
      row.behindBump = c.behindBump;
    }
    if (c.compare === "behind") {
      const bump = c.behindBump ?? computeBehindBump(c.projectVersion, c.factoryVersion);
      row.risk = riskForBehindBump(bump);
    }
    return row;
  });

  return {
    ok: exitCode === 0,
    command: "upgrade-dry-run",
    exitCode,
    projectRoot: report.projectRoot,
    templatesRoot: report.templatesRoot,
    upgradeStatus,
    worstRisk,
    errors: report.errors,
    components: componentsOut,
    summary: {
      errors: report.errors.length,
      components: report.components.length,
      behind,
      ahead,
      equal,
    },
    tip: UPGRADE_TIP_DOCTOR,
  };
}

function printUpgradeDryRunReportJson(report: UpgradeDryRunReport): void {
  console.log(JSON.stringify(serializeUpgradeDryRunReport(report), null, 2));
}

export function printUpgradeDryRunReport(report: UpgradeDryRunReport): void {
  console.log(`[upgrade --dry-run] projeto: ${report.projectRoot}`);
  console.log(`[upgrade --dry-run] templates factory: ${report.templatesRoot}`);
  console.log("");

  const hasBehind = report.components.some((c) => c.compare === "behind");
  const worstRisk = worstRiskFromComponents(report.components);
  for (const c of report.components) {
    if (c.compare === "behind") {
      const bump = c.behindBump ?? computeBehindBump(c.projectVersion, c.factoryVersion);
      const risk = riskForBehindBump(bump);
      const bumpLabel = bump === "major" ? "MAJOR" : bump === "minor" ? "MINOR" : "PATCH";
      console.error(
        `[DEFASAGEM] ${c.label}: projeto ${c.projectVersion} < factory ${c.factoryVersion}`,
      );
      console.error(`  Behind by ${bumpLabel} version — Risk: ${risk}`);
    } else if (c.compare === "ahead") {
      console.log(
        `[INFO] ${c.label}: projeto ${c.projectVersion} > factory ${c.factoryVersion} (revisão manual / factory mais antigo que o metadata).`,
      );
    } else {
      console.log(`[OK] ${c.label}: ${c.projectVersion} (alinhado ao factory)`);
    }
  }

  if (report.components.length === 0 && report.errors.length === 0) {
    console.log("(Nenhum componente comparado — infraTemplates vazio e stack não resolvido.)");
  }

  if (report.errors.length > 0) {
    console.log("");
    for (const e of report.errors) {
      console.error(`[ERRO] ${e}`);
    }
  }

  console.log("");
  if (report.errors.length > 0) {
    console.error("[upgrade --dry-run] Concluído com erros; nada foi alterado.");
    console.log("Upgrade status: FAILED");
  } else if (hasBehind) {
    console.error(
      "[upgrade --dry-run] Há defasagem em relação aos templates atuais do factory. Nenhuma alteração foi aplicada.",
    );
    if (worstRisk !== null) {
      console.error(`Summary risk (worst case): ${worstRisk}`);
    }
    console.log("Upgrade status: BEHIND");
  } else {
    console.log(
      "[upgrade --dry-run] Nenhuma defasagem de versão (semver) em relação ao factory. Nenhuma alteração foi aplicada.",
    );
    console.log("Upgrade status: UP TO DATE");
  }

  console.log(UPGRADE_TIP_DOCTOR);
}

export function upgradeDryRunExitCode(report: UpgradeDryRunReport): number {
  if (report.errors.length > 0) {
    return 1;
  }
  return report.components.some((c) => c.compare === "behind") ? 1 : 0;
}

export async function runUpgradeDryRunCommand(
  argv: string[],
  hooks: { cwd?: string } = {},
): Promise<number> {
  const cwd = hooks.cwd ?? process.cwd();
  const wantJson = argv.includes("--json");

  let projectPath = ".";
  let factoryRoot: string | undefined;
  let debug = false;

  const program = new Command();
  program.exitOverride();
  program
    .name("upgrade")
    .description(
      "Compara .project-factory.json do projeto com template.json atuais do factory (sem alterar arquivos).",
    )
    .argument("[path]", "Raiz do projeto gerado", ".")
    .requiredOption(
      "--dry-run",
      "Obrigatório nesta versão: apenas relatório, sem aplicar mudanças.",
    )
    .option(
      "--factory-root <dir>",
      "Raiz do repositório project-factory (deve conter a pasta templates/). Padrão: inferido a partir desta CLI (checkout típico).",
    )
    .option("--json", "Emitir um único objeto JSON em stdout (automação/CI)", false)
    .option("--debug", "Log extra no stderr", false)
    .action(
      (
        p: string,
        opts: { dryRun?: boolean; factoryRoot?: string; debug?: boolean; json?: boolean },
      ) => {
        projectPath = p;
        factoryRoot = opts.factoryRoot?.trim() || undefined;
        debug = Boolean(opts.debug);
      },
    );

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (e) {
    if (debug && e) {
      console.error("[project-factory:debug] upgrade parse error", e);
    }
    if (wantJson) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = e instanceof CommanderError ? (e.exitCode ?? 1) : 1;
      writeCliParseErrorJson("upgrade-dry-run", msg, code);
      return code;
    }
    if (e instanceof CommanderError) {
      return e.exitCode ?? 1;
    }
    return 1;
  }

  const opts = program.opts<{
    dryRun?: boolean;
    factoryRoot?: string;
    debug?: boolean;
    json?: boolean;
  }>();
  const jsonOut = Boolean(opts.json);

  const absProject = path.resolve(cwd, projectPath);
  let templatesRoot: string;
  if (factoryRoot !== undefined && factoryRoot.length > 0) {
    const root = path.resolve(cwd, factoryRoot);
    templatesRoot = path.join(root, "templates");
  } else {
    templatesRoot = getTemplatesRoot();
  }

  if (debug) {
    console.error("[project-factory:debug] upgrade cwd", cwd);
    console.error("[project-factory:debug] upgrade projectPath", absProject);
    console.error("[project-factory:debug] upgrade templatesRoot", templatesRoot);
  }

  const report = analyzeUpgradeDryRun(absProject, templatesRoot);
  if (jsonOut) {
    printUpgradeDryRunReportJson(report);
  } else {
    printUpgradeDryRunReport(report);
  }
  return upgradeDryRunExitCode(report);
}
