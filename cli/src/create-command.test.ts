import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { generateProject } from "./generate";
import { runCreateCommand, serializeCreateSuccessReport } from "./create-command";

describe("serializeCreateSuccessReport", () => {
  it("espelha metadata e nextSteps após generateProject", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-ser-"));
    const targetDir = path.join(tmp, "out");
    generateProject({
      targetDir,
      infra: [],
      vars: {
        PACKAGE_NAME: "meta-api",
        PROJECT_SLUG: "meta-api",
        API_TITLE: "Meta API",
        API_DESCRIPTION: "d",
        API_VERSION: "v1",
        APP_PORT: "3000",
        AWS_REGION: "us-east-1",
      },
    });

    const payload = serializeCreateSuccessReport({
      targetDir,
      projectDirArg: "out",
      packageName: "meta-api",
      title: "Meta API",
      infraIds: [],
      region: "us-east-1",
      preset: null,
    }) as Record<string, unknown>;

    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("create");
    expect(payload.template).toBe("api-node-express");
    expect(typeof payload.templateVersion).toBe("string");
    expect(typeof payload.generatorVersion).toBe("string");
    expect(payload.nextSteps).toEqual(["cd out", "npm install"]);

    errSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("runCreateCommand", () => {
  it("com --json sem --yes emite JSON de erro", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runCreateCommand(["my-api", "--json"]);
    expect(code).toBe(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "create",
      exitCode: 1,
      error: expect.stringContaining("--yes"),
    });
    spy.mockRestore();
  });

  it("com --yes --module copia módulos e metadata", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-mod-"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const code = await runCreateCommand(
      [
        "with-mod",
        "--yes",
        "--package-name",
        "with-mod",
        "--module",
        "swagger-rich",
      ],
      { cwd: base },
    );

    expect(code).toBe(0);
    const targetDir = path.join(base, "with-mod");
    expect(
      fs.existsSync(
        path.join(targetDir, "src/lib/project-factory-modules/swagger-rich/README.md"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          targetDir,
          "src/lib/project-factory-modules/swagger-rich/openapi.fragment.yaml",
        ),
      ),
    ).toBe(true);
    const raw = fs.readFileSync(path.join(targetDir, ".project-factory.json"), "utf8");
    const meta = JSON.parse(raw) as { applicationModules: { id: string; version: string }[] };
    expect(meta.applicationModules).toEqual([{ id: "swagger-rich", version: "1.1.0" }]);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("com --yes --module auth-jwt copia módulo e metadata", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-authjwt-"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const code = await runCreateCommand(
      [
        "jwt-mod",
        "--yes",
        "--package-name",
        "jwt-mod",
        "--module",
        "auth-jwt",
      ],
      { cwd: base },
    );

    expect(code).toBe(0);
    const targetDir = path.join(base, "jwt-mod");
    expect(
      fs.existsSync(
        path.join(targetDir, "src/lib/project-factory-modules/auth-jwt/jwt-verify-middleware.ts"),
      ),
    ).toBe(true);
    const raw = fs.readFileSync(path.join(targetDir, ".project-factory.json"), "utf8");
    const meta = JSON.parse(raw) as { applicationModules: { id: string; version: string }[] };
    expect(meta.applicationModules).toEqual([{ id: "auth-jwt", version: "1.0.0" }]);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("com --yes --module observability-basic copia módulo, metadata e costura em middlewares", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-obs-"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const code = await runCreateCommand(
      [
        "obs-app",
        "--yes",
        "--package-name",
        "obs-app",
        "--module",
        "observability-basic",
      ],
      { cwd: base },
    );

    expect(code).toBe(0);
    const targetDir = path.join(base, "obs-app");
    expect(
      fs.existsSync(
        path.join(targetDir, "src/lib/project-factory-modules/observability-basic/access-log-middleware.ts"),
      ),
    ).toBe(true);
    const mid = fs.readFileSync(path.join(targetDir, "src/core/config/middlewares.ts"), "utf8");
    expect(mid).toContain("registerHttpAccessLog");
    const raw = fs.readFileSync(path.join(targetDir, ".project-factory.json"), "utf8");
    const meta = JSON.parse(raw) as { applicationModules: { id: string; version: string }[] };
    expect(meta.applicationModules).toEqual([{ id: "observability-basic", version: "1.0.0" }]);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("com --yes --json e nome de pacote inválido emite JSON de erro", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-badpkg-"));
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runCreateCommand(
      ["out", "--yes", "--json", "--package-name", "NotKebabCase"],
      { cwd: base },
    );
    expect(code).toBe(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "create",
      exitCode: 1,
      error: expect.stringContaining("kebab-case"),
    });
    spy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("com --yes --json e flag inválida emite JSON de erro", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    const code = await runCreateCommand(["--yes", "--json", "--nope"]);
    expect(code).not.toBe(0);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toMatchObject({
      ok: false,
      command: "create",
      exitCode: expect.any(Number),
      error: expect.any(String),
    });
    spy.mockRestore();
  });

  it("com --yes --json gera projeto e inclui metadata + nextSteps", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-cli-"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const code = await runCreateCommand(
      [
        "generated-app",
        "--yes",
        "--json",
        "--package-name",
        "generated-app",
      ],
      { cwd: base },
    );

    expect(code).toBe(0);
    expect(logSpy).toHaveBeenCalled();
    const payload = JSON.parse(String(logSpy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload.ok).toBe(true);
    expect(payload.command).toBe("create");
    expect(payload.packageName).toBe("generated-app");
    expect(payload.projectDir).toBe("generated-app");
    expect(payload.template).toBe("api-node-express");
    expect(typeof payload.templateVersion).toBe("string");
    expect(typeof payload.generatorVersion).toBe("string");
    expect(payload.nextSteps).toEqual(["cd generated-app", "npm install"]);

    const targetDir = path.join(base, "generated-app");
    expect(fs.existsSync(path.join(targetDir, ".project-factory.json"))).toBe(true);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("sem --json mantém saída humana (próximos passos)", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pf-cr-human-"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const code = await runCreateCommand(
      ["human-app", "--yes", "--package-name", "human-app"],
      { cwd: base },
    );

    expect(code).toBe(0);
    const lines = logSpy.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes("Projeto gerado em:"))).toBe(true);
    expect(lines.some((l) => l.includes("Próximos passos:"))).toBe(true);
    expect(lines.some((l) => l.includes("cp .env.example .env"))).toBe(true);
    expect(lines.some((l) => l.includes("npm run check"))).toBe(true);

    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(base, { recursive: true, force: true });
  });
});
