import type { IncomingHttpHeaders } from "http";
import {
  maskAuthorizationHeader,
  pickSafeHeaders,
} from "@/core/http/safe-headers";

describe("pickSafeHeaders", () => {
  it("extrai accept, content-type, user-agent e x-request-id", () => {
    const h: IncomingHttpHeaders = {
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "jest-test",
      "x-request-id": "rid-1",
    };
    expect(pickSafeHeaders(h)).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      "user-agent": "jest-test",
      "x-request-id": "rid-1",
    });
  });

  it("mascara Authorization Bearer de forma explícita", () => {
    const h: IncomingHttpHeaders = {
      authorization: "Bearer secret-token-value",
    };
    expect(pickSafeHeaders(h)).toEqual({
      authorization: "Bearer <redacted>",
    });
  });

  it("mascara Authorization não-Bearer como <redacted>", () => {
    expect(
      pickSafeHeaders({
        authorization: "Basic dXNlcjpwYXNz",
      }),
    ).toEqual({ authorization: "<redacted>" });
  });

  it("lookup case-insensitive para content-type", () => {
    expect(
      pickSafeHeaders({ "Content-Type": "text/plain" } as IncomingHttpHeaders),
    ).toEqual({ "content-type": "text/plain" });
  });

  it("objecto vazio ou undefined → {}", () => {
    expect(pickSafeHeaders(undefined)).toEqual({});
    expect(pickSafeHeaders({})).toEqual({});
  });
});

describe("maskAuthorizationHeader", () => {
  it("Bearer com espaços", () => {
    expect(maskAuthorizationHeader("  bearer abc.def  ")).toBe(
      "Bearer <redacted>",
    );
  });
});
