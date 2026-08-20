import { PrismaClient } from '@prisma/client'

/*
 * En az yetkili uygulama veritabanı rolünü oluşturur.
 *
 * SORUN: uygulama veritabanına `localakademi` rolüyle bağlanıyordu. Bu rol
 * Docker imajının bootstrap rolü, yani SUPERUSER — `rolsuper`, `bypassrls`,
 * `createrole`, `createdb` hepsi açık. Uygulamada bir açık bulunması tek
 * veritabanının değil, PostgreSQL sunucusunun tamamının ele geçmesi demekti.
 *
 * ÇÖZÜM: iki rol.
 *   - `localakademi`      → sahip / göçmen rolü. Yalnız `prisma migrate deploy`
 *                           kullanır (DDL burada gerekli).
 *   - `localakademi_app`  → çalışma zamanı rolü. Yalnız SELECT/INSERT/UPDATE/
 *                           DELETE. DDL yok, TRUNCATE yok, superuser yok.
 *
 * `src/` içinde tek bir ham SQL yok (uygulama tamamen Prisma ORM), bu yüzden
 * çalışma zamanında DDL'e ihtiyaç duyulmuyor — kısıtlama uygulamayı kırmaz.
 *
 * ALTER DEFAULT PRIVILEGES adımı kritik: onsuz, sahip rolün ileride
 * migration'la oluşturduğu her yeni tablo uygulama rolüne kapalı olurdu.
 *
 * Kullanım:
 *   APP_DB_PASSWORD="..." npx tsx scripts/setup-app-db-role.ts
 */

const APP_ROLE = process.env.APP_DB_ROLE || 'localakademi_app'
const APP_PASSWORD = process.env.APP_DB_PASSWORD

if (!APP_PASSWORD) {
  console.error('APP_DB_PASSWORD tanımlı değil. Örnek:\n  APP_DB_PASSWORD="güçlü-parola" npx tsx scripts/setup-app-db-role.ts')
  process.exit(1)
}
if (!/^[a-z_][a-z0-9_]*$/.test(APP_ROLE)) {
  console.error(`Geçersiz rol adı: ${APP_ROLE}`)
  process.exit(1)
}

/** SQL literal kaçışı — parola yalnız burada, tanımlayıcı değil değer olarak geçer. */
function sqlLiteral(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}

async function main() {
  const prisma = new PrismaClient()
  const [{ current_database: db, current_user: owner }] = await prisma.$queryRawUnsafe<any[]>(
    'SELECT current_database(), current_user'
  )
  console.log(`Veritabanı : ${db}`)
  console.log(`Sahip rol  : ${owner}`)
  console.log(`Uygulama   : ${APP_ROLE}`)
  console.log('')

  const varMi = await prisma.$queryRawUnsafe<any[]>(
    `SELECT 1 FROM pg_roles WHERE rolname = ${sqlLiteral(APP_ROLE)}`
  )

  if (varMi.length === 0) {
    await prisma.$executeRawUnsafe(
      `CREATE ROLE "${APP_ROLE}" LOGIN PASSWORD ${sqlLiteral(APP_PASSWORD)}`
    )
    console.log('+ rol oluşturuldu')
  } else {
    await prisma.$executeRawUnsafe(
      `ALTER ROLE "${APP_ROLE}" LOGIN PASSWORD ${sqlLiteral(APP_PASSWORD)}`
    )
    console.log('· rol zaten vardı, parola güncellendi')
  }

  /* Yükseltilmiş nitelikler her koşulda kapatılır (rol elle değiştirilmiş olabilir). */
  await prisma.$executeRawUnsafe(
    `ALTER ROLE "${APP_ROLE}" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`
  )
  console.log('+ yükseltilmiş nitelikler kapatıldı')

  const adimlar: Array<[string, string]> = [
    ['veritabanına bağlanma', `GRANT CONNECT ON DATABASE "${db}" TO "${APP_ROLE}"`],
    ['şema kullanımı',        `GRANT USAGE ON SCHEMA public TO "${APP_ROLE}"`],
    ['mevcut tablolar (DML)', `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${APP_ROLE}"`],
    ['mevcut diziler',        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${APP_ROLE}"`],
    ['gelecek tablolar',      `ALTER DEFAULT PRIVILEGES FOR ROLE "${owner}" IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${APP_ROLE}"`],
    ['gelecek diziler',       `ALTER DEFAULT PRIVILEGES FOR ROLE "${owner}" IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${APP_ROLE}"`]
  ]
  for (const [ad, sql] of adimlar) {
    await prisma.$executeRawUnsafe(sql)
    console.log(`+ ${ad}`)
  }

  /* Şemada nesne YARATMA yetkisi açıkça geri alınır — DDL bu rolde olmamalı. */
  await prisma.$executeRawUnsafe(`REVOKE CREATE ON SCHEMA public FROM "${APP_ROLE}"`)
  console.log('+ şemada CREATE geri alındı')

  const nitelikler = await prisma.$queryRawUnsafe<any[]>(
    `SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
     FROM pg_roles WHERE rolname = ${sqlLiteral(APP_ROLE)}`
  )
  console.log('\nSonuç nitelikleri:', JSON.stringify(nitelikler[0]))

  const url = new URL(process.env.DATABASE_URL!)
  url.username = APP_ROLE
  url.password = '***'
  console.log(`\nUygulamanın kullanacağı adres (parolayı doldurun):\n  ${url.toString()}`)
  console.log('\nÖNEMLİ: migration hâlâ sahip rolle çalışmalı — MIGRATE_DATABASE_URL olarak verin.')

  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
