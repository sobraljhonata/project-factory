# Definition of Done — v0.1.0-beta.1

Esta definição estabelece os critérios mínimos para considerar a primeira beta interna do `project-factory` como pronta para uso por outros desenvolvedores.

---

## 🎯 Objetivo da beta

Permitir que desenvolvedores internos consigam:

1. gerar um novo projeto
2. instalar dependências
3. subir a aplicação localmente
4. entender a estrutura básica (core / lib / modules)
5. estender o projeto com novos módulos

Sem suporte a:
- upgrade automático
- multi-cloud completo
- fluxos avançados de produção

---

## ✅ Critérios obrigatórios

### CLI

- [ ] CLI gera projeto sem erro
- [ ] Fail fast ativo para:
  - diretório existente
  - placeholders não resolvidos
  - argumentos inválidos
- [ ] Flag `--debug` funcional
- [ ] Comando oficial documentado

---

### Projeto gerado

- [ ] Contém:
  - `package.json`
  - `.project-factory.json`
  - `README.md`
  - `.env.example`
- [ ] Nenhum `{{TOKEN}}` restante
- [ ] `npm install` funciona
- [ ] `npm run check` funciona
- [ ] `npm run dev` sobe aplicação
- [ ] `GET /health` retorna sucesso

---

### Arquitetura

- [ ] `core/` contém apenas infra mínima
- [ ] `lib/` contém apenas recursos opcionais
- [ ] `modules/` reservado para negócio
- [ ] Não há acoplamento de domínio no `core/`

---

### Versionamento

- [ ] `.project-factory.json` contém:
  - `generator`
  - `generatorVersion`
  - `template`
  - `templateVersion`
  - `generatedAt`

---

### Documentação

- [ ] README explica:
  - o que é
  - como usar
  - comando oficial
- [ ] `docs/BETA_SCOPE.md` define limites da beta
- [ ] `docs/GENERATION_CONTRACT.md` alinhado com smoke
- [ ] `docs/CORE.md` explica arquitetura
- [ ] `src/lib/README.md` explica opt-in

---

### Qualidade

- [ ] `npm run test:cli` passando
- [ ] `npm run smoke` passando
- [ ] CI executa testes e smoke

---

## ⚠️ Limitações conhecidas (aceitas na beta)

- modo interativo com menor cobertura de testes
- Terraform não validado em cloud
- sem comando de upgrade
- compatibilidade Node limitada ao ambiente documentado

---

## 🧠 Critério final

A beta é considerada pronta quando:

> um desenvolvedor que nunca viu o projeto consegue gerar e subir uma API funcional apenas seguindo o README.