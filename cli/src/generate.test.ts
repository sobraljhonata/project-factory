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
    };
    expect(meta.generator).toBe(PROJECT_FACTORY_PRODUCT_NAME);
    expect(meta.generatorVersion).toBeTruthy();
    expect(meta.template).toBe("api-node-express");
    expect(meta.templateVersion).toBe("1.0.0");
    expect(meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(meta.infraTemplates).toEqual([]);
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
    };
    expect(meta.infraTemplates).toEqual([{ id: "s3", version: "1.0.0" }]);
    expect(fs.existsSync(path.join(targetDir, "template.json"))).toBe(false);
    expect(
      fs.existsSync(path.join(targetDir, "infra/aws/s3-phase1/template.json")),
    ).toBe(false);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
