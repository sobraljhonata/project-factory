# Lessons Learned — Project Factory Backend/API

Documento de **fecho** da fase backend/API até ao estado comunicado como **Beta Internal Stable** (stack `api-node-express` 1.0.8, Web Core Contract V3.5.3). Escrito para **maintainers** e para quem herdar o **frontend factory** — não é marketing nem auto-celebração.

---

## 1. Contexto

O **project-factory** cresceu a partir de um **CLI de geração** com template único (`api-node-express`), metadata em **`.project-factory.json`**, e **semver** nos `template.json`. Com o tempo acrescentou-se: **presets** de infra, **camadas Terraform** copiadas (sem `apply` no factory), **`--module`** para módulos opcionais de aplicação, **`doctor`**, **`upgrade --dry-run`**, **`inspect`**, saídas **`--json`** para CI, **`npm run test:cli`** e **smoke** de geração.

A linha **V3.5** consolidou contratos no runtime e na doc: **envelope de erro** (`AppError`, subclasses, `http-helper` alinhado), **query** (schemas reutilizáveis, strict opt-in por rota), **`safeHeaders`** (sem remover `headers` cru). O **`upgrade` que altera ficheiros no repo gerado** **não** foi implementado; existe **visão** em `UPGRADE_VISION.md` e **apenas dry-run** na CLI.

Hoje o produto posiciona-se como **beta interna estável** no eixo backend/API: útil para gerar e para **inspeccionar drift**, com limites explícitos em `BETA_SCOPE.md` e playbook em `adoption-playbook.md`.

---

## 2. O que funcionou muito bem

- **Incrementos pequenos e rastreáveis:** releases documentadas no `CHANGELOG.md` com ligação a `templateVersion` (e módulos quando aplicável) permitem saber *o que* mudou sem arqueologia de git.
- **Separar `generatorVersion` e `templateVersion`:** a CLI pode evoluir sem reescrever o boilerplate; o boilerplate pode evoluir sem confundir com “nova versão do gerador”. Ver `VERSIONING.md` e `versioning-policy.md`.
- **Módulos opcionais com costura explícita** (`middlewares.ts`, `env.ts` onde necessário): **não** há auto-discovery mágico — o que está activo é **legível** no código. Reduz surpresas em revisão e em debug.
- **`doctor` + `upgrade --dry-run` + `inspect`:** deram **higiene** e **visibilidade de drift** antes de existir qualquer “upgrade apply”. Para uma beta interna, isso foi **suficiente** durante muito tempo.
- **Contrato HTTP centralizado** (`web-core-contract.md`): depois da V3.5, passou a haver **uma** referência para ordem de middlewares, envelopes, query e headers — alinhada ao código quando o runtime foi actualizado (V3.5.1–3.5.3).
- **`safeHeaders` sem quebrar compatibilidade:** acrescentar superfície segura e marcar `headers` como legacy no tipo/JSDoc foi **baixo risco** e endereçou vazamento *accidental* em controllers sem tocar no pipeline Express nem no `auth-jwt`.
- **Testes de CLI e smoke no factory:** barreira objectiva antes de merge; reduz regressões em geração e placeholders.
- **Limites escritos** (`BETA_SCOPE.md`): “não prometemos upgrade automático” evita expectativa falsa e desvia energia para fluxos reais (dry-run + merge manual).

---

## 3. O que demoramos a aprender

- **Drift como problema de primeira classe:** projectos gerados **ficam** na versão em que nasceram; sem `upgrade` aplicável, a **defasagem** entre equipas só aparece quando alguém corre `upgrade --dry-run` ou `inspect`. O playbook e a política de versionamento chegaram **tarde** relativamente ao volume de features no template — não são “erro”, mas foram **correcções de maturidade**.
- **Documentação vs. código:** a **V3.5.0** foi *doc-only* para alinhar linguagem antes de mexer no runtime — isso **funcionou**, mas também mostrou que **atrás** havia período em que o comportamento e a doc podiam divergir. A lição é: **contrato explícito cedo** paga juros.
- **Dois códigos de 400** (`VALIDATION_ERROR` no body vs `INVALID_QUERY` na query): semanticamente correctos, mas exigem **disciplina** em observabilidade e em clientes; não é bug, é **custo cognitivo** a documentar.
- **Node README vs. CI:** tensão entre `engines` (20+) e o Node usado no CI (22) gera fricção de “funciona aqui” — matriz explícita ou alinhamento reduz suporte informal.

---

## 4. Decisões corretas

