#!/usr/bin/env node
/**
 * Quality gate leve para Terraform dos templates AWS:
 * gera um app com todas as camadas (preset internal-enterprise), depois em cada
 * pasta infra/aws/* que contenha .tf roda `terraform fmt -check` e `terraform validate`
 * (após `terraform init -backend=false`).
 *
 * Não executa apply, não usa credenciais AWS (validate não chama APIs).
 *
 * Se `terraform` não estiver no PATH: imprime aviso e sai 0 (não quebra `npm test` local).
 * Em CI, instale Terraform (ex.: hashicorp/setup-terraform) e rode `npm run check:terraform`.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function terraformOnPath() {
  const r = spawnSync("terraform", ["version"], {
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });
  return r.status === 0;
}

function runInDir(cwd, args, label) {
  const r = spawnSync("terraform", args, {
    encoding: "utf8",
    stdio: "pipe",
    cwd,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`[terraform-check] FALHA: ${label}`);
    console.error(`  cwd: ${cwd}`);
    console.error(`  comando: terraform ${args.join(" ")}`);
    if (r.stdout) {
      console.error("--- stdout ---\n", r.stdout.slice(-6000));
    }
    if (r.stderr) {
      console.error("--- stderr ---\n", r.stderr.slice(-6000));
    }
    process.exit(r.status ?? 1);
  }
}

function runRoot(label, cmd, args) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "pipe",
    cwd: ROOT,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`[terraform-check] FALHA em: ${label}`);
    console.error(`  comando: ${cmd} ${args.join(" ")}`);
    if (r.stdout) {
      console.error("--- stdout ---\n", r.stdout.slice(-4000));
    }
    if (r.stderr) {
      console.error("--- stderr ---\n", r.stderr.slice(-4000));
    }
    process.exit(r.status ?? 1);
  }
}

if (!terraformOnPath()) {
  console.log(
    "[terraform-check] SKIP: executável `terraform` não encontrado no PATH.",
  );
  console.log(
    "[terraform-check] Instale Terraform ≥ 1.5 ou rode apenas em CI com setup-terraform.",
  );
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-tfchk-"));
const appDir = path.join(tmp, "tfchk-app");

process.on("exit", () => {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

console.log("[terraform-check] Build da CLI…");
runRoot("build:cli", process.platform === "win32" ? "npm.cmd" : "npm", [
  "run",
  "build:cli",
]);

console.log(
  "[terraform-check] Geração com preset internal-enterprise (tokens substituídos)…",
);
const gen = spawnSync(
  process.execPath,
  [
    path.join(ROOT, "cli/dist/cli.js"),
    appDir,
    "--yes",
    "--package-name",
    "tfchk",
    "--preset",
    "internal-enterprise",
  ],
  { encoding: "utf8", stdio: "pipe", cwd: ROOT, env: process.env },
);
if (gen.status !== 0) {
  console.error("[terraform-check] Falha ao gerar projeto de teste");
  if (gen.stderr) {
    console.error(gen.stderr.slice(-4000));
  }
  process.exit(gen.status ?? 1);
}

const infraAws = path.join(appDir, "infra", "aws");
if (!fs.existsSync(infraAws)) {
  console.error("[terraform-check] Pasta infra/aws ausente após geração.");
  process.exit(1);
}

const layers = fs
  .readdirSync(infraAws, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(infraAws, d.name))
  .filter((dir) => {
    try {
      return fs.readdirSync(dir).some((f) => f.endsWith(".tf"));
    } catch {
      return false;
    }
  })
  .sort();

if (layers.length === 0) {
  console.error("[terraform-check] Nenhuma pasta com .tf encontrada em infra/aws.");
  process.exit(1);
}

console.log(
  `[terraform-check] Camadas com .tf (${layers.length}): ${layers
    .map((p) => path.basename(p))
    .join(", ")}`,
);

for (const dir of layers) {
  const name = path.basename(dir);
  console.log(`[terraform-check] --- ${name} ---`);
  runInDir(dir, ["fmt", "-check", "-recursive", "."], `${name}: terraform fmt -check`);
  runInDir(
    dir,
    ["init", "-backend=false", "-input=false", "-no-color"],
    `${name}: terraform init`,
  );
  runInDir(dir, ["validate", "-no-color"], `${name}: terraform validate`);
  console.log(`[terraform-check] OK: ${name}`);
}

console.log("[terraform-check] Todas as camadas passaram em fmt + validate.");
