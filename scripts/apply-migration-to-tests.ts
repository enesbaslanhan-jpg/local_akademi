import { execSync } from 'node:child_process'
import { hedefUrlSec, redMesaji, testVeritabaniMi, veritabaniAdi } from './test-db-guard'

/*
 * Test veritabanına şema uygular (`npm test` öncesi `pretest` adımı).
 *
 * ÖNCEKİ SÜRÜMÜN TEHLİKESİ: hedef doğrudan `process.env.DATABASE_URL` idi;
 * sabit `_test` adresi yalnızca bu değişken TANIMSIZSA kullanılıyordu.
 * `vitest.config.ts` içindeki `env` bloğu bu betiğe ULAŞMAZ — `pretest`
 * vitest'ten önce, ayrı bir süreç olarak çalışır. Dolayısıyla `DATABASE_URL`
 * dolu her ortamda (geliştirici kabuğu, Docker Compose, CI) `npm test` komutu
 * gerçek veritabanına `prisma db push --accept-data-loss` uyguluyordu.
 *
 * ÇÖZÜM: hedef, adı `_test` ile biten bir veritabanı olmak ZORUNDA. Yıkıcı
 * komutun kendisini yumuşatmak yerine nereye gidebileceğini kısıtlıyoruz.
 */

const hedefUrl = hedefUrlSec()

if (!testVeritabaniMi(hedefUrl)) {
  console.error(redMesaji(hedefUrl))
  process.exit(1)
}

execSync('npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma', {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: hedefUrl,
    ...(process.platform === 'win32' ? { RUST_LOG: 'info' } : {}),
  },
  stdio: 'inherit',
  timeout: 60_000,
})
console.log(`  Şema senkronize edildi: ${veritabaniAdi(hedefUrl)}`)
