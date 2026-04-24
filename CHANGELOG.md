
# Changelog

## [0.1.0-beta.1]

### Fecho operacional — fase backend / API (product-ops, sem alteração de runtime)

- **Estado do produto (comunicação):** README com **Beta Internal Stable** — beta interna com fase **backend/API** do stack `api-node-express` considerada **encerrada** (Web Core **V3.5.3**, template **1.0.8**).
- **Novos documentos:** [docs/adoption-playbook.md](docs/adoption-playbook.md) (adopção e CI mínimo), [docs/versioning-policy.md](docs/versioning-policy.md) (regras de bump; complementa [VERSIONING.md](docs/VERSIONING.md)), [docs/roadmap.md](docs/roadmap.md) (prioridades curtas + secção **próximo capítulo: frontend factory** — não iniciado, sem datas).
- **Índice:** [docs/README.md](docs/README.md) actualizado com links aos três ficheiros acima.

### Resumo consolidado da linha V3.5 (referência única)

| Versão stack | Marco |
|--------------|--------|
| **1.0.5** | V3.5.0 — Web Core Contract (doc + alinhamento inicial). |
| **1.0.6** | V3.5.1 — envelope de erro único (`AppError`, subclasses, `http-helper` legacy, `errorResponse`). |
| **1.0.7** | V3.5.2 — query contract (`paginationQuerySchema`, `sortQuerySchema`, JSDoc `validateQuery`). |
| **1.0.8** | V3.5.3 — `safeHeaders` / `pickSafeHeaders` no adaptador; `headers` cru mantido (deprecated no tipo). |

### Added

