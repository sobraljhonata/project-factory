import merge from "deepmerge";
import path from "path";
import YAML from "yamljs";

const swaggerPath = (...segments: string[]) =>
  path.resolve(__dirname, "..", "docs", "swagger", ...segments);

export function loadSwaggerDocument() {
  const base = YAML.load(swaggerPath("base.yaml"));
  return merge.all([base]);
}
