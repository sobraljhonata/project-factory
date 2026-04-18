// src/server.ts
import { ENV } from "@/core/config/env";
import { initializeDatabaseAndServer } from "@/core/config/initializeDatabaseAndServer";
import { logger } from "@/core/config/logger";
import sequelize from "@/core/database";

// OBS: em muitos setups, o module-alias precisa ser registrado antes
// de qualquer import com "@/". Se isso for um problema real no seu build,
// podemos depois separar um entrypoint JS só para registrar aliases.
if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
}

async function start() {
  try {
    logger.info("Bootstrapping HTTP server...", {
      env: ENV.NODE_ENV,
      port: ENV.PORT,
    });

    const app = (await import("@/core/config/app")).default;

    await initializeDatabaseAndServer(sequelize);

    // 0.0.0.0: obrigatório em container/ECS — o ALB health check bate no IP da task, não em 127.0.0.1
    const server = app.listen(ENV.PORT, "0.0.0.0", () => {
      logger.info("HTTP server started", {
        port: ENV.PORT,
        host: "0.0.0.0",
        swaggerEnabled: ENV.SWAGGER_ENABLED,
        swaggerUrl: ENV.SWAGGER_ENABLED
          ? `http://localhost:${ENV.PORT}/api-docs`
          : null,
      });
    });

    const shutdown = async (signal: string) => {
      logger.warn("Received shutdown signal", { signal });

      server.close(async () => {
        try {
          logger.info("Closing DB connection...");
          await sequelize.close();
          logger.info("DB connection closed. Exiting process.");
          process.exit(0);
        } catch (err) {
          logger.error("Error while closing DB connection on shutdown", {
            error:
              err instanceof Error
                ? { message: err.message, stack: err.stack }
                : err,
          });
          process.exit(1);
        }
      });

      // garante encerramento mesmo se algo travar
      setTimeout(() => {
        logger.error("Forced shutdown due to timeout");
        process.exit(1);
      }, 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Boas práticas de runtime
    process.on("unhandledRejection", (reason) => {
      logger.error("unhandledRejection", {
        reason:
          reason instanceof Error
            ? { message: reason.message, stack: reason.stack }
            : reason,
      });
      // aqui você pode decidir se quer encerrar o processo ou não.
      // Em muitos cenários é mais seguro encerrar.
    });

    process.on("uncaughtException", (err) => {
      logger.error("uncaughtException", {
        error: { message: err.message, stack: err.stack },
      });
      // geralmente é recomendável encerrar o processo, pois o estado pode estar corrompido
      process.exit(1);
    });
  } catch (err) {
    logger.error("Failed to start HTTP server", {
      error:
        err instanceof Error ? { message: err.message, stack: err.stack } : err,
    });
    process.exit(1);
  }
}

start();