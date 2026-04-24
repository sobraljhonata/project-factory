# Contrato mínimo da geração (V1)

Este documento descreve o que o `project-factory` garante para um projeto **gerado com sucesso** (CLI conclui sem erro). É o mesmo critério validado de forma parcial pelos **testes da CLI**, pelo **smoke E2E** e pelo comportamento de **fail-fast** na geração.

Expectativas de **beta interna** (o que está dentro/fora do escopo): [BETA_SCOPE.md](BETA_SCOPE.md).

## Arquivos e estrutura

- O diretório de destino contém um app Node/Express copiado do template `api-node-express`.
- Deve existir `package.json` com o nome de pacote informado (`--package-name` / fluxo interativo) e scripts `check` e `smoke:http` (usados no CI do app e no smoke do factory).
- Deve existir `README.md` e `.env.example` (base para configuração local).

## Metadados do gerador

- Deve existir `.project-factory.json` na raiz do projeto gerado, contendo pelo menos:
  - `generator` — produto estável: `project-factory` (independente do nome do pacote npm da CLI);
  - `generatorVersion` — versão semver da CLI (`cli/package.json`);
  - `template` — id do stack copiado (ex.: `api-node-express`), de `templates/.../template.json`;
  - `templateVersion` — semver do mesmo manifest (evolução do boilerplate, independente da CLI);
  - `generatedAt` — timestamp ISO 8601 da geração (parseável por `Date.parse`);
  - `infraTemplates` — array de `{ id, version }` das camadas Terraform copiadas, na ordem selecionada (vazio se nenhuma);
  - `applicationModules` *(quando `--module` foi usado)* — array de `{ id, version }` dos módulos opcionais de aplicação copiados; o `doctor` valida quando presente; `upgrade --dry-run` compara com `templates/application-modules/<id>/module.json`.

O arquivo `template.json` **não** é copiado para o projeto gerado: ids e versões ficam em `.project-factory.json`, evitando duas fontes de verdade no app. Ver [VERSIONING.md](VERSIONING.md).

**Legado:** projetos mais antigos podem ter `generator` como nome npm e/ou `stackTemplate` em vez de `template` / `templateVersion`.

## Versionamento de templates (repositório factory)

- Cada template em `templates/` possui `template.json` com `id` (estável) e `version` (semver `MAJOR.MINOR.PATCH`).
- Ao subir versão de um template, incremente `version` e documente mudanças relevantes no changelog do factory ou do template; projetos já gerados continuam com os metadados da geração original.

## Placeholders

- Após a cópia e substituição de tokens, **não** deve restar nenhum padrão `{{TOKEN}}` com `TOKEN` em MAIÚSCULAS (regra alinhada a `assertNoUnresolvedPlaceholders` na CLI).
- Se sobrar placeholder, a geração **aborta** com mensagem listando arquivos.

## Smoke E2E (CI)

O script `npm run smoke` na raiz do repositório `project-factory` valida adicionalmente (após gerar com `--yes`):

- presença dos arquivos acima e coerência mínima de `package.json` (incl. scripts) e `.project-factory.json` (`generatedAt` válido, `template`, `templateVersion`, `infraTemplates`);
- ausência de placeholders não resolvidos no diretório gerado;
- `npm install` e `npm run check` no projeto gerado;
- subida do app e respostas de sucesso em `GET /health` (e fluxo definido em `smoke:http` do template).

## O que não é garantido na V1

- Infra Terraform não é aplicada nem validada em cloud.
- Comportamento interativo completo da CLI não é coberto por testes unitários (apenas `--yes` e helpers puros).
- Compatibilidade com versões futuras do Node/npm além das usadas no CI.

Para alterações neste contrato, atualize este arquivo, os asserts do smoke e os testes que espelham as mesmas regras.
