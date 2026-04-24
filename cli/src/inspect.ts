import path from "node:path";

import { Command, CommanderError } from "commander";

import {
  diagnoseProject,
  doctorExitCode,
  printDoctorReport,
  serializeDoctorReport,
  type DoctorReport,
} from "./doctor";
import { getTemplatesRoot } from "./generate";
import { writeCliParseErrorJson } from "./json-cli";
import {
  analyzeUpgradeDryRun,
  printUpgradeDryRunReport,
  serializeUpgradeDryRunReport,
  upgradeDryRunExitCode,
  type UpgradeDryRunReport,
} from "./upgrade-dry-run";

/** Exit ≠ 0 se o contrato (`doctor`) falhar ou houver erro/defasagem no dry-run de upgrade. */
export function inspectExitCode(
  doctorReport: DoctorReport,
  upgradeReport: UpgradeDryRunReport,
): number {
  if (doctorExitCode(doctorReport) !== 0) {
    return 1;
  }
  return upgradeDryRunExitCode(upgradeReport);
}

/**
 * Visão consolidada para CI/scripts. Reutiliza os serializers de `doctor` e `upgrade --dry-run`.
 */
export function serializeInspectReport(
  doctorReport: DoctorReport,
  upgradeReport: UpgradeDryRunReport,
): Record<string, unknown> {
  const exitCode = inspectExitCode(doctorReport, upgradeReport);
  return {
    ok: exitCode === 0,
    command: "inspect",
    exitCode,
    projectRoot: doctorReport.root,
    templatesRoot: upgradeReport.templatesRoot,
    doctor: serializeDoctorReport(doctorReport),
    upgrade: serializeUpgradeDryRunReport(upgradeReport),
  };
}

function printInspectReportJson(
  doctorReport: DoctorReport,
  upgradeReport: UpgradeDryRunReport,
): void {
  console.log(
    JSON.stringify(serializeInspectReport(doctorReport, upgradeReport), null, 2),
  );
}

function printInspectReportHuman(
  doctorReport: DoctorReport,
  upgradeReport: UpgradeDryRunReport,
): void {
  console.log(`[inspect] projeto: ${doctorReport.root}`);
  console.log(`[inspect] templates factory: ${upgradeReport.templatesRoot}`);
  console.log("");
  console.log("--- Contract (doctor) ---");
  console.log("");
  printDoctorReport(doctorReport);
  console.log("");
  console.log("--- Template drift (upgrade --dry-run) ---");
  console.log("");
  printUpgradeDryRunReport(upgradeReport);
}

/**
 * `inspect` (argv já sem o token `inspect`). Combina `diagnoseProject` + `analyzeUpgradeDryRun` (somente leitura).
 */
export async function runInspectCommand(
  argv: string[],
  hooks: { cwd?: string } = {},
): Promise<number> {
  const cwd = hooks.cwd ?? process.cwd();
  const wantJson = argv.includes("--json");

  let targetPath = ".";
  let factoryRoot: string | undefined;
  let debug = false;

  const program = new Command();
  program.exitOverride();
  program
    .name("inspect")
    .description(
      "Visão consolidada: contrato mínimo (doctor) + defasagem de templates vs factory (upgrade --dry-run), sem alterar arquivos.",
    )
    .argument("[path]", "Raiz do projeto gerado", ".")
    .option(
      "--factory-root <dir>",
      "Raiz do repositório project-factory (pasta templates/). Padrão: inferido a partir desta CLI.",
    )
    .option("--json", "Emitir um único objeto JSON em stdout (automação/CI)", false)
    .option("--debug", "Log extra no stderr", false)
    .allowExcessArguments(false)
    .action((p: string, opts: { factoryRoot?: string; debug?: boolean; json?: boolean }) => {
      targetPath = p;
      factoryRoot = opts.factoryRoot?.trim() || undefined;
      debug = Boolean(opts.debug);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (e) {
    if (debug) {
      console.error("[project-factory:debug] inspect parse error", e);
    }
    if (wantJson) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = e instanceof CommanderError ? (e.exitCode ?? 1) : 1;
      writeCliParseErrorJson("inspect", msg, code);
      return code;
    }
    if (e instanceof CommanderError) {
      return e.exitCode ?? 1;
    }
    return 1;
  }

  const opts = program.opts<{
    factoryRoot?: string;
    debug?: boolean;
    json?: boolean;
  }>();
  const jsonOut = Boolean(opts.json);

  const root = path.resolve(cwd, targetPath);
  let templatesRoot: string;
  if (factoryRoot !== undefined && factoryRoot.length > 0) {
    const fr = path.resolve(cwd, factoryRoot);
    templatesRoot = path.join(fr, "templates");
  } else {
    templatesRoot = getTemplatesRoot();
  }

  if (debug) {
    console.error("[project-factory:debug] inspect cwd", cwd);
    console.error("[project-factory:debug] inspect root", root);
    console.error("[project-factory:debug] inspect templatesRoot", templatesRoot);
  }

  const doctorReport = diagnoseProject(root);
  const upgradeReport = analyzeUpgradeDryRun(root, templatesRoot);

  if (jsonOut) {
    printInspectReportJson(doctorReport, upgradeReport);
  } else {
    printInspectReportHuman(doctorReport, upgradeReport);
  }

  return inspectExitCode(doctorReport, upgradeReport);
}
