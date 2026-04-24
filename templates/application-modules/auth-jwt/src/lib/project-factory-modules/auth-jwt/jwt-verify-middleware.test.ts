import jwt from "jsonwebtoken";
import {
  extractBearerToken,
  verifyBearerJwt,
} from "@/lib/project-factory-modules/auth-jwt/jwt-verify-middleware";

const SECRET = "0123456789abcdef0123456789abcdef";

describe("auth-jwt jwt-verify-middleware", () => {
  describe("extractBearerToken", () => {
    it("extrai token Bearer", () => {
      expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    });
    it("rejeita scheme errado", () => {
      expect(extractBearerToken("Basic xxx")).toBeNull();
    });
    it("rejeita ausente", () => {
      expect(extractBearerToken(undefined)).toBeNull();
    });
    it("rejeita formato com mais segmentos", () => {
      expect(extractBearerToken("Bearer a b")).toBeNull();
    });
  });

  describe("verifyBearerJwt", () => {
    it("aceita token válido HS256", () => {
      const tok = jwt.sign({ sub: "ext-1" }, SECRET, { algorithm: "HS256", expiresIn: "5m" });
      const p = verifyBearerJwt(tok, { secret: SECRET });
      expect(p.sub).toBe("ext-1");
    });

    it("rejeita assinatura inválida", () => {
      const tok = jwt.sign({ sub: "x" }, SECRET, { algorithm: "HS256", expiresIn: "5m" });
      expect(() => verifyBearerJwt(tok, { secret: `${SECRET}!` })).toThrow();
    });

    it("rejeita token expirado", () => {
      const tok = jwt.sign({ sub: "x" }, SECRET, {
        algorithm: "HS256",
        expiresIn: "-10s",
      });
      expect(() => verifyBearerJwt(tok, { secret: SECRET })).toThrow();
    });

    it("valida iss quando configurado", () => {
      const tok = jwt.sign(
        { sub: "x", iss: "https://issuer.example" },
        SECRET,
        { algorithm: "HS256", expiresIn: "5m" },
      );
      expect(() =>
        verifyBearerJwt(tok, {
          secret: SECRET,
          issuer: "https://other.example",
        }),
      ).toThrow();
      const p = verifyBearerJwt(tok, {
        secret: SECRET,
        issuer: "https://issuer.example",
      });
      expect(p.iss).toBe("https://issuer.example");
    });

    it("valida aud quando configurado", () => {
      const tok = jwt.sign(
        { sub: "x", aud: "my-api" },
        SECRET,
        { algorithm: "HS256", expiresIn: "5m" },
      );
      expect(() =>
        verifyBearerJwt(tok, {
          secret: SECRET,
          audience: "other",
        }),
      ).toThrow();
      const p = verifyBearerJwt(tok, {
        secret: SECRET,
        audience: "my-api",
      });
      expect(p.aud).toBe("my-api");
    });
  });
});
