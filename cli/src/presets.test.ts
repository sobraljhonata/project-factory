import {
  assertPresetRequiresYes,
  PRESETS,
  resolveCreateInfra,
  resolvePresetId,
} from "./presets";

describe("resolvePresetId", () => {
  it("aceita ids conhecidos", () => {
    expect(resolvePresetId("minimal")).toBe("minimal");
    expect(resolvePresetId(" aws-standard ")).toBe("aws-standard");
    expect(resolvePresetId("internal-enterprise")).toBe("internal-enterprise");
  });

  it("falha em preset desconhecido", () => {
    expect(() => resolvePresetId("nope")).toThrow(/Preset desconhecido/);
  });
});

describe("PRESETS infra", () => {
  it("minimal é lista vazia", () => {
    expect(PRESETS.minimal.infra).toEqual([]);
  });

  it("aws-standard", () => {
    expect(PRESETS["aws-standard"].infra).toEqual([
      "foundation",
      "terraformRemoteState",
    ]);
  });

  it("internal-enterprise", () => {
    expect(PRESETS["internal-enterprise"].infra).toEqual([
      "foundation",
      "aurora",
      "s3",
      "terraformRemoteState",
    ]);
  });
});

describe("resolveCreateInfra", () => {
  it("--infra explícito vence o preset", () => {
    const r = resolveCreateInfra({
      presetRaw: "aws-standard",
      yes: true,
      infraRaw: "s3",
      infraFromCli: true,
    });
    expect(r).toEqual(["s3"]);
  });

  it("aws-standard sem --infra usa preset", () => {
    const r = resolveCreateInfra({
      presetRaw: "aws-standard",
      yes: true,
      infraRaw: undefined,
      infraFromCli: false,
    });
    expect(r).toEqual(["foundation", "terraformRemoteState"]);
  });

  it("minimal", () => {
    expect(
      resolveCreateInfra({
        presetRaw: "minimal",
        yes: true,
        infraRaw: undefined,
        infraFromCli: false,
      }),
    ).toEqual([]);
  });

  it("internal-enterprise", () => {
    expect(
      resolveCreateInfra({
        presetRaw: "internal-enterprise",
        yes: true,
        infraRaw: undefined,
        infraFromCli: false,
      }),
    ).toEqual(["foundation", "aurora", "s3", "terraformRemoteState"]);
  });

  it("sem preset mantém parse de --infra", () => {
    expect(
      resolveCreateInfra({
        presetRaw: undefined,
        yes: true,
        infraRaw: "foundation,s3",
        infraFromCli: true,
      }),
    ).toEqual(["foundation", "s3"]);
  });

  it("sem preset e sem --infra → vazio", () => {
    expect(
      resolveCreateInfra({
        presetRaw: undefined,
        yes: true,
        infraRaw: undefined,
        infraFromCli: false,
      }),
    ).toEqual([]);
  });

  it("erro quando --preset sem --yes", () => {
    expect(() =>
      resolveCreateInfra({
        presetRaw: "minimal",
        yes: false,
        infraRaw: undefined,
        infraFromCli: false,
      }),
    ).toThrow(/exige `--yes`/);
  });
});

describe("assertPresetRequiresYes", () => {
  it("lança sem --yes", () => {
    expect(() => assertPresetRequiresYes("minimal", false)).toThrow(/exige `--yes`/);
  });

  it("não lança sem preset", () => {
    expect(() => assertPresetRequiresYes(undefined, false)).not.toThrow();
  });

  it("não lança com --yes", () => {
    expect(() => assertPresetRequiresYes("minimal", true)).not.toThrow();
  });
});
