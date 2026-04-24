# Documentação — project-factory

Ponto de entrada para **toda** a documentação do repositório. O [README principal](../README.md) cobre quick start e comandos; aqui organizamos por **intenção** e nível.

## Começar (todos)

| Documento | Para quê |
|-----------|----------|
| [../README.md](../README.md) | Instalar, gerar o primeiro app, presets, módulos, `doctor` / `inspect` / `upgrade --dry-run`, smoke |
| [BETA_SCOPE.md](BETA_SCOPE.md) | O que a beta promete e o que **não** promete |
| [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) | Contrato mínimo do que um projeto “gerado com sucesso” deve ter |
| [VERSIONING.md](VERSIONING.md) | `generatorVersion` vs `templateVersion`, metadata em `.project-factory.json` |
| [application-modules.md](application-modules.md) | Módulos opcionais (`swagger-rich`, `auth-jwt`, …): estrutura, costura, drift |

## Operar um projeto já gerado

| Documento | Para quê |
|-----------|----------|
| [UPGRADE_VISION.md](UPGRADE_VISION.md) | Visão de evolução (hoje: **sem** `upgrade` que altere ficheiros; use `upgrade --dry-run` + merge manual) |
| [BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md) | Checklist antes de uma release interna da beta |

## Terraform e CI

| Documento / recurso | Para quê |
|----------------------|----------|
| [README principal — secção Terraform](../README.md#terraform-quality-gate-v24) | `npm run check:terraform`, limites |
| Pastas `templates/infra/aws/*` | README por camada ao lado dos `.tf` |

## Arquitetura e decisões (pleno / senior)

| Documento | Para quê |
|-----------|----------|
| [architecture/cli-architecture.md](architecture/cli-architecture.md) | Desenho da CLI |
| [architecture/boilerplate-architecture.md](architecture/boilerplate-architecture.md) | Estratégia do boilerplate |
| [architecture/provider-strategy.md](architecture/provider-strategy.md) | Providers / módulos explícitos |
| [architecture/project-factory-goals.md](architecture/project-factory-goals.md) | Objetivos do produto |
| [architecture/stack-evolution-plan.md](architecture/stack-evolution-plan.md) | Evolução de stacks |
| [architecture/extraction-criteria.md](architecture/extraction-criteria.md) | Critérios de extração |
| [architecture/adr-template.md](architecture/adr-template.md) | Modelo de ADR |

## Meta / prompts (uso interno)

Ficheiros `prompt-*.md`, `revisao-prontidao.md`, `prompt-revisao.md` — orientam trabalho com IA ou revisões; **não** são o caminho principal de onboarding.

## Glossário rápido

| Termo | Significado |
|-------|-------------|
| **Stack** | Template Node (`api-node-express`) |
| **Infra layer** | Pasta Terraform sob `templates/infra/...` copiada se selecionada |
| **Application module** | Extensão opcional sob `templates/application-modules/<id>/` |
| **Drift** | Comparar versões no `.project-factory.json` com o factory (`upgrade --dry-run`, `inspect`) |
