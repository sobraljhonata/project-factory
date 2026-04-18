/**
 * Middlewares usados pelo `createApp` / `setupMiddlewares`.
 * JWT e papéis ficam em `@/lib/auth` (opcional), para o core não impor autenticação.
 */
import bodyParser from "./body-parser";
import contentType from "./content-type";
import cors from "./cors";
import setupErrorHandlers from "./error-handlers";
import { securityHeaders } from "./security-headers";
import { validateBody } from "./validate-body";
import { correlationIdMiddleware } from "./correlation-id";
import { forceHttpsRedirect } from "./force-https-redirect";

export {
  bodyParser,
  contentType,
  cors,
  validateBody,
  setupErrorHandlers,
  securityHeaders,
  correlationIdMiddleware,
  forceHttpsRedirect,
};