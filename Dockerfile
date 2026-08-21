# Stage 1: Backend build
FROM node:20-alpine AS backend-build

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm ci

COPY tsconfig.json tsconfig.ops.json ./
COPY src ./src
# Isletim betikleri (yedekleme, dogrulama, log dondurme).
COPY scripts ./scripts
COPY prisma ./prisma
# src/services/learningPath.ts bu klasordeki bir JSON'u import ediyor.
# Kopyalanmazsa derleme "TS2307: Cannot find module" ile duser.
COPY content ./content

RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build
# Isletim betikleri AYRI derleniyor -- gerekcesi tsconfig.ops.json icinde.
RUN npm run build:ops

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
# openssl: Prisma icin.
# postgresql16-client: pg_dump ve psql. Yedekleme betigi bunlari
#   cagiriyor ve imajda YOKTULAR -- yani "npm run backup:database"
#   sunucuda hic calisamazdi. Surum veritabaniyla ayni (pg16).
RUN apk add --no-cache openssl postgresql16-client

# Production dependencies only (no devDependencies)
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Prisma runtime files (needed for migrations + queries)
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Migration files
COPY prisma ./prisma

# Icerik manifestleri.
#
# CALISMA ANINDA da gerekli: tsconfig'de rootDir=./src oldugu icin tsc bu
# dosyalari dist'e kopyalamiyor, ama derlenen cikti
# require("../../content/learning-pilot-v1.json") diyor -- yani
# /app/content/ altinda durmalari sart. Yalniz derleme asamasina
# kopyalamak yetmez; imaj derlenir ama sunucu acilista MODULE_NOT_FOUND
# ile coker.
COPY content ./content

# Backend build output
COPY --from=backend-build /app/dist ./dist

# Isletim betikleri (derlenmis). tsx GEREKMIYOR: duz node ile calisiyorlar.
# Yedekler BACKUPS_DIR ile verilen klasore yaziliyor; compose orayi bir
# birime bagliyor, aksi halde yedekler kapsayiciyla birlikte silinirdi.
COPY --from=backend-build /app/dist/ops ./dist/ops

# Frontend build output → served as static public directory
COPY --from=frontend-build /app/dist ./dist/public

# Entrypoint
COPY docker-entrypoint.sh ./
# /app/BACKUPS burada OLUSTURULUYOR, sadece compose'da birim baglanmiyor.
#
# Sebebi: adlandirilmis bir birim, imajda VAR OLMAYAN bir klasore
# baglanirsa root sahipligiyle olusturulur. Kapsayici `node` kullanicisi
# olarak calistigi icin yedekleme betigi oraya yazamiyordu:
#   PG_DUMP_FAILED: can't create /app/BACKUPS/...: Permission denied
# Klasor imajda dogru sahiplikle varsa, Docker bu sahipligi yeni birime
# kopyaliyor. (Olculdu, 22.08.2026 -- uretimde de ayni sekilde duserdi.)
RUN mkdir -p /app/uploads /app/BACKUPS && chown -R node:node /app
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

CMD ["./docker-entrypoint.sh"]
