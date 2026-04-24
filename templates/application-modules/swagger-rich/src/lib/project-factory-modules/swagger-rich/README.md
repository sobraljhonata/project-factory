# Módulo opcional `swagger-rich` (project-factory V3.2)

## O que faz

- Copia **`openapi.fragment.yaml`** para esta pasta (mesmo diretório que este README).
- O stack base (`src/core/config/swagger.ts`) faz **merge opcional** desse ficheiro com `swagger/base.yaml` quando o ficheiro existe.
- Sem o módulo (ou após apagar só o YAML), o Swagger volta a ser **apenas** o `base.yaml`.

## Valor

- **Tags** extra: `Conventions`, `Examples`.
- **`components.schemas`**: exemplo `ExamplePingEnvelope` (referencia `Meta` do base).
- **`components.responses`**: respostas reutilizáveis (`StandardBadRequest`, etc.) com **examples** simples para o Swagger UI.

## Remoção segura

1. Remover a pasta `src/lib/project-factory-modules/swagger-rich/` (ou desinstalar o módulo na próxima geração sem `--module swagger-rich`).
2. Ajustar `.project-factory.json` (`applicationModules`) se aplicável.
3. Não é necessário alterar `swagger.ts` — se o fragment não existir, o merge ignora-o.

Gerado por **project-factory** com `--module swagger-rich`.
