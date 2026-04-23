import fs from "node:fs";
import path from "node:path";

import { getTemplatesRoot, INFRA_LAYERS } from "./generate";

/**
 * Garante que todo id em `INFRA_LAYERS` corresponde a pasta + `template.json` sob `templates/`.
 * Evita regressão do tipo “preset aponta para camada inexistente”.
 */
describe("catálogo INFRA_LAYERS vs templates/", () => {
  const templatesRoot = getTemplatesRoot();

  it("templatesRoot existe", () => {
    expect(fs.existsSync(templatesRoot)).toBe(true);
  });

  for (const [layerId, { dir }] of Object.entries(INFRA_LAYERS)) {
    it(`${layerId} → ${dir}/template.json`, () => {
      const manifest = path.join(templatesRoot, dir, "template.json");
      expect(fs.existsSync(manifest)).toBe(true);
    });

    it(`${layerId} → ${dir}/README.md`, () => {
      const readme = path.join(templatesRoot, dir, "README.md");
      expect(fs.existsSync(readme)).toBe(true);
    });
  }
});
