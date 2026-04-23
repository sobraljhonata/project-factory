import fs from "node:fs";
import path from "node:path";

import { checkbox, input } from "@inquirer/prompts";
import { Command, CommanderError } from "commander";

import {
  generateProject,
  INFRA_LAYERS,
  type GenerateVars,
  type InfraLayerId,
} from "./generate";
import { writeCliParseErrorJson } from "./json-cli";
import { parseInfraArg } from "./parse-infra";
import { assertPresetRequiresYes, resolveCreateInfra } from "./presets";
import { resolveTitleNonInteractive } from "./resolve-title";
import {
  resolveTargetDir,
  validateAwsRegion,
  validatePackageNameForCli,
  validateProjectDirArg,
  validateTargetDirAvailable,
} from "./validate";

const JSON_REQUIRES_YES =
  "create --json requires --yes (non-interactive mode).";

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-api"
  );
}

function readProjectFactoryMetaForJson(targetDir: string): {
  template: string;
  templateVersion: string;
  generatorVersion: string;
} {
  const metaPath = path.join(targetDir, ".project-factory.json");
  const raw = fs.readFileSync(metaPath, "utf8");
  const meta = JSON.parse(raw) as Record<string, unknown>;
  const template = meta.template;
  const templateVersion = meta.templateVersion;
  const generatorVersion = meta.generatorVersion;
  if (
    typeof template !== "string" ||
    typeof templateVersion !== "string" ||
    typeof generatorVersion !== "string"
  ) {
    throw new Error(
      ".project-factory.json gerado está incompleto (template / templateVersion / generatorVersion).",
    );
  }
  return { template, templateVersion, generatorVersion };
}

/**
 * Payload JSON pós-`generateProject` (lê `.project-factory.json` no destino). Não altera a geração.
 */
export function serializeCreateSuccessReport(params: {
  targetDir: string;
  projectDirArg: string;
  packageName: string;
  title: string;
  infraIds: InfraLayerId[];
  region: string;
  preset: string | null;
}): Record<string, unknown> {
  const meta = readProjectFactoryMetaForJson(params.targetDir);
  return {
    ok: true,
    command: "create",
    exitCode: 0,
    targetDir: params.targetDir,
    projectDir: params.projectDirArg,
    packageName: params.packageName,
    title: params.title,
    infra: params.infraIds,
    region: params.region,
    preset: params.preset,
    template: meta.template,
    templateVersion: meta.templateVersion,
    generatorVersion: meta.generatorVersion,
    nextSteps: [`cd ${params.projectDirArg}`, "npm install"],
  };
}

function printCreateSuccessJson(params: {
  targetDir: string;
  projectDirArg: string;
  packageName: string;
  title: string;
  infraIds: InfraLayerId[];
  region: string;
  preset: string | null;
}): void {
  console.log(JSON.stringify(serializeCreateSuccessReport(params), null, 2));
}

function buildCreateProgram(): Command {
  return new Command()
    .name("create-api-app")
    .description(
      "Gera projeto Node.js + Express + TypeScript com infra AWS (Terraform) opcional. " +
        "Execute a partir da raiz do repositório project-factory (pastas templates/ e cli/ presentes).",
    )
    .argument(
      "[projectDir]",
      "Nome da pasta a criar (relativo ao diretório atual)",
      "my-api",
    )
    .option("-y, --yes", "Usar defaults (sem prompts interativos)", false)
    .option("--package-name <name>", "Nome do pacote npm (kebab-case)")
    .option("--title <title>", "Título da API (OpenAPI / README)")
    .option(
      "--infra <lista>",
      "Camadas separadas por vírgula (foundation,aurora,s3,terraformRemoteState)",
    )
    .option(
      "--preset <id>",
      "Infra padrão: minimal | aws-standard | internal-enterprise (exige --yes; --infra explícito vence)",
    )
    .option("--region <aws>", "Região AWS padrão nos exemplos", "us-east-1")
    .option(
      "--json",
      "Emitir um único objeto JSON em stdout (automação/CI; exige --yes)",
      false,
    )
    .option(
      "--debug",
      "Log de troubleshooting no stderr (parâmetros e passos da geração)",
      false,
    )
    .addHelpText(
      "after",
      "\nExemplos:\n" +
        "  node cli/dist/cli.js minha-api --yes --package-name minha-api\n" +
        "  node cli/dist/cli.js create minha-api --yes --package-name minha-api --preset aws-standard\n\n" +
        "Inspecionar projeto já gerado (contrato mínimo, offline):\n" +
        "  node cli/dist/cli.js doctor\n" +
        "  node cli/dist/cli.js doctor ./meu-projeto --debug\n\n" +
        "Comparar versões do projeto com templates atuais do factory (sem alterar arquivos):\n" +
        "  node cli/dist/cli.js upgrade --dry-run\n" +
        "  node cli/dist/cli.js upgrade --dry-run ./meu-projeto --factory-root /caminho/do/project-factory\n\n" +
        "Documentação completa: README.md na raiz do repositório project-factory.\n",
    );
}

