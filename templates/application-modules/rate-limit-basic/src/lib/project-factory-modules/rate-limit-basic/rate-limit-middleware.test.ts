import type { Request, Response } from "express";
import {
  createRateLimitMiddleware,
  DEFAULT_RATE_LIMIT_BASIC_CONFIG,
} from "@/lib/project-factory-modules/rate-limit-basic/rate-limit-middleware";

function mockRes() {
  const o = {
    statusCode: 200,
    _json: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      o.headers[name] = value;
    },
    status(code: number) {
      o.statusCode = code;
      return o;
    },
    json(data: unknown) {
      o._json = data;
      return o;
    },
  };
  return o as unknown as Response & { _json: unknown; headers: Record<string, string> };
}

function reqFor(method: string, path: string, ip: string, correlationId = "c-1"): Request {
  return {
    method,
    path,
    ip,
    socket: { remoteAddress: ip },
    correlationId,
  } as unknown as Request;
}

describe("rate-limit-basic rate-limit-middleware", () => {
  const tight = {
    windowMs: 60_000,
    maxRequests: 3,
    maxKeys: 100,
  };

  it("permite pedidos até maxRequests e define RateLimit-Limit / Remaining / Reset", () => {
    const mw = createRateLimitMiddleware(tight);
    const r = reqFor("GET", "/api/x", "10.0.0.1");

    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      const next = jest.fn();
      mw(r, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.statusCode).toBe(200);
      expect(res.headers["RateLimit-Limit"]).toBe("3");
      expect(res.headers["RateLimit-Remaining"]).toBe(String(3 - (i + 1)));
      expect(res.headers["RateLimit-Reset"]).toMatch(/^\d+$/);
      expect(Number(res.headers["RateLimit-Reset"])).toBeGreaterThanOrEqual(0);
    }
  });

  it("no pedido acima do limite devolve 429, JSON padronizado e Retry-After", () => {
    const mw = createRateLimitMiddleware(tight);
    const r = reqFor("GET", "/api/x", "10.0.0.2");

    for (let i = 0; i < 3; i++) {
      mw(r, mockRes(), jest.fn());
    }

    const res = mockRes();
    const next = jest.fn();
    mw(r, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toMatch(/^\d+$/);
    expect(Number(res.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
    expect(res.headers["RateLimit-Limit"]).toBe("3");
    expect(res.headers["RateLimit-Remaining"]).toBe("0");
    expect(res.headers["RateLimit-Reset"]).toMatch(/^\d+$/);
    expect(res._json).toMatchObject({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: expect.any(String),
      },
      meta: { correlationId: "c-1" },
    });
  });

  it("bypass /health, /ready, /ping e OPTIONS sem contar", () => {
    const mw = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
      maxKeys: 10,
    });
    const ip = "10.0.0.9";

    for (const path of ["/health", "/ready", "/ping", "/v1/ping"] as const) {
      const res = mockRes();
      const next = jest.fn();
      mw(reqFor("GET", path, ip), res, next);
      expect(next).toHaveBeenCalled();
    }

    const opt = mockRes();
    const nextOpt = jest.fn();
    mw(reqFor("OPTIONS", "/api/r", ip), opt, nextOpt);
    expect(nextOpt).toHaveBeenCalled();

    const res = mockRes();
    const next = jest.fn();
    mw(reqFor("GET", "/counted", ip), res, next);
    expect(next).toHaveBeenCalled();
    mw(reqFor("GET", "/counted", ip), mockRes(), jest.fn());
    const res429 = mockRes();
    mw(reqFor("GET", "/counted", ip), res429, jest.fn());
    expect(res429.statusCode).toBe(429);
  });

  it("eviction FIFO quando maxKeys é atingido (chaves novas)", () => {
    const mw = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 5,
      maxKeys: 2,
    });

    mw(reqFor("GET", "/a", "ip-a"), mockRes(), jest.fn());
    mw(reqFor("GET", "/a", "ip-b"), mockRes(), jest.fn());
    mw(reqFor("GET", "/a", "ip-c"), mockRes(), jest.fn());

    const resA = mockRes();
    mw(reqFor("GET", "/a", "ip-a"), resA, jest.fn());
    expect(resA.headers["RateLimit-Limit"]).toBe("5");
    expect(resA.headers["RateLimit-Remaining"]).toBe("4");
  });

  it("DEFAULT_RATE_LIMIT_BASIC_CONFIG tem valores positivos", () => {
    expect(DEFAULT_RATE_LIMIT_BASIC_CONFIG.windowMs).toBeGreaterThan(0);
    expect(DEFAULT_RATE_LIMIT_BASIC_CONFIG.maxRequests).toBeGreaterThan(0);
    expect(DEFAULT_RATE_LIMIT_BASIC_CONFIG.maxKeys).toBeGreaterThan(0);
  });

  it("reinicia contagem após nova janela temporal (Date.now)", () => {
    let now = 0;
    const spy = jest.spyOn(Date, "now").mockImplementation(() => now);

    try {
      const mw = createRateLimitMiddleware({
        windowMs: 10_000,
        maxRequests: 2,
        maxKeys: 50,
      });
      const r = reqFor("GET", "/api/w", "10.0.0.88");

      mw(r, mockRes(), jest.fn());
      mw(r, mockRes(), jest.fn());
      const res429 = mockRes();
      mw(r, res429, jest.fn());
      expect(res429.statusCode).toBe(429);

      now = 10_000;
      const resOk = mockRes();
      const next = jest.fn();
      mw(r, resOk, next);
      expect(next).toHaveBeenCalled();
      expect(resOk.headers["RateLimit-Remaining"]).toBe("1");
    } finally {
      spy.mockRestore();
    }
  });

  it("agrupa pedidos sem IP em __unknown__", () => {
    const mw = createRateLimitMiddleware({
      windowMs: 60_000,
      maxRequests: 1,
      maxKeys: 10,
    });
    const r1 = { method: "GET", path: "/z", correlationId: "u1" } as unknown as Request;
    const r2 = { method: "GET", path: "/z", correlationId: "u2" } as unknown as Request;

    mw(r1, mockRes(), jest.fn());
    const res2 = mockRes();
    mw(r2, res2, jest.fn());
    expect(res2.statusCode).toBe(429);
  });

  it("vários 429 consecutivos não chamam next e mantêm cabeçalhos", () => {
    const mw = createRateLimitMiddleware(tight);
    const r = reqFor("GET", "/api/x", "10.0.0.77");

    for (let i = 0; i < 3; i++) {
      mw(r, mockRes(), jest.fn());
    }

    for (let k = 0; k < 5; k++) {
      const res = mockRes();
      const next = jest.fn();
      mw(r, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(429);
      expect(res.headers["RateLimit-Limit"]).toBe("3");
      expect(res.headers["RateLimit-Remaining"]).toBe("0");
      expect(res.headers["Retry-After"]).toMatch(/^\d+$/);
      expect(res.headers["RateLimit-Reset"]).toMatch(/^\d+$/);
    }
  });
});