- **V3.5.3 (Safe Headers Contract):** tipo **`SafeHeaders`** e campo opcional **`safeHeaders`** em `HttpRequest`; **`pickSafeHeaders`** / **`maskAuthorizationHeader`** em `templates/api-node-express/src/core/http/safe-headers.ts` (re-export `@/core/http`); **`express-route-adapter`** preenche `safeHeaders` e mantém **`headers`** cru com JSDoc **deprecated**; documentação §9 em [docs/web-core-contract.md](docs/web-core-contract.md); testes `safe-headers.spec.ts` e `express-route-adapter.spec.ts`. **Sem** remover `headers`, **sem** alterar **`auth-jwt`**. Stack **`api-node-express` 1.0.8**.
- **V3.5.2 (Query Contract Consolidation):** schemas Zod reutilizáveis `paginationQuerySchema` e `sortQuerySchema` em `templates/api-node-express/src/core/http/schemas/query-contract.ts` (re-export `@/core/http`); JSDoc em `validateQuery` (strict opt-in por rota, filtros pelo schema, 400 `INVALID_QUERY`); documentação e exemplo mínimo em [docs/web-core-contract.md](docs/web-core-contract.md) (§7–§8); testes em `test/unit/core/http/query-contract.spec.ts`. **Sem** strict global, **sem** mudança em massa de rotas. Stack **`api-node-express` 1.0.7**.
- **V3.5.1 (Error Contract Consolidation):** runtime do template `api-node-express` alinhado a [docs/web-core-contract.md](docs/web-core-contract.md) — subclasses mínimas de `AppError` (`UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError` em `src/core/errors/contract-errors.ts`); `http-helper.ts` documentado como legacy e reescrito como wrappers sobre `errorResponse` (envelope `{ error, meta }`); `errorResponse` omite `details` quando `undefined`; `unAuthorizedError` legado passa a estender `UnauthorizedError` preservando mensagem por defeito; testes unitários em `test/unit/core/errors` e `test/unit/core/helpers`; doc e contrato actualizados. Stack **`api-node-express` 1.0.6**.
- **V3.5.0 (Web Core Contract, doc-only):** [docs/web-core-contract.md](docs/web-core-contract.md) — ordem oficial dos middlewares do template `api-node-express`, papel de cada um, módulos opcionais, CORS vs rate limit, envelopes de erro/sucesso, `AppError` / `http-resource`, recomendações de query strict por rota e roadmap (paginação, `safeHeaders`); índice em [docs/README.md](docs/README.md); comentário de referência em `middlewares.ts`; README do template e raiz actualizados. Stack **`api-node-express` 1.0.5** (comentário + docs; comportamento HTTP inalterado).
- **`rate-limit-basic` 1.0.1:** middleware **após CORS** (429 com cabeçalhos CORS em browsers); cabeçalho **`RateLimit-Reset`** (segundos até ao fim da janela); README (browsers/CORS, `__unknown__`); testes de janela, `__unknown__` e 429 consecutivos. Stack **`api-node-express` 1.0.4**.
- **Módulo `rate-limit-basic` 1.0.0:** rate limit **in-process** por IP (janela fixa O(1), eviction FIFO, `maxKeys`), bypass **`/health`**, **`/ready`**, **`/ping`**, **`OPTIONS`**, **429** JSON + **`Retry-After`**, cabeçalhos **`RateLimit-Limit`** / **`RateLimit-Remaining`**; **sem** Redis nem dependências novas; costura em **`middlewares.ts`**. Stack **`api-node-express` 1.0.3**.
- **V3.4.1:** módulo **`observability-basic` 1.0.1** — `durationMs` com **`process.hrtime.bigint`**, `path` truncado a **512** caracteres com **`pathTruncated: true`** quando aplicável; README (cardinalidade, probes, OPTIONS/CORS); teste de **status 500**.
- **V3.4:** módulo opcional **`observability-basic` 1.0.0** — middleware de **access log** estruturado (`event`, `method`, `path`, `statusCode`, `durationMs`, `correlationId`); `/health`, `/ready`, `/ping` a **debug**; costura **única** em **`middlewares.ts`** (após correlation id). Stack **`api-node-express` 1.0.2**.
- **DX / docs (revisão):** links `docs/deployment/*` removidos/corrigidos nos README Terraform (`foundation`, `aurora-phase2`); âncora HTML estável para a secção Terraform no README raiz + link no [docs/README.md](docs/README.md); [docs/BETA_RELEASE_CHECKLIST.md](docs/BETA_RELEASE_CHECKLIST.md) reescrito (fim do bloco de código corrompido, headings duplicados); README do template `api-node-express` sem link morto para `docs/VERSIONING.md` no app gerado; [CONTRIBUTING.md](CONTRIBUTING.md) com link ao índice `docs/README.md`; alinhamento de texto em [BETA_SCOPE.md](docs/BETA_SCOPE.md) (`upgrade` aplicável vs `upgrade --dry-run`); título [application-modules.md](docs/application-modules.md) V3.2.1+.
- **DX / docs (V3.2.1):** [docs/README.md](docs/README.md) como índice por intenção; README principal com tabela **quando usar cada comando**, **troubleshooting**, **contribuir**, tabela de arquitetura e nota `JWT_SECRET` + `auth-jwt`; [GENERATION_CONTRACT.md](docs/GENERATION_CONTRACT.md) com `applicationModules`.
- **V3.3:** módulo opcional **`auth-jwt` 1.0.0** — verificação **Bearer JWT HS256** (emitente externo): `jwt-verify-middleware.ts`, `req.auth`, 401 padronizado, `JWT_ISSUER` / `JWT_AUDIENCE` opcionais, testes no módulo; costura em **`env.ts`** (deteção do módulo + `JWT_SECRET` mínimo 32 caracteres quando instalado) e **`middlewares.ts`**. Stack **`api-node-express` 1.0.1** (`.env.example` com segredos placeholder ≥32 caracteres).
- **V3.2.1:** documentação oficial do padrão de módulos opcionais ricos em [docs/application-modules.md](docs/application-modules.md) (estrutura, checklist, versionamento/drift, costura mínima, notas para próximos módulos). Sem alteração de comportamento da CLI ou dos templates.
- **V3.2:** módulo **`swagger-rich` 1.1.0** — ficheiro **`openapi.fragment.yaml`** (sob `src/lib/project-factory-modules/swagger-rich/`) fundido em **`loadSwaggerDocument()`** no template base (`swagger.ts`) quando existir; sem o ficheiro, comportamento do Swagger inalterado. Um único `existsSync` no ponto de costura.
- **V3.1:** `upgrade --dry-run` (e JSON) e **`inspect`** herdam comparação semver de **`applicationModules`** vs `templates/application-modules/*/module.json`; labels `app:<id>`; ids desconhecidos em `errors[]`; metadata sem chave tratado como `[]`. Sem alterações ao `create`.
- **V3.0:** módulos opcionais de aplicação no `create` — flag **`--module`** (lista vírgula), catálogo `APPLICATION_MODULES`, cópia pós-stack a partir de `templates/application-modules/<id>/` com `module.json`; campo **`applicationModules`** em `.project-factory.json`; validação no `doctor`; testes de catálogo e parse. Stack `api-node-express` mantido como baseline (estratégia B).
- **V2.7:** comando `inspect` — consolida `diagnoseProject` + `analyzeUpgradeDryRun` (saída em duas secções no modo humano; `--json` com objeto único aninhando os mesmos payloads de `doctor` e `upgrade --dry-run`). Exit `0` só se ambos os lados estiverem ok; opção `--factory-root` como no upgrade. Sem alterar a lógica interna de doctor/upgrade.
- **V2.6:** `create --json` (obrigatório com `--yes`) — JSON único em stdout após geração, enriquecido com metadata de `.project-factory.json` e `nextSteps`; erros com `--json` no mesmo contrato `{ ok, command, error, exitCode }`. Fluxo extraído para `runCreateCommand` com `exitOverride` no parse. Saída humana sem `--json` inalterada.
- **V2.5:** `doctor --json` e `upgrade --dry-run --json` — saída JSON única em stdout para CI/scripts, campo `ok` e `exitCode` coerentes; em erro de parse/CLI com `--json`, objeto de erro JSON em stdout e exit ≠ 0. Lógica de `diagnoseProject` / `analyzeUpgradeDryRun` inalterada.
- Presets estáticos (`minimal`, `aws-standard`, `internal-enterprise`) com `--preset` (exige `--yes`); `--infra` explícito vence o preset. Atalho `create` na CLI.
- Template `templates/infra/aws/terraform-remote-state` (manifest + README) para corresponder a `INFRA_LAYERS` e ao preset `aws-standard`.
- Teste de catálogo: cada entrada de `INFRA_LAYERS` deve ter `template.json` e `README.md` sob `templates/`. Documentação e labels alinhados à distinção scaffold vs Terraform completo.
- **V2.4:** `npm run check:terraform` — `fmt -check` + `init -backend=false` + `validate` em cada camada com `.tf` (via app gerado com preset `internal-enterprise`); CI job `terraform-templates`. Sem apply; sem Terraform no PATH → SKIP local.
- **V2.3:** `terraform-remote-state` com Terraform mínimo real (S3 versionado + criptografia + bloqueio de acesso público, tabela DynamoDB para lock), `terraform.tfvars.example`, outputs e README; manifest `1.1.0`.
- Comando `upgrade --dry-run`: compara `.project-factory.json` com `template.json` atuais do factory (stack e infra), sem aplicar mudanças.
- Comando `doctor` (offline) para validar projeto gerado contra o contrato mínimo; bin `project-factory` apontando para a mesma CLI.
- CLI funcional para geração de projetos
- Template `api-node-express`
- Metadata `.project-factory.json`
- Versionamento separado de CLI e template
- Smoke test com contrato de geração
- Testes automatizados da CLI

