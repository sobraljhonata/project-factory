# Módulo opcional `rate-limit-basic` (project-factory)

Limite de débit **in-process**, **por IP**, com **janela fixa** alinhada ao relógio (O(1) por pedido: contador + `windowStart`). **Sem Redis**, sem pacotes extra, sem variáveis de ambiente — só ficheiros copiados e **uma costura** em `middlewares.ts`.

**Versão 1.0.1:** o middleware corre **depois** do CORS no stack base, para respostas **429** incluírem cabeçalhos CORS quando o preflight/browser estiver em uso.

## O que faz (e o que não faz)

- Conta pedidos por IP por janela; acima do limite → **HTTP 429** com corpo JSON alinhado ao stack (`error` + `meta.correlationId`), cabeçalho **`Retry-After`** (segundos até ao fim da janela), **`RateLimit-Limit`**, **`RateLimit-Remaining`** e **`RateLimit-Reset`** (segundos até ao fim da janela actual, mesma base que `Retry-After` quando este é ≥ 1).
- **Bypass** (não contam para o limite): **`OPTIONS`**, **`/health`**, **`/ready`**, **`/ping`**, e paths que **terminam** em **`/ping`**. Na pipeline actual, **`OPTIONS`** é normalmente respondido pelo middleware **CORS** (204) **antes** de chegar aqui; o bypass mantém-se como defesa se a ordem mudar num fork.
- **Não** é proteção DDoS, **não** é quota por API key ou tenant, **não** coordena entre **várias instâncias** (cada réplica tem o seu contador; o limite efectivo multiplica-se pelo número de pods).

## Browsers e CORS

Com o rate limit **a seguir ao CORS**, pedidos `GET`/`POST`/… que recebam **429** já levam **`Access-Control-Allow-*`** definidos pelo `cors` quando a origem é permitida — o JavaScript no browser consegue **ler** o status e o corpo JSON (em vez de falha opaca só por CORS). Continua a ser necessário configurar **`CORS_ORIGINS`** (e ambiente) correctamente; o módulo **não** substitui política CORS.

## Limitações operacionais (ler antes de activar)

### IP e proxies

A chave é `req.ip` (fallback: `req.socket.remoteAddress`, depois `__unknown__`). Com **`trust proxy`** mal configurado ou tráfego sem cabeçalhos fiáveis, **todos os clientes** podem aparecer com o mesmo IP (ex.: IP do load balancer) → um cliente satura o balde para todos. Com **`trust proxy`** em rede **não** confiável, `X-Forwarded-For` pode ser **forjado**. Ajusta o Express (`trust proxy`) **só** atrás de proxies que reescrevem cabeçalhos de forma controlada.

### `__unknown__`

Pedidos sem `req.ip` nem `remoteAddress` caem na chave **`__unknown__`** — **todo** esse tráfego partilha **um** balde (pode gerar 429 cruzados entre clientes distintos).

### Memória

O mapa guarda entradas por IP; há **limite máximo de chaves** (`maxKeys`) com **eviction FIFO** quando se insere uma chave nova e o mapa está cheio, e **limpeza de buckets expirados** antes dessa inserção. Ataques com muitos IPs distintos ainda podem pressionar CPU; isto **limita crescimento**, não substitui WAF/gateway.

### Valores por defeito

`windowMs = 60_000`, `maxRequests = 600`, `maxKeys = 50_000` (definidos no código do módulo, sem `.env`). Para alterar, edita o módulo no projeto gerado ou remove o módulo e usa gateway / Redis noutra camada.

## Remover o módulo

1. Apagar `src/lib/project-factory-modules/rate-limit-basic/`.
2. Reverter a costura em `src/core/config/middlewares.ts` (bloco `rate-limit-basic`) se for fork manual.
3. Actualizar `.project-factory.json` (`applicationModules`) se aplicável.

---

Gerado por **project-factory** com `--module rate-limit-basic`.
