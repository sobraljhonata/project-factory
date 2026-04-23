
# Changelog

Atualize:

## [0.1.0-beta.1]

## Added

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