/**
 * Fluxo `create` (argv já sem o token `create` quando usado como subcomando).
 * Retorna código de saída; em modo humano pode lançar para erros pós-parse.
 */
export async function runCreateCommand(
  argv: string[],
  hooks: { cwd?: string } = {},
): Promise<number> {
  const cwd = hooks.cwd ?? process.cwd();
  const wantJson = argv.includes("--json");

  const program = buildCreateProgram();
  program.exitOverride();

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (e) {
    if (wantJson) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = e instanceof CommanderError ? (e.exitCode ?? 1) : 1;
      writeCliParseErrorJson("create", msg, code);
      return code;
    }
    if (e instanceof CommanderError) {
      return e.exitCode ?? 1;
    }
    throw e;
  }

  const opts = program.opts<{
    yes?: boolean;
    packageName?: string;
    title?: string;
    infra?: string;
    preset?: string;
    region?: string;
    debug?: boolean;
    json?: boolean;
  }>();
  const jsonOut = Boolean(opts.json);

  if (jsonOut && !opts.yes) {
    writeCliParseErrorJson("create", JSON_REQUIRES_YES, 1);
    return 1;
  }

  const projectDirArg = program.args[0] ?? "my-api";

  const runBody = async (): Promise<void> => {
    validateProjectDirArg(cwd, projectDirArg);
    const targetDir = resolveTargetDir(cwd, projectDirArg);
    validateTargetDirAvailable(targetDir);

    assertPresetRequiresYes(opts.preset, Boolean(opts.yes));

    let packageName = opts.packageName?.trim();
    let title = opts.title?.trim();
    const infraFromCli = program.getOptionValueSource("infra") === "cli";

    let infraIds: InfraLayerId[];
    if (opts.yes) {
      infraIds = resolveCreateInfra({
        presetRaw: opts.preset,
        yes: true,
        infraRaw: opts.infra,
        infraFromCli,
      });
    } else {
      infraIds = parseInfraArg(opts.infra);
    }

    let resolvedPackage: string;
    let resolvedTitle: string;

    if (!opts.yes) {
      const nameAns = await input({
        message: "Nome do pacote npm (kebab-case)",
        default: packageName ?? slugify(projectDirArg),
      });
      resolvedPackage = slugify(nameAns);

      const titleAns = await input({
        message: "Título legível da API",
        default: title ?? resolvedPackage,
      });
      resolvedTitle = titleAns.trim() || resolvedPackage;

      const picked = await checkbox({
        message: "Stacks Terraform AWS (opcional)",
        choices: (
          Object.entries(INFRA_LAYERS) as [InfraLayerId, { label: string }][]
        ).map(([id, v]) => ({
          value: id,
          name: v.label,
        })),
      });
      infraIds = picked;
    } else {
      resolvedPackage = packageName ?? slugify(projectDirArg);
      resolvedTitle = resolveTitleNonInteractive(title, resolvedPackage);
    }

    validatePackageNameForCli(resolvedPackage);

    const region = (opts.region ?? "us-east-1").trim();
    validateAwsRegion(region);

    const vars: GenerateVars = {
      PACKAGE_NAME: resolvedPackage,
      PROJECT_SLUG: resolvedPackage,
      API_TITLE: resolvedTitle,
      API_DESCRIPTION:
        "API HTTP REST. Estenda `src/modules` e registre rotas em `src/core/config/routes.ts`.",
      API_VERSION: "v1",
      APP_PORT: "3000",
      AWS_REGION: region,
    };

    if (opts.debug) {
      console.error("[project-factory:debug] cwd", cwd);
      console.error("[project-factory:debug] projectDirArg", projectDirArg);
      console.error("[project-factory:debug] targetDir", targetDir);
      console.error("[project-factory:debug] resolved", {
        packageName: resolvedPackage,
        title: resolvedTitle,
        preset: opts.preset,
        infraFromCli,
        infraIds,
        region: vars.AWS_REGION,
      });
    }

    generateProject({
      targetDir,
      infra: infraIds,
      vars,
      debug: opts.debug,
    });

    const presetNorm =
      opts.preset !== undefined && String(opts.preset).trim() !== ""
        ? String(opts.preset).trim()
        : null;

    if (jsonOut) {
      printCreateSuccessJson({
        targetDir,
        projectDirArg,
        packageName: resolvedPackage,
        title: resolvedTitle,
        infraIds,
        region,
        preset: presetNorm,
      });
    } else {
      console.log(`Projeto gerado em: ${targetDir}`);
      console.log("Próximos passos:");
      console.log(`  cd ${projectDirArg}`);
      console.log("  cp .env.example .env");
      console.log("  npm install");
      console.log("  npm run check");
    }
  };

  try {
    await runBody();
  } catch (e) {
    if (jsonOut) {
      const msg = e instanceof Error ? e.message : String(e);
      writeCliParseErrorJson("create", msg, 1);
      return 1;
    }
    throw e;
  }

  return 0;
}
