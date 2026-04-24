# Playbook de adopção — project-factory (beta interna)

Guia **curto** para equipas que passam a usar ou a manter repos gerados pelo factory. Complementa [BETA_SCOPE.md](BETA_SCOPE.md) (limites) e [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) (contrato mínimo).

---

## 1. Novo serviço (repo verde)

1. Clone do **project-factory** com `templates/` e `cli/` intactos.
2. Na raiz do factory: `npm install`, `npm run build:cli`.
3. Gerar app (exemplo não interactivo):
   ```bash
   node cli/dist/cli.js meu-servico --yes --package-name meu-servico
   ```
4. `cd meu-servico`, `cp .env.example .env`, ajustar segredos e variáveis obrigatórias.
5. `npm install`, `npm run check` (ou equivalente do README gerado).
6. Opcional: integrar **`doctor`** e/ou **`inspect`** no CI na **raiz do repo gerado** (ver secção 3).

---

## 2. Repo já existente (higiene e drift)

1. Na raiz do **projeto gerado**, com o factory disponível (ou `--factory-root` apontando ao clone):
   - `node cli/dist/cli.js doctor` — contrato mínimo e metadata.
   - `node cli/dist/cli.js upgrade --dry-run` — defasagem de `templateVersion`, infra e `applicationModules`.
   - `node cli/dist/cli.js inspect` — os dois acima num único relatório; exit `0` só se ambos passarem.
2. **Não** existe `upgrade` que escreva ficheiros: defasagem → merge manual ou regeneração controlada (ver [UPGRADE_VISION.md](UPGRADE_VISION.md)).
3. Comparar o teu `templateVersion` com o manifest actual: `templates/api-node-express/template.json` no factory ([versioning-policy.md](versioning-policy.md)).

---

## 3. CI mínimo recomendado (no repo gerado)

| Passo | Comando (exemplo) | Objectivo |
|--------|-------------------|-------------|
| Contrato | `project-factory doctor` (ou `node …/cli/dist/cli.js doctor`) | Falhar PR se o boilerplate sair do mínimo. |
| Drift (opcional) | `upgrade --dry-run --factory-root <path-do-factory>` | Visibilidade de versão stack/infra/módulos vs factory. |
| Qualidade app | `npm run check` (ou `typecheck` + `lint` + `test` conforme README gerado) | Garantir que o código gerado + alterações locais compilam. |

Saída JSON (`--json`) para pipelines: ver README principal do factory.

---

## 4. Contrato HTTP e segurança em logs

- **Norma:** [web-core-contract.md](web-core-contract.md) (ordem de middlewares, envelopes de erro/sucesso, query, `safeHeaders`).
- **Logs:** preferir `correlationId` e `safeHeaders` no `HttpRequest`; evitar logar `headers` cru (§9 do contrato).

---

## 5. Onde pedir ajuda

- Issues ou canal interno acordado pelo time dono do **project-factory**.
- Para limites do produto (o que **não** está coberto), ler primeiro [BETA_SCOPE.md](BETA_SCOPE.md).

---

## 6. Próximo capítulo (produto)

Planeamento explícito do que vem **depois** desta fase backend/API: [roadmap.md](roadmap.md) (inclui **frontend factory** como linha editorial, sem compromisso de datas nem scope técnico fechado).
