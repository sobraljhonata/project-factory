# Módulo opcional `auth-jwt` (project-factory V3.3)

## O que faz

- Verifica o header `Authorization: Bearer` + JWT em pedidos HTTP com algoritmo **apenas HS256** (allowlist explícita; algoritmo `none` rejeitado).
- Valida assinatura com **`JWT_SECRET`**, **`exp`**, e opcionalmente **`iss`** / **`aud`** se `JWT_ISSUER` / `JWT_AUDIENCE` estiverem definidos no ambiente.
- Preenche **`req.auth.payload`** (`JwtPayload`) quando o token é válido.
- Respostas **401** padronizadas: `{ error: { code, message }, meta: { correlationId } }`.

## O que não faz

Sem login, refresh, OIDC, JWKS remoto, cookies, base de dados de utilizadores ou RBAC. O emitente do JWT é **externo** a esta API.

## Variáveis de ambiente

| Variável | Obrigatório | Notas |
|----------|-------------|--------|
| `JWT_SECRET` | Sim (sempre no stack; **≥ 32 caracteres** quando este módulo está instalado) | Sem valor default seguro no código — gerar com `openssl rand -base64 48` (ou equivalente) e guardar em secret manager em produção. |
| `JWT_ISSUER` | Não | Se definido, o claim `iss` do token tem de coincidir. |
| `JWT_AUDIENCE` | Não | Se definido, o claim `aud` do token tem de coincidir (string). |

Ver também `.env.example` nesta pasta para placeholders comentados.

## Caminhos públicos (sem JWT)

- `GET /health`, `GET /ready`
- `GET …/ping` (ex.: `GET /api/v1/ping`)

Todas as outras rotas exigem Bearer válido.

## Remoção segura

1. Apagar a pasta `src/lib/project-factory-modules/auth-jwt/`.
2. Reverter as duas costuras no stack base (`env.ts` e `middlewares.ts`) se tiveres um fork sem o factory — num projeto **gerado pelo factory**, o próximo `create` sem `--module auth-jwt` não inclui estes ficheiros; para um projeto já existente, remove a pasta e ajusta `.project-factory.json` (`applicationModules`).
3. Opcional: remover `JWT_ISSUER` / `JWT_AUDIENCE` do `.env` se não forem usados por mais nada.

## Testar localmente

Gerar um JWT HS256 assinado com o mesmo `JWT_SECRET` (ferramenta externa ou script curto) e chamar uma rota protegida com o header `Authorization: Bearer …`.

Gerado por **project-factory** com `--module auth-jwt`.
