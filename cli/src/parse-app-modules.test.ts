import { parseApplicationModulesArg } from "./parse-app-modules";

describe("parseApplicationModulesArg", () => {
  it("lista vazia quando omitido ou vazio", () => {
    expect(parseApplicationModulesArg(undefined)).toEqual([]);
    expect(parseApplicationModulesArg("")).toEqual([]);
    expect(parseApplicationModulesArg("  ,  ")).toEqual([]);
  });

  it("aceita um id", () => {
    expect(parseApplicationModulesArg("swagger-rich")).toEqual(["swagger-rich"]);
  });

  it("aceita lista com espaços e remove duplicatas", () => {
    expect(
      parseApplicationModulesArg("swagger-rich, observability-basic , swagger-rich"),
    ).toEqual(["swagger-rich", "observability-basic"]);
  });

  it("aceita auth-jwt", () => {
    expect(parseApplicationModulesArg("auth-jwt")).toEqual(["auth-jwt"]);
  });

  it("aceita rate-limit-basic", () => {
    expect(parseApplicationModulesArg("rate-limit-basic")).toEqual(["rate-limit-basic"]);
  });

  it("rejeita id desconhecido", () => {
    expect(() => parseApplicationModulesArg("nope")).toThrow(/Módulo de aplicação inválido/);
  });
});
