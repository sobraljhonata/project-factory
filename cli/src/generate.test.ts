import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  applyTokens,
  assertNoUnresolvedPlaceholders,
  findFilesWithUnresolvedPlaceholders,
  generateProject,
  PROJECT_FACTORY_PRODUCT_NAME,
  readGeneratorInfo,
  readTemplateManifest,
} from "./generate";

describe("applyTokens", () => {
  it("substitui {{KEY}} em arquivo texto", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-gen-"));
    const f = path.join(dir, "x.txt");
    fs.writeFileSync(f, "name={{PACKAGE_NAME}}\n", "utf8");
    applyTokens(dir, { PACKAGE_NAME: "my-api" });
    expect(fs.readFileSync(f, "utf8")).toBe("name=my-api\n");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("placeholders", () => {
  it("assertNoUnresolvedPlaceholders falha quando sobra {{TOKEN}}", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-ph-"));
    fs.writeFileSync(path.join(dir, "bad.txt"), "x={{FOO}}\n", "utf8");
    expect(() => assertNoUnresolvedPlaceholders(dir)).toThrow(
      /Placeholders não substituídos/,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("findFilesWithUnresolvedPlaceholders lista arquivos ofensores", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-ph2-"));
    fs.writeFileSync(path.join(dir, "ok.txt"), "plain", "utf8");
    fs.writeFileSync(path.join(dir, "bad.txt"), "{{BAR}}", "utf8");
    const bad = findFilesWithUnresolvedPlaceholders(dir);
    expect(bad.some((p) => p.endsWith("bad.txt"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("readTemplateManifest", () => {
  it("valida id esperado e semver", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-tpl-"));
    fs.writeFileSync(
      path.join(dir, "template.json"),
      JSON.stringify({ id: "x", version: "1.0.0" }),
      "utf8",
    );
    expect(readTemplateManifest(dir, "x")).toEqual({ id: "x", version: "1.0.0" });
    expect(() => readTemplateManifest(dir, "y")).toThrow(/esperado/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejeita versão que não é semver MAJOR.MINOR.PATCH", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-tpl2-"));
    fs.writeFileSync(
      path.join(dir, "template.json"),
      JSON.stringify({ id: "x", version: "1.0" }),
      "utf8",
    );
    expect(() => readTemplateManifest(dir, "x")).toThrow(/versão de template inválida/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("generateProject (integração leve)", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("gera .project-factory.json com generator, template, templateVersion e infraTemplates", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-full-"));
    const targetDir = path.join(tmp, "out");
    generateProject({
      targetDir,
      infra: [],
      vars: {
        PACKAGE_NAME: "contract-test",
        PROJECT_SLUG: "contract-test",
        API_TITLE: "Contract Test",
        API_DESCRIPTION: "desc",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const metaPath = path.join(targetDir, ".project-factory.json");
    expect(fs.existsSync(metaPath)).toBe(true);
    const raw = fs.readFileSync(metaPath, "utf8");
    const meta = JSON.parse(raw) as {
      generator: string;
      generatorVersion: string;
      template: string;
      templateVersion: string;
      generatedAt: string;
      infraTemplates: { id: string; version: string }[];
      applicationModules: { id: string; version: string }[];
    };
    expect(meta.generator).toBe(PROJECT_FACTORY_PRODUCT_NAME);
    expect(meta.generatorVersion).toBeTruthy();
    expect(meta.template).toBe("api-node-express");
    expect(meta.templateVersion).toBe("1.0.2");
    expect(meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(meta.infraTemplates).toEqual([]);
    expect(meta.applicationModules).toEqual([]);
    const info = readGeneratorInfo();
    expect(meta.generatorVersion).toBe(info.version);
    expect(findFilesWithUnresolvedPlaceholders(targetDir)).toEqual([]);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("registra infraTemplates quando uma camada é selecionada", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-infra-meta-"));
    const targetDir = path.join(tmp, "out");
    generateProject({
      targetDir,
      infra: ["s3"],
      vars: {
        PACKAGE_NAME: "with-infra",
        PROJECT_SLUG: "with-infra",
        API_TITLE: "With Infra",
        API_DESCRIPTION: "desc",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const raw = fs.readFileSync(
      path.join(targetDir, ".project-factory.json"),
      "utf8",
    );
    const meta = JSON.parse(raw) as {
      infraTemplates: { id: string; version: string }[];
      applicationModules: { id: string; version: string }[];
    };
    expect(meta.infraTemplates).toEqual([{ id: "s3", version: "1.0.0" }]);
    expect(meta.applicationModules).toEqual([]);
    expect(fs.existsSync(path.join(targetDir, "template.json"))).toBe(false);
    expect(
      fs.existsSync(path.join(targetDir, "infra/aws/s3-phase1/template.json")),
    ).toBe(false);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("copia módulos opcionais e grava applicationModules no metadata", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-app-mod-"));
    const targetDir = path.join(tmp, "out");
    generateProject({
      targetDir,
      infra: [],
      appModules: ["swagger-rich", "observability-basic"],
      vars: {
        PACKAGE_NAME: "mod-app",
        PROJECT_SLUG: "mod-app",
        API_TITLE: "Mod App",
        API_DESCRIPTION: "desc",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const swaggerFrag = path.join(
      targetDir,
      "src/lib/project-factory-modules/swagger-rich/openapi.fragment.yaml",
    );
    expect(fs.existsSync(swaggerFrag)).toBe(true);
    expect(fs.readFileSync(swaggerFrag, "utf8")).toContain("StandardBadRequest");
    expect(
      fs.existsSync(
        path.join(targetDir, "src/lib/project-factory-modules/swagger-rich/README.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          targetDir,
          "src/lib/project-factory-modules/observability-basic/README.md",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          targetDir,
          "src/lib/project-factory-modules/observability-basic/access-log-middleware.ts",
        ),
      ),
    ).toBe(true);
    const midObs = fs.readFileSync(
      path.join(targetDir, "src/core/config/middlewares.ts"),
      "utf8",
    );
    expect(midObs).toContain("observability-basic");
    expect(midObs).toContain("registerHttpAccessLog");
    expect(fs.existsSync(path.join(targetDir, "module.json"))).toBe(false);

    const raw = fs.readFileSync(path.join(targetDir, ".project-factory.json"), "utf8");
    const meta = JSON.parse(raw) as {
      applicationModules: { id: string; version: string }[];
    };
    expect(meta.applicationModules).toEqual([
      { id: "swagger-rich", version: "1.1.0" },
      { id: "observability-basic", version: "1.0.1" },
    ]);

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("sem módulos não copia openapi.fragment e swagger.ts mantém merge opcional", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-app-no-mod-"));
    const targetDir = path.join(tmp, "bare");
    generateProject({
      targetDir,
      infra: [],
      vars: {
        PACKAGE_NAME: "bare",
        PROJECT_SLUG: "bare",
        API_TITLE: "Bare",
        API_DESCRIPTION: "d",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const frag = path.join(
      targetDir,
      "src/lib/project-factory-modules/swagger-rich/openapi.fragment.yaml",
    );
    expect(fs.existsSync(frag)).toBe(false);

    const swaggerTs = fs.readFileSync(
      path.join(targetDir, "src/core/config/swagger.ts"),
      "utf8",
    );
    expect(swaggerTs).toContain("fs.existsSync");
    expect(swaggerTs).toContain("openapi.fragment.yaml");
    expect(swaggerTs).toContain("swagger-rich");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("copia auth-jwt e inclui costura em env e middlewares", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-app-authjwt-"));
    const targetDir = path.join(tmp, "jwt-app");
    generateProject({
      targetDir,
      infra: [],
      appModules: ["auth-jwt"],
      vars: {
        PACKAGE_NAME: "jwt-app",
        PROJECT_SLUG: "jwt-app",
        API_TITLE: "JWT App",
        API_DESCRIPTION: "desc",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const mw = path.join(
      targetDir,
      "src/lib/project-factory-modules/auth-jwt/jwt-verify-middleware.ts",
    );
    expect(fs.existsSync(mw)).toBe(true);
    expect(fs.readFileSync(mw, "utf8")).toContain("algorithms: ALLOWED_ALGORITHMS");
    expect(fs.existsSync(path.join(targetDir, "src/lib/project-factory-modules/auth-jwt/README.md"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(targetDir, "src/lib/project-factory-modules/auth-jwt/.env.example"))).toBe(
      true,
    );

    const envTs = fs.readFileSync(path.join(targetDir, "src/core/config/env.ts"), "utf8");
    expect(envTs).toContain("isProjectFactoryAuthJwtModuleInstalled");
    expect(envTs).toContain("JWT_ISSUER");

    const midTs = fs.readFileSync(path.join(targetDir, "src/core/config/middlewares.ts"), "utf8");
    expect(midTs).toContain("registerBearerJwtVerify");
    expect(midTs).toContain("auth-jwt");

    const raw = fs.readFileSync(path.join(targetDir, ".project-factory.json"), "utf8");
    const meta = JSON.parse(raw) as { applicationModules: { id: string; version: string }[] };
    expect(meta.applicationModules).toEqual([{ id: "auth-jwt", version: "1.0.0" }]);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
