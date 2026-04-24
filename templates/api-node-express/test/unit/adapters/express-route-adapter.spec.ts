import type { Request, Response } from "express";
import adaptRoute from "@/core/adapters/express-route-adapter";
import type { HttpRequest } from "@/core/protocols";

describe("express-route-adapter", () => {
  it("preenche safeHeaders e mantém headers cru", async () => {
    const handle = jest.fn().mockResolvedValue({
      statusCode: 200,
      body: { ok: true },
    });
    const controller = { handle };

    const req = {
      body: {},
      params: {},
      query: {},
      headers: {
        accept: "application/json",
        authorization: "Bearer token-secreto",
        "x-custom": "keep-only-in-raw",
      },
      correlationId: "cid-adapter",
    } as unknown as Request;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    const route = adaptRoute(controller);
    await route(req, res);

    expect(handle).toHaveBeenCalledTimes(1);
    const httpRequest = handle.mock.calls[0][0] as HttpRequest;

    expect(httpRequest.safeHeaders).toEqual({
      accept: "application/json",
      authorization: "Bearer <redacted>",
    });
    expect(httpRequest.headers).toBe(req.headers);
    expect(httpRequest.correlationId).toBe("cid-adapter");
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ ok: true });
  });

  it("204 não chama json", async () => {
    const handle = jest.fn().mockResolvedValue({ statusCode: 204, body: null });
    const send = jest.fn();
    const status = jest.fn().mockReturnValue({ send });
    const res = { status } as unknown as Response;

    const req = {
      body: {},
      params: {},
      query: {},
      headers: {},
    } as unknown as Request;

    await adaptRoute({ handle })(req, res);

    expect(send).toHaveBeenCalledWith();
    expect(status).toHaveBeenCalledWith(204);
  });
});