### Changed

- Refatoração do `core` para infra mínima
- Introdução de `lib/` como camada opcional
- Documentação de arquitetura (`CORE.md`)

### Fixed

- Remoção de placeholders não resolvidos
- Correções de inconsistência entre README e comportamento real

### Known limitations

- Sem suporte a upgrade automático
- Terraform não validado em cloud
- Modo interativo com menor cobertura

Todas as mudanças notáveis do **project-factory** (gerador + templates) serão descritas aqui. O formato é mantido simples para a beta interna.

## [0.1.0] — 2026-04-16

### Added

- CLI de geração (`create-api-app` / `node cli/dist/cli.js`) com modo `--yes` e interativo.
- Template `api-node-express` com metadados `template.json` (semver).
- Infra AWS opcional (foundation, Aurora, S3) com `template.json` por camada copiada.
- `.project-factory.json` com `generator`, `generatorVersion`, `template`, `templateVersion`, `infraTemplates`, `generatedAt`.
- Validação de placeholders remanescentes e smoke E2E (`npm run smoke`).
- Testes unitários da CLI (`npm run test:cli`).
- Documentação: contrato de geração, versionamento, visão de upgrade (não implementado), escopo da beta.

### Notes

- Versão **0.1.0** reflete o pacote `@project-factory/cli`; o repositório raiz é `private` e segue o mesmo marco para comunicação de beta interna.
