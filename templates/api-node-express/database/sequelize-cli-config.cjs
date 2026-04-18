"use strict";

/**
 * Configuração do sequelize-cli (db:migrate).
 * Carrega o mesmo .env que a aplicação (env.ts), sem duplicar regras de negócio.
 */
const fs = require("fs");
const path = require("path");

/** Raiz do repo (este arquivo está em database/). Mais estável que só process.cwd(). */
const PROJECT_ROOT = path.resolve(__dirname, "..");

require("dotenv").config({
  path: [
    path.join(PROJECT_ROOT, `.env.${process.env.NODE_ENV || "development"}`),
    path.join(PROJECT_ROOT, ".env"),
  ],
});

function envStr(name) {
  const v = process.env[name];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function resolveExplicitSslCaPem() {
  const caEnv = envStr("DB_SSL_CA_PATH");
  if (!caEnv) return null;
  const resolved = path.isAbsolute(caEnv)
    ? caEnv
    : path.resolve(PROJECT_ROOT, caEnv);
  if (!fs.existsSync(resolved)) return null;
  return fs.readFileSync(resolved, "utf8");
}

/** PEM local (postgres/mariadb ou mysql com DB_SSL_CA_PATH explícito). */
function resolveLegacyCertFileCaPem() {
  const candidates = [
    path.join(PROJECT_ROOT, "certs", "rds-global-bundle.pem"),
    path.join(PROJECT_ROOT, "certs", "global-bundle.pem"),
  ];
  for (const resolved of candidates) {
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, "utf8");
    }
  }
  return null;
}

/**
 * MySQL (mysql2): sem DB_SSL_CA_PATH usamos o perfil embutido "Amazon RDS"
 * (pacote aws-ssl-profiles), evitando PEM local incompleto/desatualizado e o
 * erro "self-signed certificate in certificate chain".
 */
function dialectOptions() {
  const sslRaw = envStr("DB_SSL").toLowerCase();
  const ssl = sslRaw === "true" || sslRaw === "1" || sslRaw === "yes";
  if (!ssl) return undefined;

  const dialect = envStr("DB_DIALECT") || "mysql";
  const isMysql2 = dialect === "mysql";
  const rejectUnauthorized = envStr("DB_SSL_REJECT_UNAUTHORIZED") !== "false";

  if (isMysql2 && !envStr("DB_SSL_CA_PATH")) {
    return rejectUnauthorized
      ? { ssl: "Amazon RDS" }
      : { ssl: { rejectUnauthorized: false } };
  }

  const ca =
    resolveExplicitSslCaPem() ||
    (!isMysql2 ? resolveLegacyCertFileCaPem() : null);

  if (rejectUnauthorized && !ca) {
    throw new Error(
      "DB_SSL=true com verificação de certificado ativa, mas nenhum PEM de CA foi encontrado. " +
        (isMysql2
          ? "Para Aurora/RDS MySQL, remova DB_SSL_CA_PATH para usar o perfil Amazon RDS do mysql2, " +
            "ou defina DB_SSL_CA_PATH para um global-bundle.pem válido " +
            "(https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem). "
          : "Defina DB_SSL_CA_PATH ou coloque o bundle em certs/rds-global-bundle.pem. ") +
        "(DB_SSL_REJECT_UNAUTHORIZED=false só para debug.)",
    );
  }

  return {
    ssl: {
      require: true,
      rejectUnauthorized,
      ...(ca ? { ca } : {}),
    },
  };
}

function base() {
  return {
    username: envStr("DB_USERNAME") || "user_app",
    password: envStr("DB_PASSWORD"),
    database: envStr("DB_DATABASE") || "db_app",
    host: envStr("DB_HOST") || "127.0.0.1",
    port: Number(envStr("DB_PORT") || "3306"),
    dialect: envStr("DB_DIALECT") || "mysql",
    dialectOptions: dialectOptions(),
  };
}

module.exports = {
  development: { ...base() },
  production: { ...base() },
  test: { ...base() },
};
