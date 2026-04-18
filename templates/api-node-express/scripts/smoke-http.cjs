/**
 * Smoke HTTP para CI/CD: sobe o processo real (ts-node + server.ts) e valida GET /health.
 * Não substitui testes unitários de rota; exercita listen + stack Express como em runtime.
 *
 * Uso: npm run smoke:http
 * Env opcional: SMOKE_PORT (default 34581), JWT_* (default alinhado ao jest-ci-env.js).
 * Pós-deploy (CD): curl -fsS "$BASE_URL/health" e "$BASE_URL/ready".
 * Env: SMOKE_SKIP_READY=true pula GET /ready (ex.: ambiente sem DB no smoke).
 */
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const PORT = process.env.SMOKE_PORT || "34581";
const TIMEOUT_MS = 90_000;
const POLL_MS = 400;

const env = {
  ...process.env,
  NODE_ENV: "test",
  PORT,
  JWT_SECRET: process.env.JWT_SECRET || "ffffffffffffffffffffffffffffffff",
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || "ffffffffffffffffffffffffffffffff",
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || "ffffffffffffffffffffffffffffffff",
  /** Sem MySQL no smoke: /ready só passa se não exigir DB (default false aqui). */
  READINESS_CHECK_DB: process.env.READINESS_CHECK_DB ?? "false",
};

function httpGetJson(path, { okStatus, assertBody }) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${PORT}${path}`,
      { timeout: 5000 },
      (res) => {
        let raw = "";
        res.on("data", (c) => {
          raw += c;
        });
        res.on("end", () => {
          try {
            const body = JSON.parse(raw);
            if (res.statusCode === okStatus && assertBody(body)) {
              resolve();
              return;
            }
            reject(
              new Error(
                `unexpected ${path}: status=${res.statusCode} body=${raw}`,
              ),
            );
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });
  });
}

function httpGetHealth() {
  return httpGetJson("/health", {
    okStatus: 200,
    assertBody: (b) => b.status === "ok",
  });
}

function httpGetReady() {
  return httpGetJson("/ready", {
    okStatus: 200,
    assertBody: (b) => b.status === "ready",
  });
}

function terminate(child) {
  return new Promise((resolve) => {
    if (!child.pid) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    const t = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }, 8000);
    t.unref();
  });
}

async function main() {
  const child = spawn(
    process.execPath,
    [
      "-r",
      "ts-node/register",
      "-r",
      "tsconfig-paths/register",
      path.join(ROOT, "src", "server.ts"),
    ],
    {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let stderr = "";
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
    if (stderr.length > 12_000) {
      stderr = stderr.slice(-8000);
    }
  });

  let intentionalStop = false;
  child.on("exit", (code) => {
    if (intentionalStop) return;
    if (code !== 0 && code !== null) {
      console.error(
        "smoke-http: servidor encerrou antes de /health (código",
        code + ")",
      );
      if (stderr.trim()) {
        console.error("--- stderr ---\n", stderr.slice(-4000));
      }
      process.exit(1);
    }
  });

  const deadline = Date.now() + TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      try {
        await httpGetHealth();
        if (process.env.SMOKE_SKIP_READY !== "true") {
          await httpGetReady();
        }
        console.log(
          "smoke-http: OK (GET /health" +
            (process.env.SMOKE_SKIP_READY === "true" ? "" : " + /ready") +
            ")",
        );
        intentionalStop = true;
        await terminate(child);
        process.exit(0);
        return;
      } catch {
        if (child.exitCode !== null) {
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    }
  } finally {
    intentionalStop = true;
    await terminate(child);
  }

  console.error(
    "smoke-http: falhou — /health ou /ready não responderam como esperado a tempo.",
  );
  if (stderr.trim()) {
    console.error("--- stderr (último trecho) ---\n", stderr.slice(-4000));
  }
  process.exit(1);
}

main();
