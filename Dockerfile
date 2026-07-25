# Stage 1: Backend build
FROM node:20-alpine AS backend-build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build

# Stage 2: Frontend build
FROM node:20-alpine AS frontend-build

WORKDIR /app

RUN apk add --no-cache openssl

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache openssl

# Production dependencies only (no devDependencies)
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Prisma runtime files (needed for migrations + queries)
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Migration files
COPY prisma ./prisma

# Backend build output
COPY --from=backend-build /app/dist ./dist

# Frontend build output → served as static public directory
COPY --from=frontend-build /app/dist ./dist/public

# Entrypoint
COPY docker-entrypoint.sh ./
RUN mkdir -p /app/uploads && chown -R node:node /app
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["./docker-entrypoint.sh"]
