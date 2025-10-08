# Dockerfile

# 1. Estágio de Dependências
FROM node:20-slim AS deps
WORKDIR /app

# Instala o pnpm
RUN npm install -g pnpm

# Copia os arquivos de manifesto de pacote
COPY package.json pnpm-lock.yaml* ./

# Instala as dependências de produção
RUN pnpm install --frozen-lockfile


# 2. Estágio de Build
FROM node:20-slim AS builder
WORKDIR /app

# Instala o pnpm
RUN npm install -g pnpm

# Copia as dependências do estágio anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o build de produção
RUN pnpm build


# 3. Estágio de Produção
FROM node:20-slim AS runner
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Cria um usuário e grupo não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia a pasta standalone gerada pelo build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copia a pasta public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copia os assets estáticos do build
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Define o usuário para executar a aplicação
USER nextjs

# Expõe a porta que o Next.js usa
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
