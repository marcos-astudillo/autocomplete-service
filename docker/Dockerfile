# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar solo archivos necesarios para install
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

# Compilar TypeScript
RUN npm run build

# Eliminar dev dependencies y archivos innecesarios
RUN npm prune --production && \
    rm -rf src tests *.ts *.json !package*.json

# Stage 2: Production runtime
FROM node:20-alpine AS production

# Instalar dumb-init para graceful shutdown
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar solo lo necesario del builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Instalar solo producción
RUN npm ci --only=production && npm cache clean --force

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

USER nodejs
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
