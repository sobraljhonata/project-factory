#!/usr/bin/env node
/**
 * Confere se o PEM do RDS existe onde o sequelize-cli-config.cjs procura.
 * Rode na raiz do repo: node scripts/check-rds-ca-path.cjs
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const fromConfig = path.join(PROJECT_ROOT, "database", "sequelize-cli-config.cjs");
const pemDefault = path.join(PROJECT_ROOT, "certs", "rds-global-bundle.pem");

require("dotenv").config({
  path: [
    path.join(PROJECT_ROOT, `.env.${process.env.NODE_ENV || "development"}`),
    path.join(PROJECT_ROOT, ".env"),
  ],
});

const caEnv = (process.env.DB_SSL_CA_PATH || "").trim();
const pemFromEnv = caEnv
  ? path.isAbsolute(caEnv)
    ? caEnv
    : path.join(PROJECT_ROOT, caEnv)
  : null;

console.log("PROJECT_ROOT:", PROJECT_ROOT);
console.log("sequelize-cli-config exists:", fs.existsSync(fromConfig));
console.log("certs/rds-global-bundle.pem:", pemDefault, "→", fs.existsSync(pemDefault));
if (pemFromEnv) {
  console.log("DB_SSL_CA_PATH resolved:", pemFromEnv, "→", fs.existsSync(pemFromEnv));
}
console.log("DB_SSL:", JSON.stringify(process.env.DB_SSL));
const caEnvTrim = (process.env.DB_SSL_CA_PATH || "").trim();
const dialect = (process.env.DB_DIALECT || "mysql").trim();
if (dialect === "mysql" && !caEnvTrim) {
  console.log(
    "MySQL sem DB_SSL_CA_PATH: migrate/seed usam ssl: \"Amazon RDS\" (aws-ssl-profiles / mysql2).",
  );
} else if (dialect === "mysql" && caEnvTrim) {
  console.log(
    "Aviso: com DB_SSL_CA_PATH definido, só esse PEM é usado. Se aparecer self-signed contra RDS, deixe DB_SSL_CA_PATH vazio.",
  );
}
