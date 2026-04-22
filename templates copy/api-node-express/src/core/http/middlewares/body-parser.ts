import express, { json, urlencoded } from "express";
import { RequestHandler } from "express";

const JSON_LIMIT = process.env.JSON_LIMIT ?? "1mb";
const URLENC_LIMIT = process.env.URLENC_LIMIT ?? "1mb";

const parsers: RequestHandler[] = [
  // Necessário para req.ip, proxys etc. (se usar proxy reverso, setar app.set('trust proxy', 1) no app)
  express.urlencoded() ? urlencoded({ extended: true, limit: URLENC_LIMIT }) : ((req, _res, next) => next()) as RequestHandler,
  json({ limit: JSON_LIMIT }),
];

export default parsers;