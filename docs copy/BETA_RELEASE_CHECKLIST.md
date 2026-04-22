# Checklist — Release Beta Interna

## 📦 Pré-requisitos

- [ ] Node compatível com `engines`
- [ ] Repositório atualizado (`main` limpo)
- [ ] Lockfile consistente (`package-lock.json` ou equivalente)

---

## 🔧 Validação técnica

- [ ] `npm ci`
- [ ] `npm run build:cli`
- [ ] `npm run test:cli`
- [ ] `npm run smoke`

---

## 🧪 Validação manual (obrigatória)

```bash
TMP_DIR=$(mktemp -d)

node cli/dist/cli.js "$TMP_DIR/app" --package-name test-app --yes

cd "$TMP_DIR/app"

npm install
npm run dev

# Checklist — release beta interna

Documento para **mantenedores** do `project-factory`. Use antes de comunicar uma nova beta interna, criar tag de time ou anunciar mudanças relevantes para outros desenvolvedores.

---

## Pré-requisitos

- **Repositório:** clone atualizado do `project-factory` (branch que será considerada “release”).
- **Node.js:** versão compatível com `engines` do `package.json` (≥ 20); ideal alinhar ao CI (Node 22) quando possível.
- **Dependências:** lockfile (`package-lock.json`) íntegro; preferir `npm ci` em ambiente limpo para reproduzir o CI.
- **Ferramentas:** apenas o que o projeto já exige (npm, git). Não é necessário AWS/Terraform rodando para validar a release do **gerador** (smoke não aplica infra na cloud).
- **Documentação:** alterações de comportamento visível devem estar refletidas no [CHANGELOG.md](../CHANGELOG.md) antes de “fechar” a release.

---

## Passos para validar release beta

Execute **na raiz** do repositório `project-factory/`:

1. Instalar dependências: `npm ci` (ou `npm install` se não usar lock rígido).
2. Compilar a CLI: `npm run build:cli`.
3. Testes unitários da CLI: `npm run test:cli`.
4. Smoke E2E (geração + `npm install` + `check` + HTTP no app gerado): `npm run smoke`.
5. Revisar manualmente:
   - [CHANGELOG.md](../CHANGELOG.md) com entrada para esta release (quando houver mudanças notáveis).
   - Se mudou template ou contrato: [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) e asserts do smoke coerentes.
   - Se mudou metadados `.project-factory.json`: [VERSIONING.md](VERSIONING.md) e, se aplicável, [BETA_SCOPE.md](BETA_SCOPE.md).

**Opcional (recomendado em mudanças grandes de template):** gerar um app em pasta temporária (`node cli/dist/cli.js /tmp/minha-api --yes --package-name minha-api`), entrar na pasta, `npm install`, `npm run dev`, validar `GET /health`.

---

## Critérios de aceite

A release beta interna **só é considerada aceita** se:

| Critério | Verificação |
|----------|-------------|
| Build da CLI | `npm run build:cli` conclui sem erro. |
| Testes da CLI | `npm run test:cli` — todos os testes passam. |
| Smoke | `npm run smoke` — exit code 0 (contrato de geração + app gerado utilizável no fluxo automatizado). |
| Rastreabilidade | Changelog atualizado quando a mudança afeta quem consome o gerador ou o template. |
| Documentação crítica | Contrato / versionamento / escopo beta atualizados quando o comportamento prometido mudou. |

**Fora do escopo desta checklist (não bloqueiam a beta do gerador):** `terraform plan/apply`, deploy em cloud, validação de múltiplas versões de Node em paralelo (salvo política do time).

---

## Rollback simples

Objetivo: voltar a um estado **conhecido** (commit/tag anterior) sem processo pesado.

1. **Antes da release:** garantir que o histórico no Git está pushado e que uma **tag** ou **commit** de referência está claro (ex.: tag `project-factory-0.1.0` ou anotação no CHANGELOG com hash).
2. **Se a beta já foi anunciada e há problema:**
   - `git revert` dos commits problemáticos **ou**
   - `git checkout <commit-ou-tag-anterior>` em branch de hotfix e novo merge, conforme política do time.
3. **Comunicação:** atualizar o [CHANGELOG.md](../CHANGELOG.md) com uma linha do tipo “Revertido / corrigido em …” e avisar o canal interno.
4. **Quem gerou projetos com a beta ruim:** projetos já gerados **não** são alterados automaticamente; o rollback é do **repositório factory**, não dos apps criados. Orientar re-geração ou cherry-pick manual se necessário.

Não há artefato publicado em registry npm como parte obrigatória desta beta (`private`); o rollback é essencialmente **Git + comunicação**.

---

## Referências

- Escopo e limites da beta: [BETA_SCOPE.md](BETA_SCOPE.md)
- Contrato de geração: [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md)
