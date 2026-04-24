
# Changelog

Atualize:

## [0.1.0-beta.1]

## Added

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
