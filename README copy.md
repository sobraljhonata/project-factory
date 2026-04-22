# Project factory (V1 — **beta interna**)

Gerador de projetos **Node.js + Express + TypeScript** com pacotes Terraform **AWS** opcionais (foundation, Aurora, S3, remote state).

**Estado:** beta interna para o time — escopo, limites e garantias em [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md). Mudanças notáveis: [CHANGELOG.md](CHANGELOG.md).

## Requisitos

- Node.js 20+ (`engines` no `package.json`; CI do factory usa Node 22)
- Clone/checkout do repositório com `templates/` ao lado de `cli/` (rodar comandos **a partir da raiz `project-factory/`**)

## Onboarding rápido (primeiro uso)

1. **O que é:** gera um novo repositório/pasta de app Express + TS a partir de templates; não faz deploy nem `terraform apply`.
2. **Comando oficial (não interativo):** na raiz do factory, após dependências e build:
   ```bash
   npm install
   npm run build:cli
   node cli/dist/cli.js nome-da-sua-api --yes --package-name nome-da-sua-api
   ```
   Atalho (recompila a CLI antes de gerar): `npm run create-app -- nome-da-sua-api --yes --package-name nome-da-sua-api` — o `--` antes dos argumentos é **obrigatório** para o npm repassá-los à CLI.
3. **Entrar no projeto gerado:** `cd nome-da-sua-api`
4. **Subir localmente:** `cp .env.example .env`, `npm install`, `npm run dev` — ver README gerado e [templates/api-node-express/README.md](templates/api-node-express/README.md).
5. **Limitações da beta:** sem comando `upgrade` automático; infra é só cópia de arquivos; detalhes em [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md).

Ajuda da CLI: `node cli/dist/cli.js --help`.

## Variáveis mínimas (`.env`) para subir a API

O `env.ts` valida na subida. Para desenvolvimento local, copie `.env.example` → `.env` e ajuste.

| Variável | Obrigatória (schema) | Descrição |
|----------|----------------------|-----------|
| `JWT_SECRET` | Sim (≥16 chars) | Segredo legado / assinaturas |
| `JWT_ACCESS_SECRET` | Sim (≥16 chars) | Access token |
| `JWT_REFRESH_SECRET` | Sim (≥16 chars) | Refresh token |
| `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Defaults existem; senha vazia é válida em dev | MySQL (pool Sequelize) |

**Readiness:** no `.env.example`, `READINESS_CHECK_DB` vem como `false` até haver MySQL; com `true`, `GET /ready` exige banco (adequado a ECS/ALB quando o DB estiver disponível).

## Uso

```bash
cd project-factory
npm install
npm run build:cli
node cli/dist/cli.js meu-servico-api --yes --package-name meu-servico-api --infra foundation,s3
```

(O primeiro argumento é a **pasta** a criar; `--package-name` evita ambiguidade no modo `--yes`.)

- **`--debug`**: envia detalhes da geração para **stderr** (caminhos, tokens, passos), sem poluir stdout.
- **`--region`**: validação de formato (ex.: `us-east-1`); typos falham cedo.
- O binário `create-api-app` existe no pacote `cli` (`npm link` dentro de `cli/` ou `npx --prefix cli`), mas o caminho **documentado** na raiz é `node cli/dist/cli.js`.

Na V1, `PACKAGE_NAME` e `PROJECT_SLUG` recebem o **mesmo** valor (nome kebab-case do pacote).

## Contrato mínimo da geração

Ver [docs/GENERATION_CONTRACT.md](docs/GENERATION_CONTRACT.md): arquivos esperados, metadados `.project-factory.json`, regra de placeholders e o que o smoke valida. Para expectativas da beta: [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md).

Antes de uma release interna: [docs/BETA_RELEASE_CHECKLIST.md](docs/BETA_RELEASE_CHECKLIST.md).

## Versionamento (CLI × template)

- **`generatorVersion`** vem do pacote **`cli/`** (release do motor da CLI).
- **`template`** e **`templateVersion`** vêm do **`template.json`** do stack (ex.: `api-node-express`) — o boilerplate pode subir versão sem mudar a CLI, e vice-versa.

Leia [docs/VERSIONING.md](docs/VERSIONING.md) (impacto para quem mantém projetos gerados) e [docs/UPGRADE_VISION.md](docs/UPGRADE_VISION.md) (ideia futura de `upgrade`, **não implementada**).

## Metadados no projeto gerado

Na raiz do app é criado **`.project-factory.json`**: `generator` (`project-factory`), `generatorVersion` (CLI), `template`, `templateVersion` (stack Node), `generatedAt` (ISO 8601) e **`infraTemplates`** (cada camada Terraform copiada). Cada pasta em `templates/` declara versão em **`template.json`** (semver); esse arquivo não é copiado para o app gerado — só entra no metadata.

Após gerar, a CLI imprime **uma linha em stderr** com produto@versão e template@versão (rastreabilidade em logs/CI).

Modo interativo (perguntas):

```bash
node cli/dist/cli.js minha-api
```

## Smoke test (local / CI)

```bash
npm run smoke
```

Gera um app em diretório temporário, roda `npm install`, `npm run check` e `npm run smoke:http` (GET `/health` + `/ready` com DB opcional desligado no smoke). Falha com exit code ≠ 0 se qualquer etapa quebrar.

## Arquitetura

| Pasta | Conteúdo |
|-------|----------|
| `templates/api-node-express/` | App HTTP mínima (core Express, health, ping, Sequelize, Jest) + `template.json`. |
| `templates/infra/aws/*` | Terraform por stack; copiado só se selecionado; cada stack tem `template.json`. |
| `cli/` | Motor: cópia + substituição `{{PLACEHOLDER}}`. |

Placeholders principais: `PACKAGE_NAME`, `PROJECT_SLUG`, `API_TITLE`, `API_DESCRIPTION`, `API_VERSION`, `APP_PORT`, `AWS_REGION`.

Validações na CLI (fail fast): destino inexistente ou pasta vazia; caminho relativo sem `..`; nome de pacote npm (kebab-case); infra e flags conhecidas; placeholders `{{TOKEN}}` remanescentes após a geração.

## Evolução

- Novas stacks (Java/Spring): novo template em `templates/stacks/...` + entrada em `cli/src/registry.ts`.
- Novos providers: novas pastas sob `templates/infra/<provider>/` sem alterar o contrato do motor (`generate.ts`).
# project-factory
# project-factory
