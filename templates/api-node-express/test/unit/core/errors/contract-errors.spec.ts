import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/core/errors/contract-errors";
import { unAuthorizedError } from "@/core/errors/unauthorized-error";
import { mapErrorToHttpResponse } from "@/core/http/http-error-response";

describe("contract-errors + mapErrorToHttpResponse", () => {
  it("UnauthorizedError → 401", () => {
    const res = mapErrorToHttpResponse(new UnauthorizedError("x"), "cid-test");
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("x");
    expect(res.body.meta?.correlationId).toBe("cid-test");
    expect("details" in res.body.error).toBe(false);
  });

  it("ForbiddenError → 403", () => {
    const res = mapErrorToHttpResponse(new ForbiddenError("f"), "c");
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("NotFoundError → 404", () => {
    const res = mapErrorToHttpResponse(new NotFoundError("n"), "c");
    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("ConflictError → 409", () => {
    const res = mapErrorToHttpResponse(new ConflictError(), "c");
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("ValidationError → 400 com details opcionais", () => {
    const err = new ValidationError("bad", { field: "id" });
    const res = mapErrorToHttpResponse(err, "c1");
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual({ field: "id" });
  });

  it("unAuthorizedError (legado) mapeia como 401 UNAUTHORIZED", () => {
    const err = new unAuthorizedError();
    expect(err).toBeInstanceOf(UnauthorizedError);
    const res = mapErrorToHttpResponse(err, "c2");
    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Verifique os dados de login.");
  });
});
