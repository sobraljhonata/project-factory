import sequelize from "@/core/database";
import { ENV } from "@/core/config/env";

export type ReadinessResult =
  | { ok: true; dbChecked: boolean }
  | { ok: false; dbChecked: true; message: string };

/**
 * Readiness para ALB/ECS: opcionalmente valida conexão com o banco (`sequelize.authenticate`).
 * Liveness continua em GET /health (sem DB).
 */
export async function runReadinessCheck(): Promise<ReadinessResult> {
  if (!ENV.READINESS_CHECK_DB) {
    return { ok: true, dbChecked: false };
  }

  try {
    await sequelize.authenticate();
    return { ok: true, dbChecked: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "database authentication failed";
    return { ok: false, dbChecked: true, message };
  }
}
