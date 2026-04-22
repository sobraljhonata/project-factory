import { Express } from "express";
import {
  securityHeaders,
  cors,
  bodyParser,
  contentType,
  correlationIdMiddleware,
} from "@/core/http/middlewares";

export default (app: Express): void => {
  // Ordem importa:
  // 1) Segurança básica
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use(correlationIdMiddleware);

  // 2) CORS antes dos parsers (para OPTIONS retornar rápido)
  app.use(cors);

  // 3) Body parsers
  app.use(...bodyParser);

  // 4) Content-Type default (sem atrapalhar downloads)
  app.use(contentType);
};