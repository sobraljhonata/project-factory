#!/usr/bin/env node
import { program } from "commander";
import { checkbox, input } from "@inquirer/prompts";
import {
  generateProject,
  INFRA_LAYERS,
  type GenerateVars,
  type InfraLayerId,
} from "./generate";
import { parseInfraArg } from "./parse-infra";
import { resolveTitleNonInteractive } from "./resolve-title";
import {
  resolveTargetDir,
  validateAwsRegion,
  validatePackageNameForCli,
  validateProjectDirArg,
  validateTargetDirAvailable,
} from "./validate";
import { runDoctorCommand } from "./doctor";
import { assertPresetRequiresYes, resolveCreateInfra } from "./presets";
import { runUpgradeDryRunCommand } from "./upgrade-dry-run";

function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-api"
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv[0] === "doctor") {
    process.exitCode = await runDoctorCommand(argv.slice(1));
    return;
  }
  if (argv[0] === "upgrade") {
    process.exitCode = await runUpgradeDryRunCommand(argv.slice(1));
    return;
  }

  const createArgv = argv[0] === "create" ? argv.slice(1) : argv;

  program
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
    )
    .parse(createArgv, { from: "user" });

  const opts = program.opts<{
    yes?: boolean;
    packageName?: string;
    title?: string;
    infra?: string;
    preset?: string;
    region?: string;
    debug?: boolean;
  }>();
  const projectDirArg = program.args[0] ?? "my-api";
  const cwd = process.cwd();

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

  if (!opts.yes) {
    const nameAns = await input({
      message: "Nome do pacote npm (kebab-case)",
      default: packageName ?? slugify(projectDirArg),
    });
    packageName = slugify(nameAns);

    const titleAns = await input({
      message: "Título legível da API",
      default: title ?? packageName,
    });
    title = titleAns.trim() || packageName;

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
    packageName = packageName ?? slugify(projectDirArg);
    title = resolveTitleNonInteractive(title, packageName);
  }

  validatePackageNameForCli(packageName);

  const region = (opts.region ?? "us-east-1").trim();
  validateAwsRegion(region);

  const vars: GenerateVars = {
    PACKAGE_NAME: packageName,
    PROJECT_SLUG: packageName,
    API_TITLE: title,
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
      packageName,
      title,
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

  console.log(`Projeto gerado em: ${targetDir}`);
  console.log("Próximos passos:");
  console.log(`  cd ${projectDirArg}`);
  console.log("  cp .env.example .env");
  console.log("  npm install");
  console.log("  npm run check");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[project-factory] ${msg}`);
  process.exit(1);
});
