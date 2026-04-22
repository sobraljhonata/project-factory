import { JwtPayload } from "jsonwebtoken";

export interface Encrypter {
  hash(value: string): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
}

export interface Tokenizer {
  verifyToken(token: string): JwtPayload;
  verifyRefreshToken(token: string): JwtPayload;
  generateToken(payload: object): string;
  generateRefreshToken(payload: object): string;
}