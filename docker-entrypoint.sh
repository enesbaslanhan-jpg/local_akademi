#!/bin/sh
set -e

# Migration DDL gerektirir (CREATE TABLE / ALTER TABLE), uygulama rolünde ise
# bilerek DDL yoktur — bkz. scripts/setup-app-db-role.ts. Bu yüzden göç adımı
# sahip rolüyle, sunucu ise en az yetkili rolle çalışır.
#
# MIGRATE_DATABASE_URL tanımlı değilse eski davranış korunur (tek rol).
DATABASE_URL="${MIGRATE_DATABASE_URL:-$DATABASE_URL}" \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

exec node dist/server.js
