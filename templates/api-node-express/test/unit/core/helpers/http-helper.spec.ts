import {
  badRequest,
  forbidden,
  notFound,
  serverError,
  unAuthorized,
} from "@/core/helpers/http-helper";

describe("http-helper (envelope legacy)", () => {
  it("serverError devolve envelope 500 sem details", () => {
    const r = serverError(new Error("secret"), "abc");
    expect(r.statusCode).toBe(500);
    expect(r.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(r.body.meta.correlationId).toBe("abc");
    expect("details" in r.body.error).toBe(false);
  });

  it("badRequest inclui name do Error em details", () => {
    const e = new Error("oops");
    e.name = "CustomErr";
    const r = badRequest(e, "x");
    expect(r.statusCode).toBe(400);
    expect(r.body.error.message).toBe("oops");
    expect(r.body.error.details).toEqual({ name: "CustomErr" });
  });

  it("unAuthorized com string usa-a como message e details", () => {
    const r = unAuthorized("token inválido", "cid");
    expect(r.statusCode).toBe(401);
    expect(r.body.error.message).toBe("token inválido");
    expect(r.body.error.details).toBe("token inválido");
  });

  it("forbidden e notFound seguem o envelope", () => {
    const f = forbidden(undefined, "f");
    expect(f.body.error.code).toBe("FORBIDDEN");
    expect(f.body.meta.correlationId).toBe("f");

    const n = notFound("nada", "n");
    expect(n.body.error.code).toBe("NOT_FOUND");
    expect(n.body.error.message).toBe("nada");
    expect(n.body.meta.correlationId).toBe("n");
  });
});
