#!/usr/bin/env node
/**
 * Smoke E2E do factory: gera app em diretório temporário, npm install, check, smoke HTTP.
 * Falha com exit code !== 0 em qualquer etapa.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

function run(label, cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: "pipe",
    cwd: options.cwd ?? ROOT,
    env: options.env ?? process.env,
  });
  if (r.status !== 0) {
    console.error(`[smoke] FALHA em: ${label}`);
    console.error(`  comando: ${cmd} ${args.join(" ")}`);
    if (r.stdout) {
      console.error("--- stdout ---\n", r.stdout.slice(-8000));
    }
    if (r.stderr) {
      console.error("--- stderr ---\n", r.stderr.slice(-8000));
    }
    process.exit(r.status ?? 1);
  }
  return r;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-smoke-"));
const appDir = path.join(tmp, "smoke-app");

process.on("exit", () => {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

run("build:cli", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build:cli"], {
  cwd: ROOT,
});

run(
  "generate",
  process.execPath,
  [
    path.join(ROOT, "cli/dist/cli.js"),
    appDir,
    "--yes",
    "--package-name",
    "smoke-e2e",
  ],
  { cwd: ROOT },
);

function assert(cond, msg) {
  if (!cond) {
    console.error(`[smoke] CONTRATO: ${msg}`);
    process.exit(1);
  }
}

function assertFile(rel, label) {
  const p = path.join(appDir, rel);
  assert(fs.existsSync(p), `${label}: arquivo ausente (${rel})`);
}

/** Mesma regra que a CLI (`findFilesWithUnresolvedPlaceholders`). */
function assertNoPlaceholders() {
  const { findFilesWithUnresolvedPlaceholders } = require(path.join(
    ROOT,
    "cli/dist/generate.js",
  ));
  const bad = findFilesWithUnresolvedPlaceholders(appDir);
  assert(
    bad.length === 0,
    `placeholders {{TOKEN}} remanescentes em:\n${bad.join("\n")}`,
  );
}

assert(fs.existsSync(appDir), "diretório do app gerado existe");
assertFile("package.json", "package.json");
assertFile(".project-factory.json", "metadados");
assertFile("README.md", "README");
assertFile(".env.example", "env example");

const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
assert(pkg.name === "smoke-e2e", `package.json name esperado smoke-e2e, veio: ${pkg.name}`);

const meta = JSON.parse(
  fs.readFileSync(path.join(appDir, ".project-factory.json"), "utf8"),
);
assert(meta.generator === "project-factory", "meta.generator === project-factory");
assert(
  typeof meta.generatorVersion === "string" && meta.generatorVersion.length > 0,
  "meta.generatorVersion",
);
assert(typeof meta.generatedAt === "string" && meta.generatedAt.length > 0, "meta.generatedAt");
assert(
  !Number.isNaN(Date.parse(meta.generatedAt)),
  "meta.generatedAt deve ser data parseável (ISO 8601)",
);

const semverRe = /^[0-9]+\.[0-9]+\.[0-9]+$/;
assert(meta.template === "api-node-express", "meta.template");
assert(
  typeof meta.templateVersion === "string" && semverRe.test(meta.templateVersion),
  "meta.templateVersion (semver)",
);
assert(
  Array.isArray(meta.infraTemplates) && meta.infraTemplates.length === 0,
  "meta.infraTemplates deve ser array (smoke sem --infra)",
);

assert(
  typeof pkg.scripts === "object" && pkg.scripts !== null,
  "package.json deve declarar scripts",
);
assert(typeof pkg.scripts.check === "string", 'package.json deve ter script "check"');
assert(
  typeof pkg.scripts["smoke:http"] === "string",
  'package.json deve ter script "smoke:http"',
);

assertNoPlaceholders();

run("npm install", process.platform === "win32" ? "npm.cmd" : "npm", ["install"], {
  cwd: appDir,
});

run("npm run check", process.platform === "win32" ? "npm.cmd" : "npm", ["run", "check"], {
  cwd: appDir,
});

const smokeEnv = {
  ...process.env,
  NODE_ENV: "test",
  SMOKE_PORT: "34681",
  /** Evita depender de MySQL no smoke; GET /health ainda exercita o stack Express. */
  READINESS_CHECK_DB: "false",
};

run(
  "smoke:http",
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "smoke:http"],
  { cwd: appDir, env: smokeEnv },
);

console.log("[smoke] OK — geração, check e GET /health validados.");
