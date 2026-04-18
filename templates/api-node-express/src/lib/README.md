# `src/lib/`

Utilitários e middlewares **opcionais** que **não** são carregados pelo `createApp` por padrão — código-fonte direto (sem magia); só use o que precisar e ajuste ao seu domínio.

- **`auth/`** — JWT Bearer + autorização por papel (`import … from "@/lib/auth"`).
- **`http/hateoas/`** — links de paginação para respostas estilo HATEOAS.

O **`core/`** permanece pequeno e sem impor autenticação ou REST rico; use `lib/` quando o seu módulo precisar.
