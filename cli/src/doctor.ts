import fs from "node:fs";
import path from "node:path";

import { Command, CommanderError } from "commander";

import {
  findFilesWithUnresolvedPlaceholders,
  PROJECT_FACTORY_PRODUCT_NAME,
} from "./generate";
import { writeCliParseErrorJson } from "./json-cli";

const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export type DoctorSeverity = "error" | "warn";

export type DoctorFinding = {
  severity: DoctorSeverity;
  message: string;
};

export type DoctorReport = {
  root: string;
  findings: DoctorFinding[];
};

function addFinding(
  findings: DoctorFinding[],
  severity: DoctorSeverity,
  message: string,
): void {
  findings.push({ severity, message });
}

function readJsonFile(filePath: string): unknown | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function nodeEngineMismatchWarning(
  enginesNode: string | undefined,
  currentNode: string,
): string | null {
  if (enginesNode === undefined || enginesNode.trim() === "") {
    return null;
  }
  const major = Number(currentNode.split(".")[0]);
  if (!Number.isFinite(major)) {
    return null;
  }
  const gte = enginesNode.match(/>=\s*(\d+)/);
  if (gte) {
    const req = Number(gte[1]);
    if (Number.isFinite(req) && major < req) {
      return (
        `engines.node pede "${enginesNode}"; ambiente atual é Node ${currentNode}. ` +
        "Atualize o Node ou ajuste engines conforme o time."
      );
    }
  }
  return null;
}

/**
 * Inspeciona um diretório (projeto já gerado) contra o contrato mínimo documentado em GENERATION_CONTRACT.md.
 * Apenas leitura de disco; não executa npm nem Terraform.
 */
