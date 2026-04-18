# Sobre este template

Este projeto foi gerado com o **project-factory** (CLI + templates versionados).

## O que significa `templateVersion`

Na raiz existe **`.project-factory.json`**. Os campos importantes:

- **`template`** — qual stack foi copiado (ex.: `api-node-express`).
- **`templateVersion`** — versão semver **desse** boilerplate no momento da geração (definida em `template.json` dentro do repositório do factory, não no seu app).
- **`generatorVersion`** — versão da **CLI** que rodou a cópia e as substituições. Pode mudar entre releases do factory sem mudar o seu código.

Assim, a CLI e o template **evoluem de forma independente**: você sabe exatamente com qual combinação o projeto foi criado.

## O que veio por padrão

- Estrutura de API Express
- Middlewares JWT (útil quando você adicionar rotas protegidas)
- Integração com banco
- Infraestrutura opcional AWS (se foi selecionada na geração)

## O que pode ser removido facilmente

- HATEOAS
- Módulos de infra não utilizados
- Partes do core não necessárias

## Infra

Se usar Terraform:

- Ler arquivos em `infra/aws/*`
- Seguir ordem sugerida na documentação das stacks (ex.: foundation antes de dependentes)

## Mais detalhes

No **repositório do project-factory** (não dentro do app gerado), consulte `docs/VERSIONING.md` e `docs/GENERATION_CONTRACT.md`.
