# Versionamento: CLI × template

O `project-factory` separa de propósito duas dimensões de versão, todas refletidas em `.project-factory.json`:

| Campo | Origem | O que significa |
|--------|--------|------------------|
| `generator` | Constante (`project-factory`) | Produto / ferramenta que criou o projeto. |
| `generatorVersion` | `cli/package.json` | Release da **CLI** (motor de cópia, validações, flags). |
| `template` | `template.json` do stack (ex.: `api-node-express`) | **Qual** boilerplate de aplicação foi usado. |
| `templateVersion` | mesmo `template.json` | **Qual release** daquele boilerplate (semver `MAJOR.MINOR.PATCH`). |
| `infraTemplates` | `template.json` de cada camada copiada | Versão declarada de cada stack Terraform incluída. |

## Por que isso importa para o usuário

- **Atualizar a CLI** (novo `generatorVersion`) pode trazer correções no gerador sem mudar o conteúdo do template; o projeto já gerado **não muda** até você gerar de novo ou aplicar uma futura migração.
- **Atualizar o template** (novo `templateVersion`) significa mudança no boilerplate (estrutura, dependências, convenções). Projetos antigos continuam com o `templateVersion` com que foram gerados — isso é o registro para suporte e para futuras ferramentas de *upgrade*.
- **Breaking changes** no template devem ser refletidos em bump de **MAJOR** em `templateVersion` (convenção; a CLI não implementa política automática além de validar formato semver nos manifests).

## Compatibilidade com gerações antigas

Projetos gerados antes deste modelo podem ter `generator` igual ao nome do pacote npm e/ou o objeto `stackTemplate` em vez de `template` + `templateVersion`. Ferramentas e humanos devem tratar esses registros como legado.

## Linha de proveniência (stderr)

Ao gerar, a CLI imprime uma linha em **stderr** com produto, versão da CLI e template@versão — útil em CI e logs, sem abrir o JSON.

## Leitura adicional

- [UPGRADE_VISION.md](UPGRADE_VISION.md) — desenho **não implementado** do comando `project-factory upgrade` e migração incremental.
- [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) — contrato mínimo validado no smoke.
