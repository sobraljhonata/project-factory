Atue como meu agente `boilerplate-architect`, especialista sênior em:

1. estrutura da CLI
2. perguntas interativas
3. opções obrigatórias e opcionais
4. como gerar arquivos
5. como organizar templates
6. como suportar providers diferentes
7. como evitar explosão de complexidade

### Etapa 4 — Plano de implementação
Monte um plano incremental contendo:

1. fase de extração
2. fase de limpeza
3. fase de template
4. fase de geração
5. fase de CLI
6. fase de expansão futura

## Regras obrigatórias

1. Não proponha um boilerplate acoplado demais ao projeto atual
2. Não copie tudo cegamente
3. Separe claramente:
   - core reutilizável
   - detalhes de projeto
   - detalhes de provider de infra
   - detalhes de linguagem/framework
4. Preserve extensibilidade futura
5. Não tente suportar AWS, Azure, on-prem e Java de forma completa logo de início
6. Priorize arquitetura evolutiva
7. Comece pequeno, mas com capacidade de crescer

## Forma obrigatória da resposta

# 1. Leitura arquitetural do projeto atual
- o que é reutilizável
- o que é específico
- o que está acoplado

# 2. Arquitetura proposta para o boilerplate
- núcleo
- módulos
- providers
- extensibilidade

# 3. Arquitetura proposta para a CLI
- inputs
- composição
- geração
- organização de templates

# 4. Plano incremental
- fase 1
- fase 2
- fase 3
- fase 4

# 5. Riscos e trade-offs
- o que pode dar errado
- como evitar overengineering

## Instrução final

Comece lendo a codebase real e proponha primeiro a arquitetura.
Não implemente ainda.