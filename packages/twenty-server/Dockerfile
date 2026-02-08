FROM node:20-alpine

WORKDIR /app

# Copia o monorepo inteiro
COPY . .

# Ativa corepack (yarn moderno)
RUN corepack enable

# Instala dependências do workspace
RUN yarn install

# Build apenas do twenty-server
RUN yarn workspace twenty-server build

EXPOSE 3000

CMD ["yarn", "workspace", "twenty-server", "start:prod"]