export function diagnoseProject(root: string): DoctorReport {
  const findings: DoctorFinding[] = [];
  const abs = path.resolve(root);

  if (!fs.existsSync(abs)) {
    addFinding(
      findings,
      "error",
      `Diretório inexistente: ${abs}`,
    );
    return { root: abs, findings };
  }
  if (!fs.statSync(abs).isDirectory()) {
    addFinding(findings, "error", `Caminho não é uma pasta: ${abs}`);
    return { root: abs, findings };
  }

  const metaPath = path.join(abs, ".project-factory.json");
  if (!fs.existsSync(metaPath)) {
    addFinding(
      findings,
      "error",
      `Arquivo obrigatório ausente: .project-factory.json (${abs})`,
    );
  }

  const pkgPath = path.join(abs, "package.json");
  if (!fs.existsSync(pkgPath)) {
    addFinding(findings, "error", `Arquivo obrigatório ausente: package.json`);
  }

  const readmePath = path.join(abs, "README.md");
  if (!fs.existsSync(readmePath)) {
    addFinding(findings, "error", `Arquivo obrigatório ausente: README.md`);
  }

  const envExamplePath = path.join(abs, ".env.example");
  if (!fs.existsSync(envExamplePath)) {
    addFinding(findings, "error", `Arquivo obrigatório ausente: .env.example`);
  }

  let meta: Record<string, unknown> | null = null;
  if (fs.existsSync(metaPath)) {
    const parsed = readJsonFile(metaPath);
    if (parsed === null) {
      addFinding(
        findings,
        "error",
        ".project-factory.json existe mas não é JSON válido (ou não foi possível ler).",
      );
    } else if (typeof parsed !== "object" || Array.isArray(parsed)) {
      addFinding(
        findings,
        "error",
        ".project-factory.json deve ser um objeto JSON.",
      );
    } else {
      meta = parsed as Record<string, unknown>;
    }
  }

  if (meta !== null) {
    const gen = meta.generator;
    if (!isNonEmptyString(gen)) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: campo "generator" ausente ou inválido.',
      );
    } else if (gen.trim() !== PROJECT_FACTORY_PRODUCT_NAME) {
      addFinding(
        findings,
        "warn",
        `.project-factory.json: "generator" é "${gen.trim()}" (esperado "${PROJECT_FACTORY_PRODUCT_NAME}" para projetos novos; legado é aceitável).`,
      );
    }

    if (!isNonEmptyString(meta.generatorVersion)) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: "generatorVersion" ausente ou inválido.',
      );
    }

    if (!isNonEmptyString(meta.template)) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: "template" ausente ou inválido.',
      );
    }

    const tv = meta.templateVersion;
    if (!isNonEmptyString(tv) || !SEMVER_RE.test(tv.trim())) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: "templateVersion" ausente ou não semver MAJOR.MINOR.PATCH.',
      );
    }

    const ga = meta.generatedAt;
    if (!isNonEmptyString(ga) || Number.isNaN(Date.parse(ga.trim()))) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: "generatedAt" ausente ou não é data ISO 8601 parseável.',
      );
    }

    const infra = meta.infraTemplates;
    if (!Array.isArray(infra)) {
      addFinding(
        findings,
        "error",
        '.project-factory.json: "infraTemplates" deve ser um array.',
      );
    } else {
      for (let i = 0; i < infra.length; i++) {
        const item = infra[i];
        if (
          item === null ||
          typeof item !== "object" ||
          Array.isArray(item) ||
          !isNonEmptyString((item as Record<string, unknown>).id) ||
          !isNonEmptyString((item as Record<string, unknown>).version) ||
          !SEMVER_RE.test(
            String((item as Record<string, unknown>).version).trim(),
          )
        ) {
          addFinding(
            findings,
            "error",
            `.project-factory.json: infraTemplates[${i}] inválido (esperado { id, version } com version semver).`,
          );
          break;
        }
      }
    }
  }

  let pkg: Record<string, unknown> | null = null;
  if (fs.existsSync(pkgPath)) {
    const parsed = readJsonFile(pkgPath);
    if (parsed === null) {
      addFinding(
        findings,
        "error",
        "package.json existe mas não é JSON válido (ou não foi possível ler).",
      );
    } else if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      addFinding(findings, "error", "package.json deve ser um objeto JSON.");
    } else {
      pkg = parsed as Record<string, unknown>;
    }
  }

  if (pkg !== null) {
    const scripts = pkg.scripts;
    if (scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) {
      addFinding(findings, "error", 'package.json: campo "scripts" ausente ou inválido.');
    } else {
      const s = scripts as Record<string, unknown>;
      if (!isNonEmptyString(s.check)) {
        addFinding(
          findings,
          "error",
          'package.json: script obrigatório "check" ausente ou inválido.',
        );
      }
      if (!isNonEmptyString(s["smoke:http"])) {
        addFinding(
          findings,
          "error",
          'package.json: script obrigatório "smoke:http" ausente ou inválido.',
        );
      }
    }

    const engines = pkg.engines;
    if (
      engines !== null &&
      typeof engines === "object" &&
      !Array.isArray(engines) &&
      engines !== undefined
    ) {
      const nodeReq = (engines as Record<string, unknown>).node;
      const warn = nodeEngineMismatchWarning(
        typeof nodeReq === "string" ? nodeReq : undefined,
        process.versions.node,
      );
      if (warn !== null) {
        addFinding(findings, "warn", warn);
      }
    }
  }

  const srcDir = path.join(abs, "src");
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory() && !fs.existsSync(srcDir)) {
    addFinding(
      findings,
      "warn",
      "Não foi encontrada a pasta `src/`. Pode não ser um app Node gerado pelo template atual do factory.",
    );
  }

  try {
    const bad = findFilesWithUnresolvedPlaceholders(abs);
    if (bad.length > 0) {
      addFinding(
        findings,
        "error",
        `Placeholders {{TOKEN}} remanescentes em:\n${bad.join("\n")}`,
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addFinding(findings, "error", `Falha ao varrer placeholders: ${msg}`);
  }

  return { root: abs, findings };
}

function printDoctorUpgradeHint(): void {
  console.log(DOCTOR_TIP_UPGRADE);
}

export function printDoctorReport(report: DoctorReport): void {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warns = report.findings.filter((f) => f.severity === "warn");

  for (const f of errors) {
    console.error(`[ERRO] ${f.message}`);
  }
  for (const f of warns) {
    console.error(`[AVISO] ${f.message}`);
  }

  if (errors.length === 0 && warns.length === 0) {
    console.log(`Diagnóstico OK: ${report.root}`);
    console.log("(Contrato mínimo: arquivos, metadados e scripts obrigatórios.)");
    printDoctorUpgradeHint();
    return;
  }

  if (errors.length === 0) {
    console.log(`Diagnóstico OK com avisos: ${report.root}`);
    printDoctorUpgradeHint();
  }

  console.error(
    `[project-factory doctor] ${errors.length} erro(s), ${warns.length} aviso(s).`,
  );
}

export function doctorExitCode(report: DoctorReport): number {
  return report.findings.some((f) => f.severity === "error") ? 1 : 0;
}

const DOCTOR_TIP_UPGRADE =
  "Tip: for version drift vs factory templates run `project-factory upgrade --dry-run`";

/**
 * Payload JSON estável para CI/scripts (`doctor --json`). Não altera `diagnoseProject`.
 */
export function serializeDoctorReport(report: DoctorReport): Record<string, unknown> {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warns = report.findings.filter((f) => f.severity === "warn");
  const exitCode = doctorExitCode(report);
  const status =
    errors.length > 0 ? "fail" : warns.length > 0 ? "warn" : "ok";
  const base: Record<string, unknown> = {
    ok: exitCode === 0,
    command: "doctor",
    exitCode,
    root: report.root,
    summary: { errors: errors.length, warnings: warns.length },
    findings: report.findings,
    status,
  };
  if (errors.length === 0) {
    base.tip = DOCTOR_TIP_UPGRADE;
  }
  return base;
}

function printDoctorReportJson(report: DoctorReport): void {
  console.log(JSON.stringify(serializeDoctorReport(report), null, 2));
}

/**
 * Executa o subcomando `doctor` (argv já sem o token `doctor`).
 * Retorna código de saída (0 ou 1).
 */
export async function runDoctorCommand(
  argv: string[],
  hooks: { cwd?: string } = {},
): Promise<number> {
  const cwd = hooks.cwd ?? process.cwd();
  const wantJson = argv.includes("--json");

  let targetPath = ".";
  let debug = false;

  const program = new Command();
  program.exitOverride();
  program
    .name("doctor")
    .description(
      "Verifica se o diretório parece um projeto gerado pelo project-factory e está alinhado ao contrato mínimo (offline).",
    )
    .argument("[path]", "Pasta do projeto a inspecionar", ".")
    .option("--json", "Emitir um único objeto JSON em stdout (automação/CI)", false)
    .option("--debug", "Log extra no stderr", false)
    .allowExcessArguments(false)
    .action((p: string, opts: { debug?: boolean; json?: boolean }) => {
      targetPath = p;
      debug = Boolean(opts.debug);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (e) {
    if (debug) {
      console.error("[project-factory:debug] doctor parse error", e);
    }
    if (wantJson) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = e instanceof CommanderError ? (e.exitCode ?? 1) : 1;
      writeCliParseErrorJson("doctor", msg, code);
      return code;
    }
    if (e instanceof CommanderError) {
      return e.exitCode ?? 1;
    }
    return 1;
  }

  const opts = program.opts<{ debug?: boolean; json?: boolean }>();
  const jsonOut = Boolean(opts.json);

  const root = path.resolve(cwd, targetPath);
  if (debug) {
    console.error("[project-factory:debug] doctor cwd", cwd);
    console.error("[project-factory:debug] doctor root", root);
  }

  const report = diagnoseProject(root);
  if (jsonOut) {
    printDoctorReportJson(report);
  } else {
    printDoctorReport(report);
  }
  return doctorExitCode(report);
}
