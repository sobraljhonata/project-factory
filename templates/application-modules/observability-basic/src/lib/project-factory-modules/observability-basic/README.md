# Módulo opcional `observability-basic` (project-factory V3.4)

Access log HTTP **estruturado** (uma linha JSON por pedido via `logger` do stack), com **duração** e **correlation id** já definidos pelo middleware global do template.

## O que faz

- Regista `event`, `method`, `path`, `statusCode`, `durationMs`, `correlationId`.
- **Não** regista por defeito: body, headers, nem query string (evita PII e ruído).
- Rotas **`/health`**, **`/ready`**, **`/ping`** (e paths que terminam em `/ping`): registo a nível **`debug`** (em `production` o `debug` do logger base é silencioso — efeito prático: sem spam nos probes).

## Costura

Uma costura no stack **`middlewares.ts`**: carregamento condicional se esta pasta existir no projeto gerado.

## Remover o módulo

1. Apagar a pasta `src/lib/project-factory-modules/observability-basic/`.
2. Atualizar `.project-factory.json` (`applicationModules`) se mantiveres metadata manualmente.

## Fora de escopo deste módulo

Prometheus (`/metrics`), OpenTelemetry, tracing distribuído, dashboards — ver roadmap da tua plataforma.

---

Gerado por **project-factory** com `--module observability-basic`.
