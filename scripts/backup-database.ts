import { PrismaClient } from '@prisma/client'
import {
  existsSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'fs'
import { basename, join, resolve, sep } from 'path'
import { execSync } from 'child_process'
import { pgIstemciUrl } from './lib/pg-url.js'

/*
 * Yedeklerin yazılacağı klasör.
 *
 * `BACKUPS_DIR` verilmişse o kullanılır. Verilmezse çalışma dizinine göre
 * belirlenir — geliştirmede proje kökünden çalıştırıldığı için davranış
 * eskisiyle aynı.
 *
 * Önceden yol betiğin KENDİ konumundan türetiliyordu
 * (`import.meta.dirname/..`). Bu, betik yalnız kaynaktan çalıştırıldığı
 * sürece doğruydu; derlenip `dist/ops/` altına konunca yedekler
 * `dist/BACKUPS`e düşerdi — yani her yeniden derlemede silinen bir yere.
 * Üretimde bu, "yedek alıyoruz" sanılırken hiçbir şey saklanmaması
 * demekti.
 */
const backupDirectory = process.env.BACKUPS_DIR?.trim()
  ? resolve(process.env.BACKUPS_DIR.trim())
  : join(process.cwd(), 'BACKUPS')

/*
 * Docker'daki Postgres icin kacis yolu.
 *
 * Bu projenin kendi docker-compose'unda veritabani kapsayicida
 * calisiyor ve pg_dump ana makinede olmayabiliyor (bu gelistirme
 * makinesinde yok). PG_DOCKER_CONTAINER verilirse dokum kapsayicinin
 * icindeki pg_dump ile aliniyor.
 */
const dockerContainer = process.env.PG_DOCKER_CONTAINER || ''

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function retentionCount(): number {
  const parsed = Number(process.env.DATABASE_BACKUP_RETENTION_COUNT)
  if (!Number.isFinite(parsed)) return 10
  return Math.max(3, Math.min(Math.floor(parsed), 100))
}

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

async function main(): Promise<void> {
  mkdirSync(backupDirectory, { recursive: true })
  /*
   * SAHİP ROLÜ tercih edilir.
   *
   * Uygulamanın çalışma zamanı bağlantısı (`DATABASE_URL`) bilerek en az
   * yetkili: yalnız SELECT/INSERT/UPDATE/DELETE. O rolle alınan bir
   * `pg_dump` sessizce EKSİK kalabilir — okuyamadığı nesneleri atlar ve
   * yine de "başarılı" biter. Eksik olduğu ancak geri yüklerken anlaşılır,
   * yani en kötü anda.
   *
   * `MIGRATE_DATABASE_URL` göçler için zaten sahip rolüyle tanımlı;
   * yedekleme de onu kullanıyor. Yoksa eski davranışa düşülür.
   */
  const dbUrl = process.env.BACKUP_DATABASE_URL
    || process.env.MIGRATE_DATABASE_URL
    || process.env.DATABASE_URL
    || ''

  if (isPostgresUrl(dbUrl)) {
    console.log('Backing up PostgreSQL database via pg_dump...')
    const backupPath = join(backupDirectory, `auto_dev_${timestamp()}.sql`)
    try {
      /* Prisma'ya ozel parametreler (schema, connection_limit...)
          temizlenmeden pg_dump URL'i reddediyor. */
      const dumpUrl = pgIstemciUrl(dbUrl)
      const komut = dockerContainer
        ? `docker exec ${dockerContainer} pg_dump "${dumpUrl}" > "${backupPath}"`
        : `pg_dump "${dumpUrl}" > "${backupPath}"`
      execSync(komut, {
        stdio: 'pipe',
        timeout: 120000,
      })
    } catch (e: any) {
      rmSync(backupPath, { force: true })
      throw new Error(`PG_DUMP_FAILED: ${e.stderr || e.message}`)
    }

    /*
     * Kabuk yonlendirmesi (> dosya) hedefi pg_dump CALISMADAN ONCE
     * olusturuyor; pg_dump duserse geriye 0 baytlik bir "yedek" kaliyordu.
     * Olculdu (20.08.2026): BACKUPS/ icindeki otomatik .sql yedeklerinin
     * BESI DE 0 bayttı ve dogrulama betigi yine de ok:true diyordu.
     */
    const size = existsSync(backupPath) ? statSync(backupPath).size : 0
    if (size === 0) {
      rmSync(backupPath, { force: true })
      throw new Error('PG_DUMP_EMPTY: pg_dump hata vermedi ama dosya boş')
    }
    const bas = readFileSync(backupPath, { encoding: 'utf8' }).slice(0, 400)
    if (!bas.includes('PostgreSQL database dump')) {
      rmSync(backupPath, { force: true })
      throw new Error('PG_DUMP_INVALID: dosya pg_dump çıktısına benzemiyor')
    }
    const candidates = readdirSync(backupDirectory)
      .filter(name => /^auto_dev_\d{4}-\d{2}-\d{2}T.*\.sql$/.test(name))
      .map(name => ({
        name,
        path: join(backupDirectory, name),
        modifiedAt: statSync(join(backupDirectory, name)).mtimeMs,
      }))
      .sort((left, right) => right.modifiedAt - left.modifiedAt)
    const removed = candidates.slice(retentionCount())
    for (const item of removed) {
      if (item.path.startsWith(`${backupDirectory}${sep}`)) {
        rmSync(item.path, { force: true })
      }
    }
    console.log(JSON.stringify({
      ok: true,
      /* `split('\\')` yalnız Windows yolunu bölüyordu; Linux'ta ayırıcı
         eşleşmediği için TAM yol basılıyordu (`BACKUPS//app/BACKUPS/...`).
         `basename` iki platformda da doğru çalışıyor. */
      backup: `BACKUPS/${basename(backupPath)}`,
      bytes: size,
      retained: candidates.length - removed.length,
      removed: removed.map(item => item.name),
    }))
    return
  }

  const backupPath = join(backupDirectory, `auto_dev_${timestamp()}.db`)
  if (!backupPath.startsWith(`${backupDirectory}${sep}`) || existsSync(backupPath)) {
    throw new Error('UNSAFE_BACKUP_PATH')
  }
  // SQLite backup via VACUUM INTO
  const prisma = new PrismaClient()
  const sqlPath = backupPath.replaceAll('\\', '/').replaceAll("'", "''")
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${sqlPath}'`)
  } finally {
    await prisma.$disconnect()
  }

  const restored = new PrismaClient({
    datasources: {
      db: { url: `file:${backupPath.replaceAll('\\', '/')}` },
    },
  })
  let integrity = ''
  try {
    const rows = await restored.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check')
    integrity = rows[0]?.integrity_check || ''
  } finally {
    await restored.$disconnect()
  }
  if (integrity !== 'ok') {
    rmSync(backupPath, { force: true })
    throw new Error('BACKUP_INTEGRITY_FAILED')
  }

  const candidates = readdirSync(backupDirectory)
    .filter(name => /^auto_dev_\d{4}-\d{2}-\d{2}T.*\.db$/.test(name))
    .map(name => ({
      name,
      path: join(backupDirectory, name),
      modifiedAt: statSync(join(backupDirectory, name)).mtimeMs,
    }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
  const removed = candidates.slice(retentionCount())
  for (const item of removed) {
    if (item.path.startsWith(`${backupDirectory}${sep}`)) {
      rmSync(item.path, { force: true })
    }
  }
  console.log(JSON.stringify({
    ok: true,
    backup: `BACKUPS/${basename(backupPath)}`,
    bytes: statSync(backupPath).size,
    integrity,
    retained: candidates.length - removed.length,
    removed: removed.map(item => item.name),
    sourceModified: false,
  }))
}

main().catch(error => {
  console.error(JSON.stringify({
    ok: false,
    errorCode: error instanceof Error
      ? error.message
      : 'DATABASE_BACKUP_FAILED',
  }))
  process.exitCode = 1
})
