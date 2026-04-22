# {{API_TITLE}}

API Node.js + Express + TypeScript (template project-factory).

O arquivo **`.project-factory.json`** (raiz) registra o produto gerador, versões da **CLI** e do **template** (`template` / `templateVersion`), além de camadas infra copiadas — ver comentários no JSON ou a documentação do factory em `docs/VERSIONING.md`.

**Arquitetura:** `src/core/` é só infraestrutura mínima; regras de negócio vão em `src/modules/`. JWT e HATEOAS opcionais estão em `src/lib/` — ver [docs/CORE.md](docs/CORE.md).

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run dev
```

- Saúde: `GET /health` (não exige banco); readiness: `GET /ready` — com `READINESS_CHECK_DB=true` exige MySQL acessível; com `false`, retorna pronto sem checar DB.
- Exemplo de rota: `GET /api/{{API_VERSION}}/ping`
- Documentação OpenAPI (se `SWAGGER_ENABLED=true`): `/api-docs`

## Testes e build

```bash
npm run check
npm run build && npm run verify:dist
```

## Infraestrutura AWS (Terraform)

Os diretórios em `infra/aws/` (se gerados pela CLI) contêm stacks opcionais. Copie `terraform.tfvars.example` para `terraform.tfvars` e preencha valores reais — **não commite segredos**.

## Estrutura

- `src/core/` — HTTP, config, middlewares globais, Sequelize bootstrap (obrigatório para subir a API)
- `src/lib/` — JWT, HATEOAS e outros opcionais (código explícito; importe só o que usar)
- `src/modules/` — regras de negócio; registre rotas em `src/core/config/routes.ts` (imports `core` → `modules`, não o contrário)

Detalhes: [docs/CORE.md](docs/CORE.md) e [src/lib/README.md](src/lib/README.md).
