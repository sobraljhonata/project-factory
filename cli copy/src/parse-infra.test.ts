import { parseInfraArg } from "./parse-infra";

describe("parseInfraArg", () => {
  it("retorna vazio para undefined ou string vazia", () => {
    expect(parseInfraArg(undefined)).toEqual([]);
    expect(parseInfraArg("")).toEqual([]);
    expect(parseInfraArg("   ")).toEqual([]);
  });

  it("aceita uma camada e remove duplicatas preservando ordem", () => {
    expect(parseInfraArg("foundation")).toEqual(["foundation"]);
    expect(parseInfraArg("foundation,foundation")).toEqual(["foundation"]);
    expect(parseInfraArg(" s3 , foundation ")).toEqual(["s3", "foundation"]);
  });

  it("aceita lista com todas as camadas conhecidas", () => {
    expect(
      parseInfraArg("foundation,aurora,s3,terraformRemoteState"),
    ).toEqual(["foundation", "aurora", "s3", "terraformRemoteState"]);
  });

  it("rejeita camada desconhecida", () => {
    expect(() => parseInfraArg("vpc")).toThrow(/Infra inválida/);
  });
});
