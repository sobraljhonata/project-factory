# Módulos opcionais de aplicação (convenção V3.2.1+ / V3.4)

Este documento formaliza o padrão **leve** usado pelo factory para módulos sob `templates/application-modules/<id>/`, com exemplos **`swagger-rich`** (OpenAPI), **`auth-jwt`** (Bearer JWT verify-only) e **`observability-basic`** (access log). Não há plugin system, auto-discovery nem hooks genéricos no core da CLI.

## Quem precisa ler

Equipa que adiciona novos módulos ao catálogo ou costura comportamento no template **`api-node-express`**. Nível alvo: júnior a pleno.

## 1. Papel de cada peça

| Peça | Função |
|------|--------|
| `cli/src/app-modules-catalog.ts` | Registo **explícito**: `ApplicationModuleId`, `dir` (`application-modules/<id>`), `label`. Cada módulo novo **obriga** a tocar aqui (sem magia). |
| `templates/application-modules/<id>/module.json` | `{ "id", "version" }` — mesma regra que `template.json`: semver; usado na geração e no **drift** (`upgrade --dry-run` / `inspect`). |
| Árvore sob `templates/application-modules/<id>/` | É copiada com `copyDir(módulo, raizDoProjeto)`. Tudo o que estiver **na raiz do template do módulo** (ao lado de `module.json`) aparece na **raiz do app gerado** — por isso o código deployável fica sob `src/...`. |
| `.project-factory.json` → `applicationModules` | Lista `{ id, version }` gravada na criação; o `doctor` valida; o upgrade compara com o `module.json` do factory. |
| Costura no runtime (template base) | **Ideal:** um ficheiro por módulo (ex.: `swagger.ts`). **Exceção documentada:** até **dois** ficheiros quando separar env e pipeline faz sentido (ex.: **`auth-jwt`**: `env.ts` + `middlewares.ts`). Sem dispersar `if (módulo X)` por controllers ou rotas de negócio. |

## 2. Estrutura recomendada (módulo “rico”)

```text
templates/application-modules/<id>/
  module.json
  src/lib/project-factory-modules/<id>/
    README.md              # obrigatório moral: o que o módulo faz, como remover, versão factory
    ... outros assets ...  # YAML, snippets, etc. — sempre sob src/ quando forem para o repo gerado
```

**Regra de ouro:** ficheiros que **não** devem ir para a raiz do projeto (OpenAPI, README do módulo, configs opcionais) ficam em `src/lib/project-factory-modules/<id>/`. O `module.json` fica só no template; a CLI **remove** `module.json` da raiz do output após cada cópia de módulo.

## 3. Como criar um módulo novo (checklist)

1. Criar `templates/application-modules/<novo-id>/` com a árvore acima.
2. Adicionar `module.json` com `"id"` igual ao nome da pasta canónica e `"version": "1.0.0"` (ou o semver inicial desejado).
3. Em **`app-modules-catalog.ts`**: incluir o id no tipo union, entrada `dir` + `label`.
4. Se o módulo precisar de comportamento em runtime: **um** ficheiro no stack base quando possível; se forem **dois** (env + pipeline), documentar no README do módulo. Consultar apenas ficheiros sob `src/lib/project-factory-modules/<id>/`, com **`existsSync` (ou equivalente)** concentrado — se o asset não existir, o comportamento permanece o do baseline.
5. Testes na CLI: catálogo, `generate` com/sem módulo, `create` com `--module`, `upgrade --dry-run` quando a versão do factory sobe (ver testes existentes para `swagger-rich`).

Não é obrigatório adicionar dependências npm ao app gerado; reutilizar o que o stack já traz.

## 4. Versionamento e drift

- Bump em **`module.json`** (`patch` / `minor` / `major`) quando o **conteúdo** do módulo ou o contrato esperado pelo utilizador mudar.
- O projeto guarda a versão **no momento do `create`** em `applicationModules`.
- `upgrade --dry-run` e `inspect` já comparam essa versão com a do factory (`readApplicationModuleManifest`) — **não** é preciso código extra por módulo para “detetar drift”, desde que o id esteja em `APPLICATION_MODULES`.

## 5. Costura no runtime sem poluir o core

- **Core** aqui = controllers, rotas genéricas, cadeia de middlewares “principal”. Evitar `if (moduleId)` espalhado.
- Preferir **um ficheiro de config** (ou bootstrap) que carregue dados opcionais a partir de `src/lib/project-factory-modules/<id>/`.
- O exemplo **`swagger-rich`**: `src/core/config/swagger.ts` faz merge opcional de `openapi.fragment.yaml`; se a pasta/YAML não existir, o Swagger é só o `base.yaml`.
- O exemplo **`auth-jwt`**: `env.ts` exporta `isProjectFactoryAuthJwtModuleInstalled()` e reforça `JWT_SECRET` (≥32 caracteres) quando o módulo existe; `middlewares.ts` faz `require` opcional de `jwt-verify-middleware.ts` e regista `registerBearerJwtVerify`.

### Helpers (opcional)

Com dois módulos ricos, ainda é aceitável repetir `path.resolve(__dirname, ...)` + `existsSync`. Se começar a doer, um **único** helper no template base (não na CLI), por exemplo:

- `resolveProjectFactoryModuleFile(__dirnameFromConfigFile, moduleId, ...relativeSegments)`

suficiente — **sem** framework, **sem** registry em runtime. Só introduzir quando a repetição for real; não é obrigatório na V3.2.1.

## 6. Exemplo mental: `swagger-rich`

- Catálogo → `application-modules/swagger-rich`
- Assets → `src/lib/project-factory-modules/swagger-rich/openapi.fragment.yaml` + `README.md`
- Costura → só `swagger.ts`
- Drift → bump `module.json` quando o fragment ou o contrato OpenAPI mudarem

## 7. Exemplo mental: `auth-jwt` (V3.3)

- Catálogo → `application-modules/auth-jwt`
- Assets → `jwt-verify-middleware.ts`, `express-auth.d.ts`, `README.md`, `.env.example`
- Costura → `env.ts` + `middlewares.ts` (verify-only; sem login/OIDC)
- Drift → bump `module.json` quando a política de verificação ou contrato HTTP mudarem

## 8. Exemplo mental: `observability-basic` (V3.4)

- Catálogo → `application-modules/observability-basic`
- Assets → `access-log-middleware.ts`, `README.md`, testes opcionais no módulo
- Costura → **só** `middlewares.ts` (após `correlationIdMiddleware`; `require` condicional)
- Drift → bump `module.json` quando o formato de log ou exclusões (`/health`, `/ready`, `/ping`) mudarem

## 9. Próximos módulos

Manter o mesmo desenho: README claro, assets sob `src/lib/project-factory-modules/<id>/`, costura mínima no stack, semver em `module.json`. Fora de escopo: módulos remotos, dependências entre módulos, registry em runtime, AST, plugin system.

## 10. Referências no código

- Cópia e metadata: `cli/src/generate.ts` (loop `appModules`, `readApplicationModuleManifest`).
- Catálogo: `cli/src/app-modules-catalog.ts`.
- Drift: `cli/src/upgrade-dry-run.ts` (componentes `app:<id>`).
- Exemplos: `templates/application-modules/swagger-rich/`, `templates/application-modules/auth-jwt/`, `templates/application-modules/observability-basic/`.
- Costuras: `templates/api-node-express/src/core/config/swagger.ts`; `env.ts` + `middlewares.ts` (auth-jwt); `middlewares.ts` (observability-basic).
