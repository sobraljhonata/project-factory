# Web Core Contract — template `api-node-express` (V3.5.3)

Documentação **normativa** do contrato HTTP do stack gerado pelo **project-factory**.  
**Âmbito:** V3.5.0 fixou linguagem comum (doc + comentários). **V3.5.1** alinha o runtime ao envelope de erro único. **V3.5.2** consolida **query params**. **V3.5.3** introduz **`safeHeaders`** no `HttpRequest` (subconjunto fixo + `Authorization` sempre mascarada), helper **`pickSafeHeaders`**, e preenchimento no **`express-route-adapter`** — **`headers` cru mantido** (marcado como legacy em tipos/JSDoc), **sem** alterar o módulo **`auth-jwt`** (continua a usar o `Request` do Express).

**Público:** equipas que mantêm APIs geradas, revisão de PRs e alinhamento com o gerador.

---

## 1. Ordem oficial dos middlewares (estado actual)

A ordem abaixo é a **ordem de execução real** em `createApp` + `setupMiddlewares` + `setupRoutes` + `setupErrorHandlers`. Não é um plugin system: é uma sequência explícita em código.

| # | Componente | Ficheiro / notas |
|---|------------|------------------|
| 1 | `trust proxy` | `app.ts` — só em `production` (`app.set("trust proxy", 1)`). |
| 2 | `forceHttpsRedirect` | `app.ts` — opcional, condicionado a env. |
| 3 | Swagger / raiz | `app.ts` — opcional (`SWAGGER_ENABLED`). |
| 4 | **`securityHeaders`** | `middlewares.ts` — cabeçalhos mínimos sem `helmet`. |
| 5 | **`correlationIdMiddleware`** | Gera / propaga `correlationId` no pedido e na resposta. |
| 6 | **`observability-basic`** (opcional) | Módulo: access log; costura em `middlewares.ts` se os ficheiros existirem. |
| 7 | **`cors`** | Responde **OPTIONS** com `204` e define cabeçalhos CORS. |
| 8 | **`rate-limit-basic`** (opcional) | Módulo: limite por IP; costura **após** CORS (ver §4). |
| 9 | **Body parsers** (`json`, `urlencoded`) | Limites via `JSON_LIMIT` / `URLENC_LIMIT` no `.env`. |
| 10 | **`contentType`** | Default de `Content-Type` onde aplicável. |
| 11 | **`auth-jwt`** (opcional) | Módulo: verificação Bearer JWT. |
| 12 | **Rotas** | `setupRoutes(app)` — negócio em `src/modules/`. |
| 13 | **`/health` e `/ready`** | Registados em `app.ts` após `setupMiddlewares`. |
| 14 | **`notFoundHandler`** | Últimos `app.use` em `setupErrorHandlers`. |
| 15 | **`errorHandler`** | Captura erros e devolve JSON alinhado ao contrato de erro. |

**Express permanece visível:** não há camada que substitua `req`, `res` e `next` no pipeline global.

---

## 2. Papel de cada middleware (resumo)

- **`securityHeaders`:** reduzir superfície comum (nosniff, frame, referrer, HSTS em produção).
- **`correlationId`:** correlacionar logs e respostas JSON (`meta.correlationId`).
- **`observability-basic`:** uma linha de access log estruturado por pedido (quando instalado).
- **`cors`:** política de origens; **preflight** `OPTIONS` termina aqui com `204` (não segue para rotas de negócio).
- **`rate-limit-basic`:** 429 + cabeçalhos `RateLimit-*` / `Retry-After` quando instalado.
- **Parsers:** corpo e form URL-encoded com limite de tamanho.
- **`auth-jwt`:** validação verify-only de JWT em rotas não públicas (quando instalado).

---

## 3. Onde entram os módulos opcionais

Os módulos **`observability-basic`**, **`rate-limit-basic`** e **`auth-jwt`** são copiados para `src/lib/project-factory-modules/<id>/` e activados por **costura explícita** em `middlewares.ts` (e `auth-jwt` também em `env.ts` para validação de segredo). Não há auto-discovery: se a pasta não existir, o ramo não corre.

---

## 4. Por que `rate-limit-basic` fica **após** CORS

