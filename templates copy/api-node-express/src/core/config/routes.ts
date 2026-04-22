import { ENV } from "@/core/config/env";
import { Express, Router } from "express";

/**
 * Registro mínimo de rotas. Adicione módulos em `src/modules` e importe aqui.
 */
export default function setupRoutes(app: Express): void {
  const router = Router();
  app.use("/api", router);

  router.get(`/${ENV.API_VERSION}/ping`, (_req, res) => {
    res.status(200).json({
      data: { pong: true },
      meta: { version: ENV.API_VERSION },
    });
  });
}
