/**
 * Valida artefatos esperados após `npm run build` (Fase 1 — deploy Fargate / release).
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const dist = path.join(ROOT, "dist");

function mustExist(rel, hint) {
  const p = path.join(dist, ...rel.split("/"));
  if (!fs.existsSync(p)) {
    console.error(`verify:dist: ausente: ${rel}${hint ? ` — ${hint}` : ""}`);
    process.exit(1);
  }
}

mustExist("server.js", "entrypoint de produção");
mustExist(
  "core/docs/swagger/base.yaml",
  "Swagger deve ser copiado por copy:src/core/docs",
);

console.log("verify:dist: OK");
