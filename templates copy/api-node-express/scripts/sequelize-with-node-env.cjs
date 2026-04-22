#!/usr/bin/env node
/**
 * Repassa comandos ao sequelize-cli e força --env alinhado a NODE_ENV (default development).
 * Evita "Using environment development" quando NODE_ENV=production e reduz confusão local/CI.
 */
"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cli = path.join(
  path.dirname(require.resolve("sequelize-cli/package.json")),
  "lib",
  "sequelize",
);

const userArgs = process.argv.slice(2);
const hasEnvFlag =
  userArgs.includes("--env") ||
  userArgs.some((a) => a === "-e" || a.startsWith("--env="));

const envName = process.env.NODE_ENV || "development";
const args = hasEnvFlag
  ? userArgs
  : [...userArgs, "--env", envName];

const result = spawnSync(process.execPath, [cli, ...args], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
