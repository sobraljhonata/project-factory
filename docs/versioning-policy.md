# Política de versionamento (operação) — project-factory

Este documento fixa **regras de trabalho** para maintainers e consumidores internos. Os **campos** em `.project-factory.json` continuam descritos em [VERSIONING.md](VERSIONING.md).

---

## 1. Duas versões, duas responsabilidades

| Artefacto | Onde ler | O que bumpa |
|-----------|----------|-------------|
| **CLI** (`generatorVersion`) | `cli/package.json` | Mudanças em flags, validações, cópia de ficheiros, mensagens, `doctor` / `inspect` / `upgrade --dry-run`. |
| **Stack** `api-node-express` (`templateVersion`) | `templates/api-node-express/template.json` | Mudanças no boilerplate da app (runtime, middlewares, contratos HTTP documentados em [web-core-contract.md](web-core-contract.md)). |

Um merge pode alterar **só uma** ou **ambas**, consoante o diff.

---

## 2. Semver do template `api-node-express` (convenção interna)

- **PATCH** (1.0.x): correções compatíveis, docs no template, ajustes que **não** exigem alteração de contrato público da API gerada nem mudança obrigatória em todos os consumidores.
- **MINOR** (1.x.0): novas capacidades **retrocompatíveis** (novo ficheiro opcional, novo export, módulo opcional novo no catálogo sem quebrar `create` antigo).
- **MAJOR** (x.0.0): quebra de contrato para repos gerados (remoção de API pública do template, mudança de forma de arranque, renomeação de pastas obrigatórias, etc.).

A CLI **valida** formato semver nos `template.json`; **não** impõe automaticamente a classificação acima — é responsabilidade do PR e do [CHANGELOG.md](../CHANGELOG.md).

---

## 3. Semver da CLI (`@project-factory/cli`)

Seguir semver habitual do pacote npm. Alterações que mudem **apenas** o gerador sem tocar no template ainda bumpam `generatorVersion`; projetos já gerados **não** mudam até nova geração ou migração manual.

---

## 4. Infra e módulos de aplicação

- Cada camada em `infraTemplates` e cada entrada em `applicationModules` tem o seu **`template.json` / `module.json`** com versão própria.
- **Drift:** `upgrade --dry-run` e `inspect` comparam essas versões com o factory; política de bump **MINOR/PATCH** por pasta segue a mesma lógica: PATCH para correções, MINOR para extensões compatíveis.

---

## 5. Relação com o CHANGELOG

Toda alteração notável ao gerador ou aos templates deve ter **entrada** em [CHANGELOG.md](../CHANGELOG.md) na secção da release em curso (`0.1.0-beta.1` ou futura), com referência ao `templateVersion` / módulo quando relevante.

---

## 6. Leitura cruzada

- [BETA_SCOPE.md](BETA_SCOPE.md) — o que a beta promete.
- [UPGRADE_VISION.md](UPGRADE_VISION.md) — visão de `upgrade` aplicável (ainda não implementado).
- [adoption-playbook.md](adoption-playbook.md) — adopção no dia-a-dia.
