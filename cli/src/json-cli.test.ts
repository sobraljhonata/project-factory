import { writeCliParseErrorJson } from "./json-cli";

describe("writeCliParseErrorJson", () => {
  it("escreve objeto com ok false e campos esperados", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    writeCliParseErrorJson("doctor", "  bad arg  ", 2);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(spy.mock.calls[0][0])) as Record<string, unknown>;
    expect(payload).toEqual({
      ok: false,
      command: "doctor",
      error: "bad arg",
      exitCode: 2,
    });
    spy.mockRestore();
  });
});
