# Roadmap — project-factory (visão honesta)

Documento **editorial** para alinhar expectativas internas. **Não** substitui o [CHANGELOG.md](../CHANGELOG.md) nem compromissos de datas. Foco: **adoção** e **ROI**, não lista de features enterprise.

---

## Onde estamos (encerramento backend / API)

A **fase backend/API** do stack **`api-node-express`** considera-se **encerrada** em termos de contrato e runtime estáveis para a beta interna:

- **Web Core Contract** até **V3.5.3** ([web-core-contract.md](web-core-contract.md)): middlewares, envelopes, query, `safeHeaders`.
- Template **`api-node-express` 1.0.8** (`templates/api-node-express/template.json`).
- CLI com `create`, `doctor`, `upgrade --dry-run`, `inspect`; **sem** `upgrade` que altere ficheiros do cliente ([UPGRADE_VISION.md](UPGRADE_VISION.md)).

Trabalho futuro nesta stack = **manutenção** (PATCH/MINOR), bugs e alinhamento com o que os serviços gerados precisam — não uma “V4” imaginária sem dono.

---

## Próximo trimestre (prioridades reais)

1. **Adopção:** equipas a correr `doctor` / `inspect` nos repos piloto; [adoption-playbook.md](adoption-playbook.md).
2. **Versionamento:** PRs a seguir [versioning-policy.md](versioning-policy.md) + CHANGELOG.
3. **Drift:** continuar a usar `upgrade --dry-run`; receitas manuais de actualização até existir (se alguma vez existir) um `upgrade` aplicável mínimo.

---

## O que não entra neste roadmap

- Plataforma de módulos “marketplace”.
- Multi-cloud ou governance enterprise no CLI sem consumidor interno nomeado.
- Promessa de **upgrade automático** full sem desenho e orçamento explícitos.

---

## Próximo capítulo: **frontend factory**

**Linha de produto:** um futuro **frontend factory** (nome editorial) seria o **próximo capítulo** depois deste encerramento backend: gerador ou templates para **UI** (stack, convenções, eventualmente contrato semelhante ao Web Core para o cliente HTTP).

**Estado hoje:** **não iniciado** neste repositório; sem datas, sem stack escolhida, sem CLI unificada obrigatória. Serve para **comunicação interna** (“para onde olhamos depois”) sem obrigar roadmap técnico.

Quando houver decisão de investimento: abrir ADR ou secção nova neste ficheiro com **dono**, **stack-alvo** e **critério de sucesso** mensurável (ex.: primeiro repo gerado + CI verde).

---

## Leitura útil

- [BETA_SCOPE.md](BETA_SCOPE.md)
- [architecture/project-factory-goals.md](architecture/project-factory-goals.md)
