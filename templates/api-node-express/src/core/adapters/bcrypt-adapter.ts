import bcrypt from "bcrypt";
import { Encrypter } from "@/core/interfaces";

export class BcryptAdapter implements Encrypter {
  private readonly saltRounds: number;

  constructor(saltRounds: number) {
    this.saltRounds = saltRounds;
  }

  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}