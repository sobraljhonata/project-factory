import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  diagnoseProject,
  doctorExitCode,
  runDoctorCommand,
} from "./doctor";
import { PROJECT_FACTORY_PRODUCT_NAME } from "./generate";

function writeFixture(
  dir: string,
  overrides: {
    meta?: Record<string, unknown>;
    pkg?: Record<string, unknown>;
    withPlaceholder?: boolean;
    withSrc?: boolean;
  } = {},
): void {
  const meta = {
    generator: PROJECT_FACTORY_PRODUCT_NAME,
    generatorVersion: "0.1.0",
    template: "api-node-express",
    templateVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    infraTemplates: [] as { id: string; version: string }[],
    ...overrides.meta,
  };
  const pkg = {
    name: "fixture-api",
    scripts: {
      check: "node -e \"process.exit(0)\"",
      "smoke:http": "node -e \"process.exit(0)\"",
    },
    ...overrides.pkg,
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".project-factory.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify(pkg, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Fixture\n", "utf8");
  fs.writeFileSync(path.join(dir, ".env.example"), "X=1\n", "utf8");

  if (overrides.withSrc !== false) {
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "x.ts"), "export {}\n", "utf8");
  }

  if (overrides.withPlaceholder) {
    fs.writeFileSync(path.join(dir, "bad.txt"), "{{FOO}}\n", "utf8");
  }
}

describe("diagnoseProject", () => {
  it("falha quando o diretório não existe", () => {
    const dir = path.join(os.tmpdir(), "pf-doc-missing-", String(Date.now()));
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(1);
    expect(r.findings.some((f) => f.severity === "error")).toBe(true);
  });

  it("passa em fixture mínima válida", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-ok-"));
    writeFixture(dir);
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(0);
    expect(r.findings).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("erro quando faltam scripts obrigatórios", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-scripts-"));
    writeFixture(dir, {
      pkg: {
        name: "x",
        scripts: { check: "echo" },
      },
    });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(1);
    expect(r.findings.some((f) => f.message.includes("smoke:http"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("erro quando há placeholder remanescente", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-ph-"));
    writeFixture(dir, { withPlaceholder: true });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(1);
    expect(r.findings.some((f) => f.message.includes("Placeholders"))).toBe(
      true,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("aviso com generator legado mas sem erro se o resto é válido", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-legacy-"));
    writeFixture(dir, { meta: { generator: "@project-factory/cli" } });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(0);
    expect(r.findings.some((f) => f.severity === "warn")).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("aviso quando engines.node exige major acima do ambiente atual", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-eng-"));
    const major = Number(process.versions.node.split(".")[0]);
    writeFixture(dir, {
      pkg: {
        name: "x",
        engines: { node: `>=${major + 10}` },
        scripts: {
          check: "node -e \"process.exit(0)\"",
          "smoke:http": "node -e \"process.exit(0)\"",
        },
      },
    });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(0);
    expect(r.findings.some((f) => f.severity === "warn" && f.message.includes("engines.node"))).toBe(
      true,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("aviso quando não existe pasta src", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-nosrc-"));
    writeFixture(dir, { withSrc: false });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(0);
    expect(r.findings.some((f) => f.message.includes("src/"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("erro quando templateVersion não é semver estrito", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-semver-"));
    writeFixture(dir, { meta: { templateVersion: "1.0" } });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("runDoctorCommand", () => {
  it("retorna 1 para flag desconhecida", async () => {
    const code = await runDoctorCommand(["--nope"]);
    expect(code).toBe(1);
  });

  it("inspeciona diretório via cwd", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-cli-"));
    writeFixture(dir);
    const code = await runDoctorCommand([], { cwd: dir });
    expect(code).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
