// src/config/app.ts
import { setupErrorHandlers } from "@/core/http/middlewares";
import express, { Application } from "express";
import swaggerUi from "swagger-ui-express";
import { ENV } from "@/core/config/env";
import { loadSwaggerDocument } from "./swagger";
import setupMiddlewares from "@/core/config/middlewares";
import setupRoutes from "@/core/config/routes";
import { runReadinessCheck } from "@/core/config/readiness";
import { ensureCorrelationId } from "@/core/http/correlation";
import { forceHttpsRedirect } from "@/core/http/middlewares";

export const createApp = (): Application => {
  const app = express();

  if (ENV.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  if (ENV.FORCE_HTTPS_REDIRECT) {
    app.use(forceHttpsRedirect);
  }

  // Swagger opcional
  if (ENV.SWAGGER_ENABLED) {
    const swaggerDocument = loadSwaggerDocument();

    // Redireciona raiz para /api-docs
    app.get("/", (_req, res) => res.redirect("/api-docs"));
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } else {
    app.get("/", (_req, res) => res.status(204).end());
  }

  // Middlewares globais (incluindo CORS, JSON parser, security headers, etc.)
  setupMiddlewares(app);

  // Health/readiness após correlation-id (meta e header x-correlation-id)
  app.get("/health", (req, res) => {
    const correlationId = ensureCorrelationId(
      (req as { correlationId?: string }).correlationId,
    );
    res.status(200).json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      meta: { correlationId },
    });
  });

  app.get("/ready", async (req, res) => {
    const correlationId = ensureCorrelationId(
      (req as { correlationId?: string }).correlationId,
    );
    const result = await runReadinessCheck();
    if (result.ok) {
      res.status(200).json({
        status: "ready",
        dbChecked: result.dbChecked,
        meta: { correlationId },
      });
      return;
    }
    res.status(503).json({
      status: "not_ready",
      error: {
        code: "NOT_READY",
        message: result.message ?? "Serviço indisponível",
      },
      meta: { correlationId },
    });
  });

  // Rotas da aplicação
  setupRoutes(app);

  // Error handlers devem SEMPRE ser os últimos
  setupErrorHandlers(app);

  return app;
};

// compatibilidade com o que você já usa hoje (default import)
const app = createApp();
export default app;