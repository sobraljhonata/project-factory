import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { APPLICATION_MODULES } from "./app-modules-catalog";
import { diagnoseProject } from "./doctor";
import { PROJECT_FACTORY_PRODUCT_NAME } from "./generate";
import {
  inspectExitCode,
  runInspectCommand,
  serializeInspectReport,
} from "./inspect";
import { analyzeUpgradeDryRun } from "./upgrade-dry-run";

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

function writeTemplateJson(dir: string, id: string, version: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "template.json"),
    `${JSON.stringify({ id, version }, null, 2)}\n`,
    "utf8",
  );
}

describe("inspectExitCode", () => {
  it("é 1 se doctor falha mesmo com upgrade ok", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-ex-"));
    writeFixture(dir, { withPlaceholder: true });
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-tpl-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const doctorReport = diagnoseProject(dir);
    const upgradeReport = analyzeUpgradeDryRun(dir, templatesRoot);
    expect(inspectExitCode(doctorReport, upgradeReport)).toBe(1);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("é 1 se upgrade está atrás mesmo com doctor ok", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-beh-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "2.0.0",
    );
    const proj = path.join(base, "app");
    writeFixture(proj);
    const doctorReport = diagnoseProject(proj);
    const upgradeReport = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(doctorReport.findings.filter((f) => f.severity === "error")).toHaveLength(0);
    expect(inspectExitCode(doctorReport, upgradeReport)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe("serializeInspectReport", () => {
  it("aninha doctor e upgrade com ok coerente", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-ser-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeFixture(proj);
    const doctorReport = diagnoseProject(proj);
    const upgradeReport = analyzeUpgradeDryRun(proj, templatesRoot);
    const payload = serializeInspectReport(doctorReport, upgradeReport) as Record<
      string,
      unknown
    >;
    expect(payload.command).toBe("inspect");
    expect(payload.ok).toBe(true);
    expect(payload.exitCode).toBe(0);
    expect((payload.doctor as Record<string, unknown>).command).toBe("doctor");
    expect((payload.upgrade as Record<string, unknown>).command).toBe(
      "upgrade-dry-run",
    );
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe("runInspectCommand", () => {
  it("com --json e flag inválida emite JSON de erro", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runInspectCommand(["--json", "--nope"]);
    expect(code).not.toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "inspect",
      exitCode: expect.any(Number),
      error: expect.any(String),
    });
    spy.mockRestore();
  });

  it("com --json em projeto válido e factory alinhado retorna ok true", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-cli-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeFixture(proj);

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runInspectCommand(
      ["--json", "--factory-root", base, "."],
      { cwd: proj },
    );
    expect(code).toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("inspect");
    expect((payload.doctor as Record<string, unknown>).status).toBe("ok");
    expect((payload.upgrade as Record<string, unknown>).upgradeStatus).toBe(
      "UP_TO_DATE",
    );
    spy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("inspect --json reflete applicationModules via upgrade.components (app:*)", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-appmod-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const modDir = path.join(templatesRoot, APPLICATION_MODULES["swagger-rich"].dir);
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(
      path.join(modDir, "module.json"),
      `${JSON.stringify({ id: "swagger-rich", version: "1.1.0" }, null, 2)}\n`,
      "utf8",
    );
    const proj = path.join(base, "app");
    writeFixture(proj, {
      meta: {
        applicationModules: [{ id: "swagger-rich", version: "1.1.0" }],
      },
    });

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runInspectCommand(
      ["--json", "--factory-root", base, "."],
      { cwd: proj },
    );
    expect(code).toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    const upgrade = payload.upgrade as Record<string, unknown>;
    const components = upgrade.components as { label: string; compare: string }[];
    const app = components.find((c) => c.label === "app:swagger-rich");
    expect(app?.compare).toBe("equal");
    spy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("sem --json imprime seções consolidadas", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-insp-hum-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeFixture(proj);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const code = await runInspectCommand(["--factory-root", base, "."], { cwd: proj });
    expect(code).toBe(0);
    const lines = logSpy.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes("[inspect] projeto:"))).toBe(true);
    expect(lines.some((l) => l.includes("--- Contract (doctor) ---"))).toBe(true);
    expect(lines.some((l) => l.includes("--- Template drift"))).toBe(true);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });
});
