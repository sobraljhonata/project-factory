import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  APPLICATION_MODULES,
  type ApplicationModuleId,
} from "./app-modules-catalog";
import {
  analyzeUpgradeDryRun,
  compareSemver,
  computeBehindBump,
  findStackTemplateDir,
  riskForBehindBump,
  serializeUpgradeDryRunReport,
  upgradeDryRunExitCode,
  runUpgradeDryRunCommand,
} from "./upgrade-dry-run";

describe("computeBehindBump / riskForBehindBump", () => {
  it("major atrás → HIGH", () => {
    const b = computeBehindBump("1.0.0", "2.0.0");
    expect(b).toBe("major");
    expect(riskForBehindBump(b)).toBe("HIGH");
  });
  it("minor atrás → LOW", () => {
    const b = computeBehindBump("1.0.0", "1.1.0");
    expect(b).toBe("minor");
    expect(riskForBehindBump(b)).toBe("LOW");
  });
  it("patch atrás → LOW", () => {
    const b = computeBehindBump("1.0.0", "1.0.1");
    expect(b).toBe("patch");
    expect(riskForBehindBump(b)).toBe("LOW");
  });
});

describe("compareSemver", () => {
  it("equal", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe("equal");
  });
  it("behind on patch", () => {
    expect(compareSemver("1.0.0", "1.0.1")).toBe("behind");
  });
  it("behind on major", () => {
    expect(compareSemver("1.9.9", "2.0.0")).toBe("behind");
  });
  it("ahead", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBe("ahead");
  });
});

function writeTemplateJson(dir: string, id: string, version: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "template.json"),
    `${JSON.stringify({ id, version }, null, 2)}\n`,
    "utf8",
  );
}

