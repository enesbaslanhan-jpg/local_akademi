import { PrismaClient } from '@prisma/client'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { pgIstemciUrl, veritabaniAdi } from './lib/pg-url.js'

/*
 * YEDEK GERİ YÜKLEME DOĞRULAMASI
 *
 * Bu betik daha önce PostgreSQL'de HİÇBİR ŞEY DOĞRULAMIYORDU: canlı
 * veritabanındaki satırları sayıp `ok: true` basıyordu. Yedek dosyasına
 * hiç bakmıyordu.
 *
 * Sonuç ölçüldü (20.08.2026): `BACKUPS/` içindeki otomatik `.sql`
 * yedeklerinin BEŞİ DE 0 BAYTTI — çünkü `pg_dump` bu makinede yok ve
 * kabuk yönlendirmesi boş dosyayı yine de oluşturuyordu. Betik buna
 * rağmen "ok" diyordu. Denenmemiş yedek yedek değildir; "denendi" diyen
 * ama denemeyen bir betik ondan da kötüdür.
 *
 * Artık üç kademe var ve HİÇBİRİ atlanınca `ok: true` dönmüyor:
 *
 *   1. DOSYA  — en yeni yedek var mı, boş mu, pg_dump çıktısına
 *               benziyor mu.
 *   2. GERİ YÜKLEME — geçici bir veritabanına gerçekten yükleniyor mu.
 *   3. İÇERİK — yüklenen kopyada beklenen tablolar dolu mu.
 *
 * `psql` yoksa 2. ve 3. kademe yapılamaz; o durumda betik
 * `PSQL_NOT_FOUND` ile ÇÖKER, "doğrulandı" demez.
 */

/* Yedeklerin ARANDIĞI klasör; `backup-database.ts` ile AYNI kuralı
   izlemek zorunda, yoksa doğrulama başka bir yere bakar ve
   "yedek bulunamadı" der. */
const backupDirectory = process.env.BACKUPS_DIR?.trim()
  ? resolve(process.env.BACKUPS_DIR.trim())
  : join(process.cwd(), 'BACKUPS')

/* Docker'daki Postgres için kaçış yolu: bu projenin kendi
   docker-compose'unda veritabanı kapsayıcıda çalışıyor ve istemci
   araçları ana makinede olmayabiliyor. */
const dockerContainer = process.env.PG_DOCKER_CONTAINER || ''

function isPostgresUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

function pgCalistir(komut: 'psql', args: string[], input?: string): string {
  if (dockerContainer) {
    return execFileSync(
      'docker',
      ['exec', '-i', dockerContainer, komut, ...args],
      { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }
    )
  }
  return execFileSync(komut, args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] })
}

function psqlVarMi(): boolean {
  try {
    pgCalistir('psql', ['--version'])
    return true
  } catch {
    return false
  }
}

