FROM node:18-alpine AS builder

WORKDIR /app

# Copia todo o monorepo
COPY . .

# Instala dependências
RUN yarn install --frozen-lockfile

# Build apenas do server
RUN yarn build:server


# ============================
# Runtime
# ============================
FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

EXPOSE 3000

CMD ["yarn", "server:prod"]