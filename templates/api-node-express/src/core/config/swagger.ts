import fs from "node:fs";
import merge from "deepmerge";
import path from "path";
import YAML from "yamljs";

const swaggerPath = (...segments: string[]) =>
  path.resolve(__dirname, "..", "docs", "swagger", ...segments);

/** Módulo opcional `swagger-rich` (V3.2): merge só se o ficheiro existir após `create --module`. */
const swaggerRichFragmentPath = (): string =>
  path.resolve(
    __dirname,
    "..",
    "..",
    "lib",
    "project-factory-modules",
    "swagger-rich",
    "openapi.fragment.yaml",
  );

export function loadSwaggerDocument() {
  const base = YAML.load(swaggerPath("base.yaml")) as Record<string, unknown>;
  const sources: Record<string, unknown>[] = [base];
  const rich = swaggerRichFragmentPath();
  if (fs.existsSync(rich)) {
    sources.push(YAML.load(rich) as Record<string, unknown>);
  }
  return merge.all(sources);
}
