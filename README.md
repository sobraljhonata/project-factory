# Project factory (V1 — **beta interna**)

**Em uma frase:** gera repositórios prontos a correr (**Express + TypeScript**) e copia **Terraform AWS opcional** para o teu repo — com **metadata versionada**, **módulos opcionais** (OpenAPI rico, JWT verify-only, …) e comandos **só leitura** (`doctor`, `inspect`, `upgrade --dry-run`) para CI e revisão de drift.

**Estado:** beta interna para o time — escopo, limites e garantias em [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md). Mudanças notáveis: [CHANGELOG.md](CHANGELOG.md).

**Índice da documentação:** [docs/README.md](docs/README.md) (mapa de todos os docs por intenção).

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
5. **Limitações da beta:** **não** existe comando que aplique `upgrade` aos ficheiros do teu projeto; podes **inspecionar defasagem** com `upgrade --dry-run` / `inspect` e integrar à mão. Infra é só cópia de ficheiros — detalhes em [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md).

Ajuda da CLI: `node cli/dist/cli.js --help`.

### Quando usar cada comando (resumo)

| Comando | Onde correr | O que faz |
|---------|-------------|-----------|
| **`create`** | No clone do **factory** | Gera pasta nova com app (+ infra / `--module` opcionais). |
| **`doctor`** | Na raiz do **projeto gerado** | Valida contrato mínimo (ficheiros, metadata, scripts). |
| **`upgrade --dry-run`** | Na raiz do **projeto gerado** (com `--factory-root` ao factory se preciso) | Compara versões stack/infra/**applicationModules** com o factory — **não escreve** ficheiros. |
| **`inspect`** | Idem | `doctor` + `upgrade --dry-run` num único relatório (exit `0` só se ambos ok). |

Todos suportam **`--json`** para CI (ver secções abaixo).

**Automação (`create --json`, V2.6):** `project-factory create minha-api --yes --package-name minha-api --json` (o **`--json` exige `--yes`**) imprime um único objeto JSON em stdout com `ok`, caminhos resolvidos, `infra`, `applicationModules`, `template` / `templateVersion` / `generatorVersion` (lidos de `.project-factory.json` após a geração) e `nextSteps`. Erros de parse/CLI ou de validação com `--json` seguem o mesmo contrato que `doctor`/`upgrade` (`ok: false`, `command: "create"`, `error`, `exitCode`). Sem `--json`, a saída humana permanece igual.

**Módulos opcionais de aplicação (V3.0+):** após copiar o stack `api-node-express` (inalterado), podes acrescentar capacidades com **`--module`** (lista separada por vírgulas, como `--infra`). Catálogo inicial pequeno: `swagger-rich`, `observability-basic`, `auth-jwt` (pastas sob `templates/application-modules/<id>/` com `module.json` e ficheiros sob `src/`). O metadata `.project-factory.json` passa a incluir **`applicationModules`** (par a `{ id, version }`); o `doctor` valida esse campo quando presente. **V3.2:** com **`swagger-rich`**, o OpenAPI base é fundido com **`openapi.fragment.yaml`** do módulo (tags, schemas/respostas de exemplo, etc.) se o ficheiro existir no projeto gerado. **V3.3:** com **`auth-jwt`**, o stack valida tokens **Bearer** HS256 (emitente externo). **V3.4:** com **`observability-basic`**, access log HTTP estruturado (duração + correlation id; sem body/headers/query). **Convenção e exemplos:** [docs/application-modules.md](docs/application-modules.md).

### Presets de infra (`--preset`, V2.2)

Com **`--yes`**, você pode fixar listas Terraform comuns sem repetir `--infra`:

| Preset | Camadas (`--infra` equivalente) |
|--------|----------------------------------|
| `minimal` | *(nenhuma)* |
| `aws-standard` | `foundation`, `terraformRemoteState` |
| `internal-enterprise` | `foundation`, `aurora`, `s3`, `terraformRemoteState` |

- **`--preset` exige `--yes`** nesta versão (presets não aplicam ao modo interativo).
- Se **`--infra`** for passado na linha de comando, ele **vence** o preset (lista explícita).
- Atalho opcional: primeiro argumento pode ser `create` — mesmo comportamento que o legado sem `create`.

```bash
node cli/dist/cli.js create minha-api --yes --package-name minha-api --preset aws-standard
project-factory create minha-api --yes --package-name minha-api --preset minimal
```

**Maturidade das camadas Terraform** (catálogo sob `templates/infra/aws/`): todas trazem `template.json`, README e módulos `.tf` mínimos — **não** há `terraform plan/apply` no CI do factory; valide na sua conta. **`terraform-remote-state`** é propositalmente **pequeno** (S3 state + DynamoDB lock apenas; ver README da camada); `foundation` / `aurora` / `s3` cobrem mais superfície operacional.

### Inspecionar um projeto já gerado (`doctor`)

Na raiz do **repositório gerado** (ou passando o caminho), após `npm run build:cli` no factory:

```bash
node cli/dist/cli.js doctor
node cli/dist/cli.js doctor /caminho/do/meu-projeto --debug
```

Com o pacote `cli` linkado ou via `npx --prefix cli`: `project-factory doctor`. Saída **0** se não houver erros (avisos são permitidos); **1** se o contrato mínimo for violado. Apenas leitura de disco — não roda `npm install`, Terraform nem smoke HTTP.

**Automação (`--json`, V2.5):** `project-factory doctor --json` imprime um único objeto JSON em stdout (`ok`, `exitCode`, `findings`, `summary`, etc.). Se a linha de comando for inválida (ex.: flag desconhecida), com `--json` a CLI ainda imprime um objeto JSON de erro em stdout e retorna código ≠ 0 — o mesmo contrato vale para `upgrade --dry-run --json` abaixo. Sem `--json`, o comportamento e a saída humana permanecem como antes.

### Defasagem de templates (`upgrade --dry-run`)

Compara `.project-factory.json` do **projeto gerado** com os `template.json` atuais sob `templates/` do factory (stack + camadas `infraTemplates`). Não altera arquivos.

Na raiz do projeto gerado (ou com caminho explícito), após `npm run build:cli` no factory:

```bash
node cli/dist/cli.js upgrade --dry-run
node cli/dist/cli.js upgrade --dry-run ./meu-projeto --debug
```

Se a CLI não estiver ao lado de `templates/` (ex.: pacote isolado), passe a raiz do repositório do factory:

```bash
node cli/dist/cli.js upgrade --dry-run --factory-root /caminho/do/project-factory
```

**Códigos de saída:** `0` = comparação ok e nenhuma versão de template **atrás** do factory; `1` = erro de leitura/metadata ou **há** defasagem semver (versão no projeto menor que a do `template.json` do factory) em stack ou infra. `project-factory upgrade --dry-run` também funciona via bin.

**V3.1 — `applicationModules`:** o dry-run compara também cada entrada de `applicationModules` no `.project-factory.json` com o `module.json` atual em `templates/application-modules/<id>/`. Componentes com label **`app:<id>`** (igual a `stack:` / `infra:`); ids fora do catálogo geram **erro** em `errors[]`, sem novo tipo de `compare`.

**Automação:** `project-factory upgrade --dry-run --json` emite um único JSON em stdout (`ok`, `upgradeStatus`, `components`, `summary`, etc.), alinhado aos mesmos códigos de saída do modo texto.

O relatório inclui linha **`Upgrade status:`** (`UP TO DATE`, `BEHIND` ou `FAILED`), risco por componente atrasado (MAJOR → **HIGH**; MINOR/PATCH → **LOW**) e **`Summary risk (worst case):`** quando há defasagem.

### Visão consolidada (`inspect`, V2.7)

Um único comando combina **contrato mínimo** (`doctor`) e **defasagem de templates** (`upgrade --dry-run`), só leitura — não altera arquivos nem substitui os subcomandos.

```bash
node cli/dist/cli.js inspect
node cli/dist/cli.js inspect /caminho/do/meu-projeto --factory-root /caminho/do/project-factory
project-factory inspect --json .
```

**Código de saída:** `0` apenas se **ambos** passarem (mesmo critério que `doctor` e `upgrade --dry-run` em conjunto); `1` se houver erro de contrato **ou** erro/defasagem na comparação com o factory.

**`inspect --json`:** um objeto em stdout com `ok`, `exitCode`, `projectRoot`, `templatesRoot` e os payloads aninhados `doctor` e `upgrade` (mesmo formato que `doctor --json` e `upgrade --dry-run --json`, incluindo drift de **`applicationModules`** em `upgrade.components`). Erros de parse/CLI com `--json` seguem o contrato habitual em stdout.

## Variáveis mínimas (`.env`) para subir a API

O `env.ts` valida na subida. Para desenvolvimento local, copie `.env.example` → `.env` e ajuste.

| Variável | Obrigatória (schema) | Descrição |
|----------|----------------------|-----------|
| `JWT_SECRET` | Sim (≥16 chars no stack; **≥32** se o módulo **`auth-jwt`** estiver presente — ver [docs/application-modules.md](docs/application-modules.md)) | Segredo simétrico HS256 para Bearer externo / legado conforme template |
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

<a id="terraform-quality-gate-v24"></a>

## Terraform: quality gate (V2.4)

Validação **leve** dos módulos AWS copiados pelo factory (sem `apply`, sem credenciais AWS para o `validate`):

- Script `scripts/terraform-templates-check.cjs` gera um app temporário com preset **`internal-enterprise`** (tokens já substituídos), lista pastas `infra/aws/*` que contêm `.tf` e, em cada uma, roda `terraform fmt -check`, `terraform init -backend=false` e `terraform validate`.
- **Local:** `npm run check:terraform` — se o executável `terraform` não estiver no PATH, o script imprime `SKIP` e sai **0** (não quebra o fluxo sem Terraform).
- **CI:** o workflow em `.github/workflows/project-factory-ci.yml` inclui o job `terraform-templates` (Terraform 1.9.x + `npm run check:terraform`). O primeiro `init` baixa providers (rede).

Isto não substitui `plan`/`apply` na sua conta; apenas aumenta a chance de pegar erros de sintaxe/formatação antes de merge. Se o clone do factory viver **dentro** de um monorepo (ex.: pasta `project-factory/`), ajuste `defaults.run.working-directory` e `cache-dependency-path` no workflow para apontar para essa pasta.

## Versionamento (CLI × template)

- **`generatorVersion`** vem do pacote **`cli/`** (release do motor da CLI).
- **`template`** e **`templateVersion`** vêm do **`template.json`** do stack (ex.: `api-node-express`) — o boilerplate pode subir versão sem mudar a CLI, e vice-versa.

Leia [docs/VERSIONING.md](docs/VERSIONING.md) (impacto para quem mantém projetos gerados) e [docs/UPGRADE_VISION.md](docs/UPGRADE_VISION.md) (visão de **`upgrade` aplicável** ao repo — **não** implementado; hoje usa-se `upgrade --dry-run` / `inspect` só leitura).

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
| `cli/` | Motor da CLI: cópia, substituição `{{PLACEHOLDER}}`, validações, comandos `doctor` / `inspect` / `upgrade`. |
| `templates/api-node-express/` | App HTTP mínima (Express, health, ping, Sequelize, Jest) + `template.json`. |
| `templates/application-modules/*` | Módulos opcionais (`swagger-rich`, `auth-jwt`, `observability-basic`, …): `module.json` + ficheiros sob `src/`. |
| `templates/infra/aws/*` | Terraform por camada; copiado só se selecionado; cada camada tem `template.json`. |

Placeholders principais: `PACKAGE_NAME`, `PROJECT_SLUG`, `API_TITLE`, `API_DESCRIPTION`, `API_VERSION`, `APP_PORT`, `AWS_REGION`.

Validações na CLI (fail fast): destino inexistente ou pasta vazia; caminho relativo sem `..`; nome de pacote npm (kebab-case); infra e flags conhecidas; placeholders `{{TOKEN}}` remanescentes após a geração.

## Resolução de problemas (curto)

| Situação | O que fazer |
|----------|-------------|
| `command not found` / ajuda da CLI | Na raiz do factory: `npm run build:cli` depois `node cli/dist/cli.js --help`. |
| `doctor` / `inspect` a falhar no projeto | Confirma que corres na **raiz do app gerado** e que `.project-factory.json` e `package.json` existem. |
| Erros de placeholder `{{…}}` | A geração deve abortar com lista de ficheiros; corrige tokens em `templates/` ou flags passadas ao `create`. |
| `upgrade --dry-run` não encontra templates | Passa `--factory-root` com o caminho do clone do **project-factory** (pasta que contém `templates/`). |
| Terraform local | Se não tiveres `terraform` no PATH, `npm run check:terraform` faz **SKIP** (exit 0); na CI com Terraform instalado valida `fmt`/`validate`. |

## Contribuir (equipa interna)

1. Lê [docs/GENERATION_CONTRACT.md](docs/GENERATION_CONTRACT.md) e [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md).
2. Alterações que mexam em contrato ou smoke: atualiza [docs/GENERATION_CONTRACT.md](docs/GENERATION_CONTRACT.md) e, se aplicável, [docs/BETA_RELEASE_CHECKLIST.md](docs/BETA_RELEASE_CHECKLIST.md).
3. Novos módulos ou stacks: segue [docs/application-modules.md](docs/application-modules.md) e padrões em `docs/architecture/`.

## Evolução

- Novas stacks (Java/Spring): novo template em `templates/stacks/...` + entrada em `cli/src/registry.ts`.
- Novos providers: novas pastas sob `templates/infra/<provider>/` sem alterar o contrato do motor (`generate.ts`).
