# Checklist — Release Beta Interna

Documento para **mantenedores** do `project-factory`. Use antes de comunicar uma nova beta interna, criar tag de equipa ou anunciar mudanças relevantes.

## Pré-requisitos

- [ ] Repositório atualizado (branch que será considerada release).
- [ ] Node.js compatível com `engines` do `package.json` (≥ 20); ideal alinhar ao CI (Node 22).
- [ ] Lockfile (`package-lock.json`) íntegro; preferir `npm ci` em ambiente limpo.
- [ ] Ferramentas: npm e git (não é necessário AWS/Terraform na cloud para validar o **gerador**).
- [ ] [CHANGELOG.md](../CHANGELOG.md) reflete alterações de comportamento visível, quando aplicável.

## Validação técnica

- [ ] `npm ci`
- [ ] `npm run build:cli`
- [ ] `npm run test:cli`
- [ ] `npm run smoke`

## Validação manual (obrigatória)

```bash
TMP_DIR=$(mktemp -d)
node cli/dist/cli.js "$TMP_DIR/app" --package-name test-app --yes
cd "$TMP_DIR/app"
npm install
npm run dev
```

## Passos na raiz do repositório factory

Execute na raiz do clone `project-factory/`:

1. Instalar dependências: `npm ci` (ou `npm install` se não usares lock rígido).
2. Compilar a CLI: `npm run build:cli`.
3. Testes unitários da CLI: `npm run test:cli`.
4. Smoke E2E: `npm run smoke`.
5. Revisar:
   - [CHANGELOG.md](../CHANGELOG.md) com entrada para esta release (quando houver mudanças notáveis).
   - Se mudou template ou contrato: [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) e asserts do smoke coerentes.
   - Se mudou metadados `.project-factory.json`: [VERSIONING.md](VERSIONING.md) e, se aplicável, [BETA_SCOPE.md](BETA_SCOPE.md).

**Opcional (mudanças grandes de template):** gerar `node cli/dist/cli.js /tmp/minha-api --yes --package-name minha-api`, `cd /tmp/minha-api`, `npm install`, `npm run dev`, validar `GET /health`.

## Critérios de aceite

A release beta interna **só é considerada aceite** se:

| Critério | Verificação |
|----------|-------------|
| Build da CLI | `npm run build:cli` conclui sem erro. |
| Testes da CLI | `npm run test:cli` — todos os testes passam. |
| Smoke | `npm run smoke` — exit code 0. |
| Rastreabilidade | Changelog atualizado quando a mudança afeta quem consome o gerador ou o template. |
| Documentação crítica | Contrato / versionamento / escopo beta atualizados quando o comportamento prometido mudou. |

**Fora do escopo desta checklist:** `terraform plan/apply`, deploy em cloud, validação de múltiplas versões de Node em paralelo (salvo política do equipa).

## Rollback simples

Objetivo: voltar a um estado **conhecido** (commit/tag anterior) sem processo pesado.

1. **Antes da release:** histórico no Git pushado; tag ou commit de referência claro (ex.: anotação no CHANGELOG com hash).
2. **Se a beta já foi anunciada e há problema:** `git revert` ou branch de hotfix a partir do commit anterior, conforme política do equipa.
3. **Comunicação:** atualizar o [CHANGELOG.md](../CHANGELOG.md) com “Revertido / corrigido em …” e avisar o canal interno.
4. **Projetos já gerados:** não são alterados automaticamente; o rollback é do **repositório factory**, não dos apps criados.

Não há pacote npm público obrigatório nesta beta (`private`); o rollback é essencialmente **Git + comunicação**.

## Referências

- Escopo e limites da beta: [BETA_SCOPE.md](BETA_SCOPE.md)
- Contrato de geração: [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md)
- Índice de documentação: [README.md](README.md)
