# Visão futura: `project-factory upgrade` (não implementado)

Este documento **não descreve código em produção**. É um desenho objetivo para evolução sem acoplar a CLI atual a um motor de migração.

## Objetivo do comando (futuro)

`project-factory upgrade` (ou equivalente) aplicaria, **com confirmação explícita**, atualizações de boilerplate sobre um repositório já gerado, respeitando o que está em `.project-factory.json`.

## Como detectar projeto “desatualizado”

1. Ler `.project-factory.json` no repositório alvo (`template`, `templateVersion`, `infraTemplates`, `generatorVersion`).
2. Comparar com os manifests atuais no **mesmo** repositório `project-factory` (ou com uma release publicada): `templates/**/template.json`.
3. “Desatualizado” = pelo menos um de:
   - `templateVersion` < versão atual do mesmo `template` (por semver, com regra de MAJOR definida pelo time).
   - `infraTemplates[i].version` < versão atual da mesma camada.
4. **Não** confundir: CLI mais nova não implica template mais novo; por isso a comparação é sempre **template × template**, não só `generatorVersion`.

## Como aplicar migração incremental (conceito)

- **Não** substituir o repositório inteiro (perderia código de negócio).
- Manter um catálogo **manual** de “receitas” por intervalo de versão, ex.: `1.0.x → 1.1.0`: lista de operações (adicionar arquivo, mesclar trecho, rodar script).
- Fluxo conceitual:
  1. Validar git limpo (ou branch de trabalho).
  2. Para cada salto de versão necessário (ex.: 1.0.0 → 1.1.0 → 2.0.0), executar a receita correspondente ou abortar se MAJOR exigir intervenção humana.
  3. Atualizar `.project-factory.json` só ao final de um upgrade bem-sucedido.
- Conflitos e customizações locais ficam para o desenvolvedor; o comando pode apenas **avisar** e gerar diff/patch sugerido.

## O que a V1 já deixa pronto

- Metadados estáveis (`template`, `templateVersion`, `infraTemplates`) para saber **de onde** partir.
- Semver estrito nos `template.json` para comparações previsíveis.
- Documentação de intenção (este arquivo) sem obrigar dependências nem lógica complexa na CLI hoje.

Quando houver demanda real, implementar o mínimo viável (ex.: apenas relatório `upgrade --dry-run` que lista divergências) antes de qualquer aplicação automática.
