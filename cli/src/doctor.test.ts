import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  diagnoseProject,
  doctorExitCode,
  runDoctorCommand,
  serializeDoctorReport,
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
    applicationModules: [] as { id: string; version: string }[],
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

  it("erro quando applicationModules não é array", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-appmod-"));
    writeFixture(dir, { meta: { applicationModules: "bad" as unknown as [] } });
    const r = diagnoseProject(dir);
    expect(doctorExitCode(r)).toBe(1);
    expect(r.findings.some((f) => f.message.includes("applicationModules"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("serializeDoctorReport", () => {
  it("ok true e tip quando não há erros", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-ser-"));
    writeFixture(dir);
    const r = diagnoseProject(dir);
    const payload = serializeDoctorReport(r) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.exitCode).toBe(0);
    expect(payload.command).toBe("doctor");
    expect(payload.status).toBe("ok");
    expect(typeof payload.tip).toBe("string");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("ok false sem tip quando há erro", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-ser-err-"));
    const r = diagnoseProject(dir);
    const payload = serializeDoctorReport(r) as Record<string, unknown>;
    expect(payload.ok).toBe(false);
    expect(payload.exitCode).toBe(1);
    expect(payload.tip).toBeUndefined();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("runDoctorCommand", () => {
  it("retorna 1 para flag desconhecida", async () => {
    const code = await runDoctorCommand(["--nope"]);
    expect(code).toBe(1);
  });

  it("com --json e flag inválida emite um objeto JSON de erro em stdout", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runDoctorCommand(["--json", "--nope"]);
    expect(code).not.toBe(0);
    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "doctor",
      exitCode: expect.any(Number),
      error: expect.any(String),
    });
    spy.mockRestore();
  });

  it("com --json em projeto válido emite relatório com ok true", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-cli-json-"));
    writeFixture(dir);
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runDoctorCommand(["--json"], { cwd: dir });
    expect(code).toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("doctor");
    expect(payload.status).toBe("ok");
    spy.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("inspeciona diretório via cwd", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-doc-cli-"));
    writeFixture(dir);
    const code = await runDoctorCommand([], { cwd: dir });
    expect(code).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
