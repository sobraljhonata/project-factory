# syntax=docker/dockerfile:1
# Fase 3 — imagem de produção para ECS Fargate (Node 22 + dist/)
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin nodejs

# Bundle RDS versionado no repo (atualize com curl do global-bundle se necessário).
# Não defina DB_SSL_CA_PATH na task: mysql2 usa o perfil "Amazon RDS" (aws-ssl-profiles) e evita self-signed com PEM errado.
COPY --chown=nodejs:nodejs certs/ /app/certs/

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Migrations na VPC (ECS Run Task / one-off): sequelize-cli + pasta versionada
COPY .sequelizerc ./
COPY database ./database
# package.json aponta db:migrate/db:seed para este wrapper (alinhado a NODE_ENV)
COPY --chown=nodejs:nodejs scripts/sequelize-with-node-env.cjs scripts/sequelize-with-node-env.cjs

USER nodejs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
