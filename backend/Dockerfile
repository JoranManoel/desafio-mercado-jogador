FROM node:22-alpine

WORKDIR /app

# Instala dependências necessárias para compilação caso precisem
RUN apk add --no-cache libc6-compat

# Copia manifests e schema do Prisma
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma7.config.ts ./
COPY tsconfig*.json ./

RUN npm ci

# Copia código-fonte
COPY . .

# Gera o Prisma Client e compila a aplicação NestJS
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# Executa migrações no banco e inicia o backend em produção
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
