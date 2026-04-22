import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  resolveTargetDir,
  validateAwsRegion,
  validatePackageNameForCli,
  validateProjectDirArg,
  validateTargetDirAvailable,
} from "./validate";

describe("validateAwsRegion", () => {
  it("aceita regiões no formato típico", () => {
    expect(() => validateAwsRegion("us-east-1")).not.toThrow();
    expect(() => validateAwsRegion("eu-central-1")).not.toThrow();
  });

  it("rejeita formato inválido ou comprimento fora do esperado", () => {
    expect(() => validateAwsRegion("us_east_1")).toThrow(/Região AWS inválida/);
    expect(() => validateAwsRegion("xx")).toThrow(/comprimento/);
  });
});

describe("validatePackageNameForCli", () => {
  it("aceita kebab-case", () => {
    expect(() => validatePackageNameForCli("smoke-e2e")).not.toThrow();
  });

  it("rejeita vazio e caracteres inválidos", () => {
    expect(() => validatePackageNameForCli("")).toThrow(/vazio/);
    expect(() => validatePackageNameForCli("My_App")).toThrow(/inválido/);
  });
});

describe("validateProjectDirArg", () => {
  const cwd = "/tmp/pf-test";

  it("rejeita vazio, . e ..", () => {
    expect(() => validateProjectDirArg(cwd, "")).toThrow();
    expect(() => validateProjectDirArg(cwd, ".")).toThrow();
    expect(() => validateProjectDirArg(cwd, "..")).toThrow();
  });

  it("rejeita segmentos .. em caminho relativo", () => {
    expect(() => validateProjectDirArg(cwd, "../out")).toThrow(/\.\./);
  });

  it("permite caminho absoluto", () => {
    expect(() => validateProjectDirArg(cwd, "/tmp/abs-app")).not.toThrow();
  });
});

describe("validateTargetDirAvailable", () => {
  it("falha se o diretório existe e não está vazio", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-val-"));
    fs.writeFileSync(path.join(base, "x.txt"), "x");
    expect(() => validateTargetDirAvailable(base)).toThrow(/não está vazio/);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("não falha para diretório inexistente ou vazio existente", () => {
    const missing = path.join(os.tmpdir(), `pf-missing-${Date.now()}`);
    expect(() => validateTargetDirAvailable(missing)).not.toThrow();

    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "pf-empty-"));
    expect(() => validateTargetDirAvailable(empty)).not.toThrow();
    fs.rmSync(empty, { recursive: true, force: true });
  });

  it("falha se o destino existe mas não é diretório", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-file-"));
    const asFile = path.join(base, "not-a-dir");
    fs.writeFileSync(asFile, "x");
    expect(() => validateTargetDirAvailable(asFile)).toThrow(/não é pasta/);
    fs.rmSync(base, { recursive: true, force: true });
  });
});

describe("resolveTargetDir", () => {
  it("resolve caminho relativo ao cwd", () => {
    expect(resolveTargetDir("/a/b", "api")).toBe(path.resolve("/a/b", "api"));
  });
});
