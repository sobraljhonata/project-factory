# O que é `src/core/`

Camada **mínima de infraestrutura** compartilhada: Express, config, middlewares globais, contratos HTTP, erros, logger, Sequelize bootstrap, health/readiness.

## O que o core **faz**

- Sobe o app (`config/app.ts`), middlewares base, rotas mínimas de exemplo (`config/routes.ts`).
- Expõe contratos (`protocols/`), mapeamento de erros HTTP, correlation id.
- Conecta ao banco quando configurado (`database.ts`, `readiness`).

## O que o core **não faz**

- **Não importa** `src/modules/**` (regras de negócio ficam em módulos; o core não “conhece” o domínio).
- **Não inclui** JWT nem autorização por papel — isso está em **`src/lib/auth/`** (opcional).
- **Não inclui** padrões DDD pesados (Specification, etc.) — adicione no seu módulo se precisar.

## O que é `src/lib/`

Código **reutilizável opcional** que depende do core mas **não** é carregado automaticamente (não é “caixa preta”: são ficheiros normais; abra e leia antes de usar):

| Pasta | Conteúdo |
|-------|----------|
| `lib/auth/` | `authMiddleware`, `authorizeRoles` — use nas rotas que precisarem. |
| `lib/http/hateoas/` | `buildPaginationLinks` para respostas com links de paginação. |

## Como estender

1. Crie `src/modules/<contexto>/` (controllers, casos de uso, rotas).
2. Registre rotas em `src/core/config/routes.ts` importando apenas **seus** módulos (imports apontam de `core` → `modules`, nunca o contrário).
3. Use `@/lib/...` só quando precisar de JWT/HATEOAS; caso contrário mantenha a API enxuta.

## O que pode mudar com segurança

- Novos middlewares **transversais** em `core/http/middlewares/` se forem genéricos.
- Novos helpers **opcionais** preferencialmente em `lib/`.

## O que não deve ser “engordado” sem critério

- Lógica de negócio, validators de feature, agregação de rotas de vários contextos dentro do core — isso vira “framework interno” e dificulta evolução.