function writeProjectMeta(
  dir: string,
  overrides: Partial<{
    template: string;
    templateVersion: string;
    infraTemplates: { id: string; version: string }[];
    applicationModules: { id: string; version: string }[];
  }> = {},
): void {
  const meta = {
    generator: "project-factory",
    generatorVersion: "0.1.0",
    template: "api-node-express",
    templateVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    infraTemplates: [] as { id: string; version: string }[],
    applicationModules: [] as { id: string; version: string }[],
    ...overrides,
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".project-factory.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
}

/** Metadata sem chave `applicationModules` (legado V3.0-). */
function writeProjectMetaLegacyWithoutApplicationModules(
  dir: string,
  overrides: Partial<{
    template: string;
    templateVersion: string;
    infraTemplates: { id: string; version: string }[];
  }> = {},
): void {
  const meta: Record<string, unknown> = {
    generator: "project-factory",
    generatorVersion: "0.1.0",
    template: "api-node-express",
    templateVersion: "1.0.0",
    generatedAt: "2026-01-01T00:00:00.000Z",
    infraTemplates: [] as { id: string; version: string }[],
    ...overrides,
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".project-factory.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
}

function writeFactoryAppModule(
  templatesRoot: string,
  moduleId: ApplicationModuleId,
  version: string,
): void {
  const dir = path.join(templatesRoot, APPLICATION_MODULES[moduleId].dir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "module.json"),
    `${JSON.stringify({ id: moduleId, version }, null, 2)}\n`,
    "utf8",
  );
}

describe("findStackTemplateDir", () => {
  it("encontra por nome de pasta", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-find-"));
    writeTemplateJson(path.join(root, "api-node-express"), "api-node-express", "9.0.0");
    expect(findStackTemplateDir(root, "api-node-express")).toBe(
      path.join(root, "api-node-express"),
    );
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("analyzeUpgradeDryRun", () => {
  it("reporta defasagem quando factory é mais novo", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-behind-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "2.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    expect(r.components).toHaveLength(1);
    expect(r.components[0].compare).toBe("behind");
    expect(r.components[0].behindBump).toBe("major");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("exit 0 quando alinhado", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-ok-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.2.3",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.2.3" });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(upgradeDryRunExitCode(r)).toBe(0);
    expect(r.components[0].compare).toBe("equal");
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("erro quando stack id não existe no factory", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-miss-"));
    const templatesRoot = path.join(base, "templates");
    fs.mkdirSync(path.join(templatesRoot, "api-node-express"), { recursive: true });
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { template: "outro-stack" });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("compara camada infra declarada", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-inf-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const infraDir = path.join(templatesRoot, "infra/aws/foundation");
    writeTemplateJson(infraDir, "foundation", "2.0.0");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      infraTemplates: [{ id: "foundation", version: "1.0.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    expect(r.components).toHaveLength(2);
    const infra = r.components.find((c) => c.label === "infra:foundation");
    expect(infra?.compare).toBe("behind");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("legado sem applicationModules no metadata equivale a []", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-legacy-appmod-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMetaLegacyWithoutApplicationModules(proj, { templateVersion: "1.0.0" });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    expect(r.components).toHaveLength(1);
    expect(r.components[0].label).toBe("stack:api-node-express");
    expect(upgradeDryRunExitCode(r)).toBe(0);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules alinhado com module.json do factory", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-appmod-ok-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "swagger-rich", "1.1.0");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "swagger-rich", version: "1.1.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:swagger-rich");
    expect(app?.compare).toBe("equal");
    expect(upgradeDryRunExitCode(r)).toBe(0);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules behind quando factory mais novo", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-appmod-beh-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "swagger-rich", "2.0.0");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "swagger-rich", version: "1.0.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:swagger-rich");
    expect(app?.compare).toBe("behind");
    expect(app?.behindBump).toBe("major");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules swagger-rich behind em MINOR quando factory 1.1.0 e projeto 1.0.0", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-appmod-minor-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "swagger-rich", "1.1.0");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "swagger-rich", version: "1.0.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:swagger-rich");
    expect(app?.compare).toBe("behind");
    expect(app?.behindBump).toBe("minor");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules observability-basic behind em PATCH quando factory 1.0.2 e projeto 1.0.1", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-obs-patch-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "observability-basic", "1.0.2");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "observability-basic", version: "1.0.1" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:observability-basic");
    expect(app?.compare).toBe("behind");
    expect(app?.behindBump).toBe("patch");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules rate-limit-basic behind em PATCH quando factory 1.0.2 e projeto 1.0.1", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-rl-patch-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "rate-limit-basic", "1.0.2");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "rate-limit-basic", version: "1.0.1" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:rate-limit-basic");
    expect(app?.compare).toBe("behind");
    expect(app?.behindBump).toBe("patch");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules auth-jwt behind em PATCH quando factory 1.0.1 e projeto 1.0.0", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-authjwt-patch-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "auth-jwt", "1.0.1");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "auth-jwt", version: "1.0.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors).toHaveLength(0);
    const app = r.components.find((c) => c.label === "app:auth-jwt");
    expect(app?.compare).toBe("behind");
    expect(app?.behindBump).toBe("patch");
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("applicationModules com id desconhecido → errors[] sem componente app", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-appmod-unk-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "not-in-catalog", version: "1.0.0" }],
    });

    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    expect(r.errors.some((e) => e.includes("not-in-catalog"))).toBe(true);
    expect(r.components.some((c) => c.label.startsWith("app:"))).toBe(false);
    expect(upgradeDryRunExitCode(r)).toBe(1);
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe("serializeUpgradeDryRunReport", () => {
  it("espelha exitCode e upgradeStatus para relatório alinhado", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-ser-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });
    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    const payload = serializeUpgradeDryRunReport(r) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.exitCode).toBe(0);
    expect(payload.upgradeStatus).toBe("UP_TO_DATE");
    expect(payload.command).toBe("upgrade-dry-run");
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("ok false e BEHIND quando factory está à frente", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-ser-beh-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "2.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });
    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    const payload = serializeUpgradeDryRunReport(r) as Record<string, unknown>;
    expect(payload.ok).toBe(false);
    expect(payload.exitCode).toBe(1);
    expect(payload.upgradeStatus).toBe("BEHIND");
    expect(payload.worstRisk).toBe("HIGH");
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("JSON inclui componente app:* quando há applicationModules", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-ser-app-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    writeFactoryAppModule(templatesRoot, "swagger-rich", "1.1.0");
    const proj = path.join(base, "app");
    writeProjectMeta(proj, {
      templateVersion: "1.0.0",
      applicationModules: [{ id: "swagger-rich", version: "1.1.0" }],
    });
    const r = analyzeUpgradeDryRun(proj, templatesRoot);
    const payload = serializeUpgradeDryRunReport(r) as Record<string, unknown>;
    const components = payload.components as { label: string; compare: string }[];
    expect(components.some((c) => c.label === "app:swagger-rich" && c.compare === "equal")).toBe(
      true,
    );
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe("runUpgradeDryRunCommand", () => {
  it("exige --dry-run", async () => {
    const code = await runUpgradeDryRunCommand([]);
    expect(code).not.toBe(0);
  });

  it("com --json sem --dry-run emite JSON de erro em stdout", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runUpgradeDryRunCommand(["--json"]);
    expect(code).not.toBe(0);
    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "upgrade-dry-run",
      exitCode: expect.any(Number),
      error: expect.any(String),
    });
    spy.mockRestore();
  });

  it("aceita --help", async () => {
    const code = await runUpgradeDryRunCommand(["--help"]);
    expect(code).toBe(0);
  });

  it("integra --factory-root e cwd do projeto", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-cli-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });

    const code = await runUpgradeDryRunCommand(
      ["--dry-run", "--factory-root", base, "."],
      { cwd: proj },
    );
    expect(code).toBe(0);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("'--dry-run' + '--json' alinhado emite ok true em stdout", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-cli-json-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "1.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runUpgradeDryRunCommand(
      ["--dry-run", "--json", "--factory-root", base, "."],
      { cwd: proj },
    );
    expect(code).toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.upgradeStatus).toBe("UP_TO_DATE");
    spy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("'--dry-run' + '--json' com defasagem emite ok false e BEHIND", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-up-cli-json-beh-"));
    const templatesRoot = path.join(base, "templates");
    writeTemplateJson(
      path.join(templatesRoot, "api-node-express"),
      "api-node-express",
      "2.0.0",
    );
    const proj = path.join(base, "app");
    writeProjectMeta(proj, { templateVersion: "1.0.0" });

    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runUpgradeDryRunCommand(
      ["--dry-run", "--json", "--factory-root", base, "."],
      { cwd: proj },
    );
    expect(code).toBe(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.ok).toBe(false);
    expect(payload.upgradeStatus).toBe("BEHIND");
    spy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });
});
