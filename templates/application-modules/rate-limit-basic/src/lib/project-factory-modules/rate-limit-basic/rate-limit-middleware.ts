/**
 * Módulo opcional project-factory (`rate-limit-basic`): limite in-process por IP,
 * janela fixa alinhada ao relógio, sem Redis nem dependências externas.
 */
import type { Express, NextFunction, Request, Response } from "express";
import { ensureCorrelationId } from "@/core/http/correlation";

export interface RateLimitBasicConfig {
  /** Duração da janela fixa (ms), alinhada ao relógio de pared. */
  windowMs: number;
  /** Máximo de pedidos contados por IP por janela (após o qual → 429). */
  maxRequests: number;
  /** Máximo de chaves no mapa; acima disso: eviction FIFO + limpeza de entradas expiradas. */
  maxKeys: number;
}

export const DEFAULT_RATE_LIMIT_BASIC_CONFIG: RateLimitBasicConfig = {
  windowMs: 60_000,
  maxRequests: 600,
  maxKeys: 50_000,
};

type Bucket = {
  count: number;
  /** Início da janela fixa (epoch ms), igual para todos os IPs na mesma janela. */
  windowStart: number;
};

function currentWindowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

function isBypassRateLimit(req: Request): boolean {
  if (req.method === "OPTIONS") {
    return true;
  }
  const p = req.path;
  if (p === "/health" || p === "/ready" || p === "/ping") {
    return true;
  }
  if (/\/ping$/i.test(p)) {
    return true;
  }
  return false;
}

function clientKey(req: Request): string {
  const ip = typeof req.ip === "string" && req.ip.length > 0 ? req.ip : undefined;
  if (ip) {
    return ip;
  }
  const sock = req.socket?.remoteAddress;
  if (typeof sock === "string" && sock.length > 0) {
    return sock;
  }
  return "__unknown__";
}

function pruneStaleBuckets(map: Map<string, Bucket>, now: number, windowMs: number): void {
  for (const [k, v] of map) {
    if (now >= v.windowStart + windowMs) {
      map.delete(k);
    }
  }
}

function evictOneFifo(map: Map<string, Bucket>): void {
  const first = map.keys().next().value;
  if (first !== undefined) {
    map.delete(first);
  }
}

/** Segundos até ao fim da janela fixa (alinhado a `Retry-After` / convenção comum de `RateLimit-Reset`). */
function secondsUntilWindowEnd(now: number, windowStart: number, windowMs: number): number {
  const resetAt = windowStart + windowMs;
  return Math.max(0, Math.ceil((resetAt - now) / 1000));
}

export function createRateLimitMiddleware(config: RateLimitBasicConfig) {
  const { windowMs, maxRequests, maxKeys } = config;
  const store = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isBypassRateLimit(req)) {
      next();
      return;
    }

    const now = Date.now();
    const ws = currentWindowStart(now, windowMs);
    const key = clientKey(req);

    let entry = store.get(key);

    if (entry && entry.windowStart !== ws) {
      entry.count = 0;
      entry.windowStart = ws;
    }

    if (!entry) {
      pruneStaleBuckets(store, now, windowMs);
      while (store.size >= maxKeys) {
        evictOneFifo(store);
      }
      entry = { count: 0, windowStart: ws };
      store.set(key, entry);
    }

    entry.count += 1;

    const correlationId = ensureCorrelationId(
      (req as Request & { correlationId?: string }).correlationId,
    );

    if (entry.count > maxRequests) {
      const resetSec = secondsUntilWindowEnd(now, entry.windowStart, windowMs);
      const retryAfter = Math.max(1, resetSec);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", String(resetSec));
      res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Demasiados pedidos; tenta novamente mais tarde.",
        },
        meta: { correlationId },
      });
      return;
    }

    const resetSec = secondsUntilWindowEnd(now, entry.windowStart, windowMs);
    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));
    res.setHeader("RateLimit-Reset", String(resetSec));

    next();
  };
}

export function registerRateLimit(app: Express): void {
  app.use(createRateLimitMiddleware(DEFAULT_RATE_LIMIT_BASIC_CONFIG));
}