/** En yeni otomatik yedek. */
function enYeniYedek(): { path: string; name: string; size: number } {
  if (!existsSync(backupDirectory)) throw new Error('BACKUP_DIR_NOT_FOUND')
  const adaylar = readdirSync(backupDirectory)
    .filter(name => /^auto_dev_\d{4}-\d{2}-\d{2}T.*\.sql$/.test(name))
    .map(name => {
      const p = join(backupDirectory, name)
      const st = statSync(p)
      return { path: p, name, size: st.size, modifiedAt: st.mtimeMs }
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt)

  if (adaylar.length === 0) throw new Error('NO_BACKUP_FOUND')
  return adaylar[0]
}

async function postgresDogrula(dbUrl: string): Promise<void> {
  // ── 1. DOSYA ──
  const yedek = enYeniYedek()
  if (yedek.size === 0) throw new Error(`BACKUP_EMPTY: ${yedek.name}`)

  const bas = readFileSync(yedek.path, { encoding: 'utf8' }).slice(0, 400)
  if (!bas.includes('PostgreSQL database dump')) {
    throw new Error(`BACKUP_NOT_A_DUMP: ${yedek.name}`)
  }

  // ── 2. GERİ YÜKLEME ──
  if (!psqlVarMi()) {
    /* "Doğrulayamadım" ile "doğruladım" karıştırılamaz. */
    throw new Error(
      'PSQL_NOT_FOUND: geri yükleme denenemedi. postgresql-client kurun ' +
      'ya da PG_DOCKER_CONTAINER ortam değişkenini verin.'
    )
  }

  const gecici = `restore_check_${Date.now()}`
  /* psql de pg_dump gibi Prisma parametrelerini reddediyor. */
  const yonetimUrl = pgIstemciUrl(dbUrl, 'postgres')

  const psqlArgs = (hedefUrl: string, ekstra: string[]) =>
    ['-v', 'ON_ERROR_STOP=1', '-d', hedefUrl, ...ekstra]

  pgCalistir('psql', psqlArgs(yonetimUrl, ['-c', `CREATE DATABASE "${gecici}"`]))

  const geciciUrl = pgIstemciUrl(dbUrl, gecici)

  try {
    /* Dökümü geçici veritabanına yükle. `ON_ERROR_STOP=1` sayesinde
       en ufak hata çıkışı düşürür — sessizce yarım yüklenmiş bir
       kopyayı "başarılı" saymayız. */
    const dokum = readFileSync(yedek.path, { encoding: 'utf8' })
    pgCalistir('psql', psqlArgs(geciciUrl, []), dokum)

    // ── 3. İÇERİK ──
    const prisma = new PrismaClient({ datasources: { db: { url: geciciUrl } } })
    try {
      const [users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts] =
        await Promise.all([
          prisma.user.count(),
          prisma.knowledgeObject.count(),
          prisma.knowledgeObject.count({ where: { status: 'published', isDemo: false } }),
          prisma.quiz.count(),
          prisma.communityPost.count(),
        ])

      /* Boş bir kopya "geri yüklendi" sayılmaz. */
      if (users === 0 && knowledgeObjects === 0) {
        throw new Error('RESTORED_DB_EMPTY: geri yüklenen kopyada veri yok')
      }

      console.log(JSON.stringify({
        ok: true,
        engine: 'postgresql',
        verified: 'gerçek geri yükleme',
        backupFile: yedek.name,
        backupBytes: yedek.size,
        restoredInto: gecici,
        kaynakVeritabani: veritabaniAdi(dbUrl),
        users,
        knowledgeObjects,
        publishedKnowledgeObjects,
        quizzes,
        communityPosts,
      }))
    } finally {
      await prisma.$disconnect()
    }
  } finally {
    /* Geçici veritabanı her hâlükârda düşürülür. */
    try {
      pgCalistir('psql', psqlArgs(yonetimUrl, ['-c', `DROP DATABASE IF EXISTS "${gecici}"`]))
    } catch {
      console.error(`UYARI: geçici veritabanı düşürülemedi: ${gecici}`)
    }
  }
}

async function sqliteDogrula(): Promise<void> {
  /* SQLite yolu yalnız eski geliştirme kurulumları için duruyor;
     üretim PostgreSQL. Proje kökünden çalıştırıldığı varsayılıyor. */
  const source = join(process.cwd(), 'prisma', 'dev.db')
  if (!existsSync(source)) throw new Error('BACKUP_SOURCE_NOT_FOUND')
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'localakademi-restore-'))
  const restored = join(temporaryDirectory, 'restored.db')
  copyFileSync(source, restored)
  const url = `file:${restored.replaceAll('\\', '/')}`
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  try {
    const integrity = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check')
    const [users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts] = await Promise.all([
      prisma.user.count(),
      prisma.knowledgeObject.count(),
      prisma.knowledgeObject.count({ where: { status: 'published', isDemo: false } }),
      prisma.quiz.count(),
      prisma.communityPost.count(),
    ])
    console.log(JSON.stringify({
      ok: true,
      engine: 'sqlite',
      integrity: integrity[0]?.integrity_check || '',
      users, knowledgeObjects, publishedKnowledgeObjects, quizzes, communityPosts,
    }))
  } finally {
    await prisma.$disconnect()
  }
  try { rmSync(temporaryDirectory, { recursive: true, force: true }) } catch {}
}

async function main(): Promise<void> {
  /* Doğrulama geçici bir veritabanı OLUŞTURUP düşürüyor; bu DDL
     gerektiriyor, yani uygulamanın kısıtlı rolüyle yapılamaz.
     `backup-database.ts` ile aynı sırayı izliyor. */
  const dbUrl = process.env.BACKUP_DATABASE_URL
    || process.env.MIGRATE_DATABASE_URL
    || process.env.DATABASE_URL
    || ''
  if (isPostgresUrl(dbUrl)) return postgresDogrula(dbUrl)
  return sqliteDogrula()
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, errorCode: error.message }))
  process.exitCode = 1
})