Respostas **429** devem incluir cabeçalhos **`Access-Control-*`** quando o cliente é um **browser** com `Origin`; se o rate limit respondesse **antes** de CORS aplicar esses cabeçalhos, o browser pode bloquear a leitura do corpo JSON (erro opaco). Por isso, no template actual, o módulo **`rate-limit-basic`** está registado **depois** de `app.use(cors)`.

---

## 5. Envelope padrão de **erro** (contrato actual)

Respostas JSON de erro seguem **sempre** este formato (ex.: `mapErrorToHttpResponse`, `notFoundHandler`, validação Zod, `http-helper`, módulos `auth-jwt` / `rate-limit-basic` quando devolvem JSON de erro):

```json
{
  "error": {
    "code": "STRING_EM_MAIÚSCULAS_OU_SNAKE",
    "message": "mensagem legível",
    "details": {}
  },
  "meta": {
    "correlationId": "…"
  }
}
```

- **`details`** é opcional: quando não há payload extra, a chave **não** deve aparecer no JSON (V3.5.1+ em `errorResponse` / helpers alinhados).
- **`AppError`** (`src/core/errors-app-error.ts`) + **`mapErrorToHttpResponse`** são o caminho **recomendado** para erros de domínio.
- **Subclasses estáveis** (export `@/core/errors`, ficheiro `contract-errors.ts`): `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404, domínio; não confundir com `ROUTE_NOT_FOUND` do handler global), `ConflictError` (409), `ValidationError` (400, código `VALIDATION_ERROR`, alinhado ao `validateBody`).
- **`unAuthorizedError`** (`unauthorized-error.ts`) está **deprecated** mas mantém compatibilidade: estende `UnauthorizedError` e a mensagem por defeito antiga; continua a mapear para o mesmo envelope 401.

---

## 6. Envelope padrão de **sucesso** (contrato actual)

Para controllers que devolvem `HttpResponse` via **`http-resource.ts`**, o corpo típico de **200 / 201** usa recursos com **`data`**, **`links`** e **`meta`** opcional:

```json
{
  "data": {},
  "links": {},
  "meta": {}
}
```

- **`ok`**, **`created`**, **`noContent`** em `http-resource.ts` são os helpers **recomendados** para esse formato.
- **`http-helper.ts`** está marcado como **legacy**: as funções devolvem o **mesmo envelope de erro** que o contrato; quando possível, **preferir** `throw new …Error()` (`AppError`) + adaptador, ou `http-resource` para sucesso.

---

## 7. Query params, **`validateQuery`** e **strict opt-in** (sem global)

O middleware **`validateQuery`** (`src/core/http/middlewares/validate-query.ts`) valida **`req.query`** com um **schema Zod** (`z.object`, `z.strictObject`, ou objecto já derivado com `.merge()` / `.strict()`). O resultado parseado fica em **`req.validatedQuery`**.

- **Strict não é global:** o middleware **não** força `strict` em todas as rotas. O comportamento de chaves extra depende **só** do schema passado à rota.
- **Rejeitar query desconhecida (opt-in por rota):** usa **`z.strictObject({ ... })`** *ou* **`z.object({ ... }).strict()`** (Zod 4) **nesse** schema. Com o `z.object` “normal”, chaves não declaradas são **ignoradas** (strip), o que mantém compatibilidade com clientes que enviam parâmetros extra.
- **Erro 400:** falha de parse Zod → resposta **`INVALID_QUERY`** com `details.errors` (paths + mensagens) e `meta.correlationId`, no envelope da §5.

---

## 8. Schemas reutilizáveis de paginação e ordenação (V3.5.2)

O template expõe schemas base em **`src/core/http/schemas/query-contract.ts`** (re-export em `@/core/http`):

| Schema | Campos | Notas |
|--------|--------|--------|
| **`paginationQuerySchema`** | `page` (default `1`), `pageSize` (default `20`, máx. `100`) | `z.coerce.number` para strings vindas de `req.query`. |
| **`sortQuerySchema`** | `sortBy` (opcional, regex simples `^[a-zA-Z0-9_.]+$`), `sortOrder` (`asc` \| `desc`, default `asc`) | Sem parser de expressões compostas; para colunas fechadas, restringe noutro objecto ou enum na rota. |

**Exemplo mínimo (documentação — não é rota obrigatória do gerador):** listagem com paginação + sort **e** rejeição de parâmetros extra:

```ts
import * as z from "zod";
import { validateQuery } from "@/core/http/middlewares/validate-query";
import {
  paginationQuerySchema,
  sortQuerySchema,
} from "@/core/http/schemas/query-contract";

