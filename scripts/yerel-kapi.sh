#!/usr/bin/env bash
# PUSH ÖNCESİ YEREL KAPI — .github/workflows/release.yml (release-gate + frontend)
# adımlarının AYNISI, aynı sırayla. Biri kırmızıysa betik orada durur.
# "Yerelde yeşil" = bu betiğin sonunda TÜM ADIMLAR YEŞİL yazması. Başka kanıt sayılmaz.
#
# Kullanım:  npm run kapi        (Git Bash / WSL; Docker'da localakademi-postgres açık olmalı)
#
# ⚠️ Yeni adım CI'a eklenirse BURAYA da eklenir (20.09 ve 14.10.2026'da CI'ın audit adımı
# yerelde koşulmadığı için kırmızı oldu).
set -euo pipefail
cd "$(dirname "$0")/.."
export TZ=UTC

adim() { echo; echo "━━ [$1] $2"; }

adim 1/13 "TypeScript"            ; npx tsc --noEmit
adim 2/13 "Prisma validate"       ; npx prisma validate
adim 3/13 "Prisma generate"       ; npx prisma generate
adim 4/13 "Migration test DB"     ; npx tsx scripts/apply-migration-to-tests.ts
adim 5/13 "Frontend derleme"      ; (cd frontend && npm run build)
adim 6/13 "Birim testleri"        ; npm test
adim 7/13 "E2E testleri"          ; npm run test:e2e
adim 8/13 "Gizli anahtar taraması"; npm run secret:scan
adim 9/13 "Ham SQL taraması"      ; npm run sql:scan
adim 10/13 "Bağımlılık denetimi"  ; npm audit --omit=dev --audit-level=high
adim 11/13 "Migration doğrulama"  ; npm run validate:migrations
adim 12/13 "Release kapısı"
# Yerelde Docker daemon yoksa betik "PARTIAL" deyip hata koduyla çıkar (CI'da Docker var). Burada ölçüt: 0 başarısız.
SKIP_NPM_INSTALL=true SKIP_UNIT_TESTS=true npm run verify:release | tee /tmp/verify-release.log || true
grep -q "0 failed" /tmp/verify-release.log || { echo "❌ Release kapısında başarısız adım var"; exit 1; }
adim 13/13 "Frontend testleri"    ; (cd frontend && npx vitest run --configLoader runner)

echo
echo "✅ TÜM ADIMLAR YEŞİL — push edilebilir."
