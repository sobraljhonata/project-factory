import bcrypt from "bcrypt";
import { BcryptAdapter } from "@/core/adapters/bcrypt-adapter";

jest.mock("bcrypt");

describe("BcryptAdapter", () => {
  const salt = 12;
  const makeSut = () => new BcryptAdapter(salt);

  beforeEach(() => jest.clearAllMocks());

  it("deve chamar bcrypt.hash com valor e salt corretos", async () => {
    const sut = makeSut();
    (bcrypt.hash as jest.Mock).mockResolvedValueOnce("hashed_value");

    const result = await sut.hash("plain_value");

    expect(bcrypt.hash).toHaveBeenCalledWith("plain_value", salt);
    expect(result).toBe("hashed_value");
  });

  it("deve chamar bcrypt.compare com valores corretos", async () => {
    const sut = makeSut();
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result = await sut.compare("plain", "hashed");

    expect(bcrypt.compare).toHaveBeenCalledWith("plain", "hashed");
    expect(result).toBe(true);
  });

  it("deve propagar erro se bcrypt.hash lançar", async () => {
    const sut = makeSut();
    (bcrypt.hash as jest.Mock).mockRejectedValueOnce(new Error("hash error"));

    await expect(sut.hash("plain")).rejects.toThrow("hash error");
  });
});