const listItemsQuerySchema = paginationQuerySchema.merge(sortQuerySchema).strict();

// router.get("/items", validateQuery(listItemsQuerySchema), controller);
```

Alternativa equivalente: **`z.strictObject({ ...paginationQuerySchema.shape, ...sortQuerySchema.shape })`**.

Para **filtros** adicionais (ex. `status`), acrescenta campos com `.extend()` / segundo merge **antes** ou **depois** de `.strict()`, consoante queiras que esses nomes façam parte do conjunto fechado.

---

## 9. Headers seguros (`safeHeaders`) e `headers` cru (legacy)

O **`express-route-adapter`** preenche **`httpRequest.safeHeaders`** via **`pickSafeHeaders(req.headers)`** (`src/core/http/safe-headers.ts`, re-export em `@/core/http`).

### 9.1. O que entra em `safeHeaders` (lista fechada)

| Chave | Origem | Notas |
|-------|--------|--------|
| `accept` | `Accept` | Valor textual tal como enviado (normalizado a string única). |
| `content-type` | `Content-Type` | Lookup **case-insensitive**. |
| `user-agent` | `User-Agent` | Idem. |
| `x-request-id` | `X-Request-Id` | Idem. |
| `authorization` | `Authorization` | **Só** se o cabeçalho existir; valor **sempre** mascarado: `Bearer <redacted>` se o valor começar por `Bearer ` (case-insensitive), caso contrário a string literal **`<redacted>`** (sem token nem esquema inferível para não-Bearer). |

Chaves ausentes no pedido **não** aparecem em `safeHeaders` (objecto esparso).

### 9.2. Uso recomendado

- **Por defeito** em controllers e em **logs estruturados**, usar **`httpRequest.safeHeaders`** (ou campos já expostos como `correlationId`), **não** o objecto **`headers`** completo.
- **Evitar** persistir ou logar **`httpRequest.headers`** em bruto (risco de vazar cookies, tokens, cabeçalhos internos de proxies).
- **Aceder a `headers` cru** apenas quando for **imprescindível** o valor exacto de um cabeçalho **não** incluído em `safeHeaders` (integração pontual, depuração restrita). O campo permanece no tipo por **compatibilidade**; está documentado como **deprecated** em `HttpRequest` (JSDoc no template).

### 9.3. Relação com `auth-jwt`

O módulo opcional **`auth-jwt`** valida JWT a partir do **`Request`** do Express (`req.headers.authorization` real). **V3.5.3 não altera** esse módulo nem o pipeline Express; `safeHeaders` destina-se ao contrato **`HttpRequest`** usado pelos controllers gerados pelo adaptador.

---

## 10. Relação com outros documentos

| Documento | Conteúdo |
|-----------|-----------|
| [application-modules.md](application-modules.md) | Módulos opcionais: pastas, `module.json`, drift. |
| [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) | Contrato mínimo de um projeto gerado. |
| `templates/api-node-express/docs/CORE.md` | (No app gerado) Estrutura de pastas do template. |

---

## 11. Resumo

- **V3.5.0** fixou **linguagem comum** (docs + comentários).
- **V3.5.1** implementa no template **subclasses `AppError`**, envelope único em **`http-helper`**, `details` omitido quando vazio, e documentação alinhada ao runtime.
- **V3.5.2** adiciona **`paginationQuerySchema`** e **`sortQuerySchema`**, documentação de **strict por rota**, JSDoc em **`validateQuery`**, e exemplos neste contrato — **sem** strict global, **sem** alterar controllers em massa.
- **V3.5.3** adiciona **`SafeHeaders`**, **`pickSafeHeaders`**, **`safeHeaders`** no **`HttpRequest`** e no **`express-route-adapter`**; **`headers` cru** mantido com JSDoc **deprecated**; testes do helper e do adaptador.
- Evoluções posteriores (mais chaves em `safeHeaders`, etc.) documentam-se aqui e no [CHANGELOG.md](../CHANGELOG.md).
