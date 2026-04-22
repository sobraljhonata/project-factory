# Changelog

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
