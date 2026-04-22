Atue como meu agente `boilerplate-architect`.

Agora quero a primeira versão prática do projeto gerador.

Escopo da V1:
- stack de API: Node.js + Express + TypeScript
- provider de infraestrutura: AWS
- opções de infraestrutura nesta fase:
  - Aurora
  - S3
  - foundation
  - Terraform
- ainda não implementar Azure nem Java
- apenas preparar a arquitetura para suportar isso no futuro

Quero que você:

1. extraia o boilerplate mínimo viável
2. preserve apenas o que realmente é reutilizável
3. generalize nomes e configurações específicas
4. proponha a estrutura de templates
5. proponha a estrutura do CLI para essa V1
6. implemente de forma incremental

Regras:
- não tente resolver tudo de uma vez
- não overengineer
- V1 precisa ser pequena, funcional e extensível
- separar claramente core, templates e infra provider AWS

Comece listando os arquivos que serão alterados/criados e a estratégia da V1.
Depois implemente.