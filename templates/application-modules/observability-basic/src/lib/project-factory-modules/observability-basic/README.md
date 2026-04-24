# Módulo opcional `observability-basic` (project-factory V3.4 / V3.4.1)

Access log HTTP **estruturado** (uma linha JSON por pedido via `logger` do stack), com **duração** (monótona via `hrtime`) e **correlation id** já definidos pelo middleware global do template.

## O que faz

- Regista `event`, `method`, `path`, `statusCode`, `durationMs`, `correlationId`.
- **`pathTruncated`**: presente só como `true` quando o pathname excede **512** caracteres; nesse caso `path` no log contém apenas os primeiros 512 caracteres (a decisão de bypass de probes usa sempre o path completo de `req.path`).
- **Não** regista por defeito: body, headers, nem query string (evita PII e ruído).

### Cardinalidade de `path`

O campo `path` reflecte `req.path` (sem query). URLs com **IDs** (`/users/1`, `/orders/2`) geram muitos valores distintos em agregadores (Loki, CloudWatch, ES) se indexares este campo como dimensão principal. Isto é esperado para access logs “cru”; para templates de rota normalizados usa APM ou camadas à parte. O **limite de 512** caracteres evita linhas gigantes e abuso, mas **não** reduz a cardinalidade lógica de segmentos curtos com IDs.

### Probes

Rotas **`/health`**, **`/ready`**, **`/ping`** (e paths que terminam em `/ping`): registo a nível **`debug`**. Em `production` o `debug` do logger base é **silencioso** — efeito prático: **sem linhas** de access log para probes em produção.

### OPTIONS e CORS

Este middleware corre **cedo** na pipeline (após correlation id, antes de CORS no stack base). Pedidos **OPTIONS** (preflight) que cheguem aqui **contam** como qualquer outro método: em geral aparecem como `info` com `method: "OPTIONS"` (excepto se o path for um bypass acima). Se o volume de preflight for alto, filtra em ingestão ou considera evoluções futuras (sampling); não faz parte do escopo deste módulo.

## Costura

Uma costura no stack **`middlewares.ts`**: carregamento condicional se esta pasta existir no projeto gerado.

## Remover o módulo

1. Apagar a pasta `src/lib/project-factory-modules/observability-basic/`.
2. Atualizar `.project-factory.json` (`applicationModules`) se mantiveres metadata manualmente.

## Fora de escopo deste módulo

Prometheus (`/metrics`), OpenTelemetry, tracing distribuído, dashboards — ver roadmap da tua plataforma.

---

Gerado por **project-factory** com `--module observability-basic`.
