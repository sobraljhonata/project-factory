// src/core/config/initializeDatabaseAndServer.ts
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Sequelize } from "sequelize";
import fg from "fast-glob";

import { ENV } from "./env";
import { logger } from "./logger";
import { resolveRuntimePath } from "./paths";

type WalkOptions = {
  exts: string[];
  match: (fullPath: string) => boolean;
};

export type InitializeDbDeps = {
  env?: typeof ENV;
  log?: typeof logger;
  resolveRuntimePath?: (relativeFromSrc: string) => string;

  // caso queira manter o seu walkDir existente
  walkDir?: (root: string, opts: WalkOptions) => string[];

  // opcional: usar fast-glob (preferível p/ módulos)
  glob?: (pattern: string | string[], opts: fg.Options) => Promise<string[]>;

  importer?: (fullPath: string) => Promise<any>;
};

async function defaultImportModule(fullPath: string) {
  try {
    // ts-node/commonjs friendly
    return await import(fullPath);
  } catch {
    // esm fallback
    return await import(pathToFileURL(fullPath).href);
  }
}

/**
 * Implementação padrão de walkDir (mantive em for por performance/legibilidade).
 * Se você já tem um walkDir “padrão do projeto”, injete via deps.walkDir.
 */
function defaultWalkDir(root: string, opts: WalkOptions, acc: string[] = []): string[] {
  const fs = require("node:fs") as typeof import("node:fs");

  if (!fs.existsSync(root)) return acc;

  const entries = fs.readdirSync(root, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(root, e.name);

    if (e.isDirectory()) {
      defaultWalkDir(full, opts, acc);
      continue;
    }

    if (!opts.exts.some((ext) => full.endsWith(ext))) continue;
    if (!opts.match(full)) continue;

    acc.push(full);
  }

  return acc;
}

export async function initializeDatabaseAndServer(
  sequelize: Sequelize,
  deps: InitializeDbDeps = {}
) {
  const env = deps.env ?? ENV;
  const log = deps.log ?? logger;
  const resolvePath = deps.resolveRuntimePath ?? resolveRuntimePath;
  const importer = deps.importer ?? defaultImportModule;
  const walkDir = deps.walkDir ?? ((root, opts) => defaultWalkDir(root, opts));
  const glob = deps.glob ?? fg;

  if (!env.UPDATE_MODEL) {
    log.info("DB init skipped because ENV.UPDATE_MODEL is disabled");
    return;
  }

  try {
    // base da runtime (dist/ quando compilado, src/ quando ts-node)
    // resolveRuntimePath("modules") deve devolver:
    // - dist/modules (prod) ou src/modules (dev)
    const modulesDir = resolvePath("modules");

    const exts = env.NODE_ENV === "production" ? [".js"] : [".ts", ".js"];

    // ✅ preferível: glob direto no padrão do módulo
    // pega APENAS models dentro de infra/model
    const patterns = exts.map(
      (ext) => `**/infra/model/**/*-model${ext}`
    );

    const modelFullPaths = await glob(patterns, {
      cwd: modulesDir,
      absolute: true,
      onlyFiles: true,
      unique: true,
      dot: false,
    });

    // fallback opcional: se quiser manter walkDir por padrão (não obrigatório)
    // const modelFullPaths = walkDir(modulesDir, {
    //   exts,
    //   match: (fullPath) =>
    //     fullPath.includes(`${path.sep}infra${path.sep}model${path.sep}`) &&
    //     /-model\.(ts|js)$/.test(fullPath),
    // });

    log.info("Loading Sequelize models from modules", {
      modulesDir,
      count: modelFullPaths.length,
    });

    const db: Record<string, any> = { sequelize, Sequelize };

    for (const fullPath of modelFullPaths) {
      log.info(`Importing model from ${fullPath}`);
      const mod = await importer(fullPath);
      const model = mod.default ?? mod;

      const fileName = path.basename(fullPath);
      const modelName = fileName.replace(/-model\.(ts|js)$/, "");

      db[modelName] = model;
    }

    // associações (se existir)
    Object.values(db).forEach((m: any) => {
      if (m && typeof m.associate === "function") m.associate(db);
    });

    await sequelize.authenticate();
    log.info("DB connection established");

    const syncOptions =
      env.NODE_ENV === "production"
        ? {}
        : env.NODE_ENV === "test"
          ? { force: true }
          : { alter: true };

    await sequelize.sync(syncOptions);
    log.info("Database schema synchronized", { syncOptions });
  } catch (err) {
    log.error("Error during DB initialization", {
      error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    throw err;
  }
}
