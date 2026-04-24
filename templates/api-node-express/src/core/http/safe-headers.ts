import type { IncomingHttpHeaders } from "http";
import type { SafeHeaders } from "@/core/protocols/http";

function normalizeHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t === "" ? undefined : t;
}

function getHeaderInsensitive(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return normalizeHeaderValue(value as string | string[] | undefined);
    }
  }
  return undefined;
}

/**
 * Mascaramento explícito de `Authorization` para `safeHeaders` (sem token/credencial em claro).
 * - Esquema **Bearer** → string literal fixa `Bearer <redacted>`.
 * - Qualquer outro valor → string literal fixa `<redacted>` (não indica esquema para evitar fuga de metadados sensíveis).
 */
export function maskAuthorizationHeader(raw: string): string {
  const t = raw.trim();
  if (/^bearer\s+/i.test(t)) return "Bearer <redacted>";
  return "<redacted>";
}

/**
 * Extrai um subconjunto de cabeçalhos seguros para `HttpRequest.safeHeaders` (logs, métricas, decisões não sensíveis).
 * **Não** substitui validação de auth: módulos como `auth-jwt` continuam a ler o `Authorization` real no `Request` do Express.
 *
 * Campos incluídos quando presentes no pedido: `accept`, `content-type`, `user-agent`, `x-request-id`.
 * `authorization` só aparece se existir cabeçalho `Authorization`, sempre com valor mascarado (ver `maskAuthorizationHeader`).
 */
export function pickSafeHeaders(
  incoming: IncomingHttpHeaders | undefined,
): SafeHeaders {
  if (!incoming || typeof incoming !== "object") {
    return {};
  }

  const out: SafeHeaders = {};

  const accept = normalizeHeaderValue(incoming.accept);
  if (accept) out.accept = accept;

  const contentType = getHeaderInsensitive(incoming, "content-type");
  if (contentType) out["content-type"] = contentType;

  const userAgent = getHeaderInsensitive(incoming, "user-agent");
  if (userAgent) out["user-agent"] = userAgent;

  const xRequestId = getHeaderInsensitive(incoming, "x-request-id");
  if (xRequestId) out["x-request-id"] = xRequestId;

  const authorization = getHeaderInsensitive(incoming, "authorization");
  if (authorization) {
    out.authorization = maskAuthorizationHeader(authorization);
  }

  return out;
}
