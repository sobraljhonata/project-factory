import { randomUUID } from "crypto";

/** Garante um correlationId não vazio para qualquer resposta JSON. */
export function ensureCorrelationId(correlationId?: string | null): string {
  if (typeof correlationId === "string" && correlationId.trim() !== "") {
    return correlationId.trim();
  }
  return randomUUID();
}
