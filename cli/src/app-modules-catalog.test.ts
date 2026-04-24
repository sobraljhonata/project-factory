import fs from "node:fs";
import path from "node:path";

import { APPLICATION_MODULES } from "./app-modules-catalog";
import { getTemplatesRoot } from "./generate";

describe("catálogo APPLICATION_MODULES vs templates/", () => {
  const templatesRoot = getTemplatesRoot();

  it("templatesRoot existe", () => {
    expect(fs.existsSync(templatesRoot)).toBe(true);
  });

  for (const [moduleId, { dir }] of Object.entries(APPLICATION_MODULES)) {
    it(`${moduleId} → ${dir}/module.json`, () => {
      const manifest = path.join(templatesRoot, dir, "module.json");
      expect(fs.existsSync(manifest)).toBe(true);
    });

    it(`${moduleId} inclui README do módulo sob src/lib/project-factory-modules/`, () => {
      const readme = path.join(
        templatesRoot,
        dir,
        "src",
        "lib",
        "project-factory-modules",
        moduleId,
        "README.md",
      );
      expect(fs.existsSync(readme)).toBe(true);
    });

    if (moduleId === "swagger-rich") {
      it(`${moduleId} inclui openapi.fragment.yaml (V3.2)`, () => {
        const frag = path.join(
          templatesRoot,
          dir,
          "src",
          "lib",
          "project-factory-modules",
          moduleId,
          "openapi.fragment.yaml",
        );
        expect(fs.existsSync(frag)).toBe(true);
      });
    }

    if (moduleId === "auth-jwt") {
      it(`${moduleId} inclui jwt-verify-middleware.ts (V3.3)`, () => {
        const p = path.join(
          templatesRoot,
          dir,
          "src",
          "lib",
          "project-factory-modules",
          moduleId,
          "jwt-verify-middleware.ts",
        );
        expect(fs.existsSync(p)).toBe(true);
      });
    }

    if (moduleId === "observability-basic") {
      it(`${moduleId} inclui access-log-middleware.ts (V3.4)`, () => {
        const p = path.join(
          templatesRoot,
          dir,
          "src",
          "lib",
          "project-factory-modules",
          moduleId,
          "access-log-middleware.ts",
        );
        expect(fs.existsSync(p)).toBe(true);
      });
    }
  }
});
