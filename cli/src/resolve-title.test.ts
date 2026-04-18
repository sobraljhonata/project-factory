import { resolveTitleNonInteractive } from "./resolve-title";

describe("resolveTitleNonInteractive", () => {
  it("usa o título quando informado", () => {
    expect(resolveTitleNonInteractive("Minha API", "pkg")).toBe("Minha API");
  });

  it("cai no nome do pacote quando título ausente ou só espaços", () => {
    expect(resolveTitleNonInteractive(undefined, "smoke-e2e")).toBe("smoke-e2e");
    expect(resolveTitleNonInteractive("", "smoke-e2e")).toBe("smoke-e2e");
    expect(resolveTitleNonInteractive("   ", "smoke-e2e")).toBe("smoke-e2e");
  });
});
