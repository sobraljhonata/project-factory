# Contributing

Antes de contribuir, leia o escopo da **beta interna**: [docs/BETA_SCOPE.md](docs/BETA_SCOPE.md). Índice geral da documentação: [docs/README.md](docs/README.md).

## Objetivo
Este repositório possui dois papéis:

1. Manter o gerador (CLI + templates)
2. Gerar novos projetos

---

## Como alterar templates

1. editar arquivos em templates/
2. rodar:
   npm run build:cli
3. gerar projeto de teste (pasta destino = primeiro argumento):
   `node cli/dist/cli.js ../_tmp/test-app --yes --package-name test-app`
   - opcional: `--debug` para stderr detalhado
4. validar de ponta a ponta:
   `npm run smoke`

   (alternativa manual: `npm install` e `npm run dev` no diretório gerado)

---

## Regra
Nunca alterar template sem validar geração real (`npm run smoke` ou fluxo equivalente).