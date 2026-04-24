import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import { httpAccessLogMiddleware } from "@/lib/project-factory-modules/observability-basic/access-log-middleware";
import { logger } from "@/core/config/logger";

jest.mock("@/core/config/logger", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    database: jest.fn(),
  },
}));

const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("observability-basic access-log-middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("em finish chama logger.info com durationMs, correlationId e event http_access", () => {
    const req = {
      method: "GET",
      path: "/api/v1/widgets",
      correlationId: "corr-test-1",
    } as unknown as Request;

    const res = new EventEmitter() as Response & EventEmitter;
    res.statusCode = 200;

    const next = jest.fn();
    httpAccessLogMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    res.emit("finish");

    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.debug).not.toHaveBeenCalled();
    const [, meta] = mockedLogger.info.mock.calls[0];
    expect(meta).toMatchObject({
      event: "http_access",
      method: "GET",
      path: "/api/v1/widgets",
      statusCode: 200,
      correlationId: "corr-test-1",
    });
    expect(meta).not.toHaveProperty("pathTruncated");
    expect(typeof meta?.durationMs).toBe("number");
    expect((meta?.durationMs as number) >= 0).toBe(true);
  });

  it("com statusCode 500 regista info com status 500", () => {
    const req = {
      method: "POST",
      path: "/api/v1/action",
      correlationId: "c-500",
    } as unknown as Request;

    const res = new EventEmitter() as Response & EventEmitter;
    res.statusCode = 500;

    httpAccessLogMiddleware(req, res, jest.fn());
    res.emit("finish");

    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    const [, meta] = mockedLogger.info.mock.calls[0];
    expect(meta).toMatchObject({
      event: "http_access",
      method: "POST",
      path: "/api/v1/action",
      statusCode: 500,
      correlationId: "c-500",
    });
  });

  it("trunca path acima de 512 chars e define pathTruncated", () => {
    const longPath = `/${"a".repeat(512)}`;
    expect(longPath.length).toBe(513);

    const req = {
      method: "GET",
      path: longPath,
      correlationId: "c-long",
    } as unknown as Request;

    const res = new EventEmitter() as Response & EventEmitter;
    res.statusCode = 200;

    httpAccessLogMiddleware(req, res, jest.fn());
    res.emit("finish");

    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    const [, meta] = mockedLogger.info.mock.calls[0];
    expect((meta?.path as string).length).toBe(512);
    expect(meta?.pathTruncated).toBe(true);
    expect(meta).toMatchObject({
      event: "http_access",
      correlationId: "c-long",
      statusCode: 200,
    });
  });

  it("para /health usa logger.debug em vez de info", () => {
    const req = {
      method: "GET",
      path: "/health",
      correlationId: "h-1",
    } as unknown as Request;

    const res = new EventEmitter() as Response & EventEmitter;
    res.statusCode = 200;

    httpAccessLogMiddleware(req, res, jest.fn());
    res.emit("finish");

    expect(mockedLogger.debug).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).not.toHaveBeenCalled();
    const [, meta] = mockedLogger.debug.mock.calls[0];
    expect(meta).toMatchObject({
      event: "http_access",
      path: "/health",
      correlationId: "h-1",
    });
  });

  it("para /ready e sufixo /ping usa debug", () => {
    for (const path of ["/ready", "/ping", "/api/v1/ping"] as const) {
      jest.clearAllMocks();
      const req = {
        method: "GET",
        path,
        correlationId: "x",
      } as unknown as Request;
      const res = new EventEmitter() as Response & EventEmitter;
      res.statusCode = 200;
      httpAccessLogMiddleware(req, res, jest.fn());
      res.emit("finish");
      expect(mockedLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).not.toHaveBeenCalled();
    }
  });
});
