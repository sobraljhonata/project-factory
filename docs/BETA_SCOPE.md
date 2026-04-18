# Escopo da beta interna — project-factory

Este documento define o que a **beta interna** promete e o que fica **fora** do escopo, para uso por outros desenvolvedores no time com expectativas alinhadas.

## O que é a beta

Ferramenta de **geração** de projetos Node.js + Express + TypeScript a partir de templates versionados, com infra Terraform AWS **opcional** copiada para o repositório gerado — **sem** provisionar cloud nem aplicar `terraform apply` no seu nome.

## Escopo suportado (fluxos oficiais)

| Fluxo | Descrição |
|--------|-----------|
| **Gerar app novo** | A partir do clone do repositório `project-factory`, com `npm install`, `npm run build:cli` e `node cli/dist/cli.js <pasta> --yes --package-name <nome>` (ou modo interativo). Atalho: `npm run create-app -- <args>` (ver README). Destino: pasta **vazia** ou inexistente. |
| **Flags documentadas** | `--yes`, `--package-name`, `--title`, `--infra`, `--region`, `--debug` conforme README e `--help`. |
| **Stack atual** | Template `api-node-express` + camadas infra listadas na CLI **quando os diretórios existirem em `templates/`**. |
| **Validação automática no factory** | `npm run test:cli` e `npm run smoke` antes de merge/release relevante. |

## Garantias mínimas da beta

- **Geração previsível** enquanto o contrato em [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) for respeitado (arquivos esperados, metadados, ausência de placeholders `{{TOKEN}}`).
- **Falha explícita** (fail fast) em validações da CLI: destino, nome de pacote, região, infra desconhecida, placeholders remanescentes.
- **Rastreabilidade**: `.project-factory.json` com `generator`, `generatorVersion`, `template`, `templateVersion`, `infraTemplates`, `generatedAt` — ver [VERSIONING.md](VERSIONING.md).
- **Projeto gerado** passa no smoke do factory (`npm install`, `npm run check`, smoke HTTP `/health`) no ambiente do CI (Node 22 no workflow).

## Limites claros (o que a beta não é)

- **Não** é produto “estável” para consumo público sem revisão de release.
- **Não** há comando `upgrade` nem migração automática de projetos já gerados — ver [UPGRADE_VISION.md](UPGRADE_VISION.md).
- **Não** há suporte formal a versões de Node além das testadas no CI (hoje **Node 22** no workflow; README pede **Node 20+** — tratar como orientação; divergências podem existir).
- **Infra Terraform**: apenas **cópia** de arquivos; **não** há validação de `plan`/`apply` nem de credenciais AWS na beta.
- **Camada `terraformRemoteState`**: só está disponível se o diretório existir em `templates/`; caso contrário a geração falha ao selecionar — comportamento esperado até o template existir.

## Fluxos não suportados (use por sua conta)

- Gerar **em cima** de pasta com arquivos (a CLI exige destino vazio).
- Assumir **paridade** entre documentação de outro repositório e este factory sem verificar a versão do clone.
- Depender do modo **interativo** sem testes automatizados equivalentes ao `--yes` (menor cobertura de regressão).

## O que pode mudar após a beta

- Versões de `generatorVersion` e `templateVersion`, conteúdo de templates, flags da CLI e contrato documentado — sempre preferir **CHANGELOG** e ajuste de smoke/contrato quando mudar comportamento visível.

## Contrato resumido

| Artefato | Papel |
|----------|--------|
| [GENERATION_CONTRACT.md](GENERATION_CONTRACT.md) | O que uma geração “bem-sucedida” deve conter e o que o smoke valida. |
| [VERSIONING.md](VERSIONING.md) | Significado dos campos em `.project-factory.json`. |
| Este arquivo | Expectativa de beta interna e limites. |

Para checklist antes de marcar uma release beta interna, ver [BETA_RELEASE_CHECKLIST.md](BETA_RELEASE_CHECKLIST.md).
