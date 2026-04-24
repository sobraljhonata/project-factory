import fs from "node:fs";
import path from "node:path";
import { Express } from "express";
import { ENV, isProjectFactoryAuthJwtModuleInstalled } from "@/core/config/env";
import {
  securityHeaders,
  cors,
  bodyParser,
  contentType,
  correlationIdMiddleware,
} from "@/core/http/middlewares";

function isProjectFactoryObservabilityBasicModuleInstalled(): boolean {
  const base = path.join(
    __dirname,
    "..",
    "..",
    "lib",
    "project-factory-modules",
    "observability-basic",
    "access-log-middleware",
  );
  return fs.existsSync(`${base}.js`) || fs.existsSync(`${base}.ts`);
}

export default (app: Express): void => {
  // Ordem importa:
  // 1) Segurança básica
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use(correlationIdMiddleware);

  // 1b) Módulo opcional observability-basic (V3.4): access log HTTP estruturado
  if (isProjectFactoryObservabilityBasicModuleInstalled()) {
    const modPath = path.join(
      __dirname,
      "..",
      "..",
      "lib",
      "project-factory-modules",
      "observability-basic",
      "access-log-middleware",
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- módulo opcional copiado para src/lib/…
    const { registerHttpAccessLog } = require(modPath) as {
      registerHttpAccessLog: (a: Express) => void;
    };
    registerHttpAccessLog(app);
  }

  // 2) CORS antes dos parsers (para OPTIONS retornar rápido)
  app.use(cors);

  // 3) Body parsers
  app.use(...bodyParser);

  // 4) Content-Type default (sem atrapalhar downloads)
  app.use(contentType);

  // 5) Módulo opcional auth-jwt (V3.3): verificação Bearer JWT se os ficheiros existirem
  if (isProjectFactoryAuthJwtModuleInstalled()) {
    const modPath = path.join(
      __dirname,
      "..",
      "..",
      "lib",
      "project-factory-modules",
      "auth-jwt",
      "jwt-verify-middleware",
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- módulo opcional copiado para src/lib/…
    const { registerBearerJwtVerify } = require(modPath) as {
      registerBearerJwtVerify: (a: Express, e: typeof ENV) => void;
    };
    registerBearerJwtVerify(app, ENV);
  }
};