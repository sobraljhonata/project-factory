import type { JwtPayload } from "jsonwebtoken";

declare module "express-serve-static-core" {
  interface Request {
    /** Preenchido pelo middleware Bearer JWT (módulo opcional `auth-jwt`). */
    auth?: { payload: JwtPayload };
  }
}

export {};