- **Express visível** e **sem framework interno** por cima do pipeline: menos magia, menos superfície para o gerador ter de gerar “framework code”.
- **Módulos opcionais** em pastas com `module.json` e cópia **após** o stack base: evita forkar o template inteiro para cada extensão.
- **`upgrade --dry-run` antes de qualquer `upgrade` apply:** evitou comprometer-se com um motor de migração **antes** de haver receitas e disciplina semver.
- **Web Core Contract como documento normativo** e depois **alinhar runtime** (V3.5.1+) sem reescrita violenta dos controllers.
- **Semver estrito nos manifests** usado pela CLI na comparação de drift — base para qualquer futuro patch/upgrade.
- **Smoke e contrato de geração** (`GENERATION_CONTRACT.md`): definem “mínimo aceitável” sem prometer o mundo.

---

## 5. Decisões evitadas com sucesso

- **Plugin system genérico** ou marketplace de módulos: teria desviado recursos para infraestrutura de produto em vez de **templates úteis** e **CLI fiável**.
- **`upgrade` automático “mágico”** sem receitas e sem git discipline: alto risco de corrupção de repos e de confiança.
- **Redis / OpenTelemetry / camadas pesadas** no template base **por defeito**: aumentariam dependências operacionais e o custo de *onboarding* de cada serviço gerado.
- **Esconder Express** atrás de abstracções grossas: dificulta adopção por devs que já sabem Express e aumenta o que o factory tem de manter.

---

## 6. O que faríamos diferente hoje

- **Playbook de adopção + política de versionamento** desde cedo (hoje existem como `adoption-playbook.md` e `versioning-policy.md` — idealmente teriam acompanhado o **primeiro** uso multi-equipa).
- **Métricas mínimas de adopção** (mesmo manuais): quantos repos com `doctor` no CI, quantos `templateVersion` atrás do head — para **priorizar** documentação vs. código.
- **Roadmap explícito e curto** (hoje em `roadmap.md`): reduz interpretações fantasiosas do que “vai sair no próximo sprint”.
- **Alinhar Node documentado e CI** cedo, ou documentar explicitamente “suportado = CI”.

*(Não implica que as escolhas passadas fossem “erradas”; são **ajustes de ordem** com o conhecimento actual.)*

---

## 7. Heurísticas para o Frontend Factory

- **Começar com um caminho feliz** (um template, uma stack) antes de generalizar.
- **Contrato em texto** (equivalente ao Web Core) **antes** ou **em paralelo** com o segundo grande refactor de runtime — “doc-only” primeiro **quando** o risco de divergência for alto.
- **Módulos opcionais + costura explícita** se o ecossistema de extensões crescer; evitar auto-loading opaco.
- **Comandos só leitura** (diagnóstico, drift) **antes** de ferramentas que escrevem no repo do utilizador.
- **Compatibilidade por defeito:** campos novos opcionais, deprecações com período de leitura dupla (como `headers` vs `safeHeaders`).
- **Feature com sponsor:** um consumidor interno nomeado evita inventário morto.
- **Evitar hype** no README: estado do produto e limites claros poupam meses de expectativa mal gerida.

---

## 8. Cultura que vale preservar

- **Pragmatismo:** o produto é gerador + templates, não plataforma enterprise genérica.
- **Honestidade documental:** `UPGRADE_VISION.md` e `BETA_SCOPE.md` dizem o que **não** existe — isso é **feature** de maturidade.
- **Changelog útil** por release, com ligação a versões de template e módulos.
- **Incrementos pequenos** com testes de CLI onde couber.
- **Revisão de PRs ancorada no contrato** (`web-core-contract.md` para HTTP; `GENERATION_CONTRACT` para geração).

---

## 9. Anti-patterns que aprendemos a evitar

- **Prometer upgrade** sem motor, receitas e critérios de conflito — gera **dívida social** com as equipas.
- **Documentar “roadmap futuro” como se já existisse** no código — confunde onboarding (a V3.5.0 corrigiu parte dessa tensão ao separar doc e runtime onde fez sentido).
- **Logging ou persistência de headers brutos** em domínio de controllers — mitigado com `safeHeaders`, mas a disciplina continua a ser **humana**.
- **Strict global em query** sem opt-in por rota — quebraria clientes ruidosos; a decisão de **strict por schema** foi a **saída certa**.

---

## 10. Resumo executivo

Construímos um **gerador interno credível**: geração com metadata versionada, extensões opcionais **legíveis**, ferramentas de **drift** sem mentir sobre upgrade, e uma **linha V3.5** que alinhou **documento e runtime** no contrato HTTP. Os maiores custos não foram “bugs espectaculares”, mas **drift**, **expectativa**, e **documentação vs. código** — mitigados, no fim, com **contrato explícito**, **playbook**, **política de versionamento** e **estado honesto** (Beta Internal Stable).

Para o **frontend factory**, o que mais importa exportar é: **caminho feliz primeiro**, **contrato claro**, **módulos opcionais explícitos**, **ferramentas só leitura antes de escrita**, e **verdade documental** sobre o que o produto **não** faz.

Se daqui a dois anos este ficheiro ainda for lido como referência, cumpriu o objectivo: **preservar o raciocínio do projeto**, não o ruído.
