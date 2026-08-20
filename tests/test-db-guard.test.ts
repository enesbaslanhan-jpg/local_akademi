import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import {
  VARSAYILAN_TEST_URL,
  hedefUrlSec,
  redMesaji,
  testVeritabaniMi,
  veritabaniAdi
} from '../scripts/test-db-guard'

/**
 * `npm test` öncesi çalışan `pretest` adımı `prisma db push
 * --accept-data-loss` uygular. Önceki sürümde hedef doğrudan
 * `process.env.DATABASE_URL` idi — yani `.env` yüklü her kabukta ve Docker
 * içinde testler GERÇEK veritabanının şemasını siliyordu.
 *
 * Bu testler hedefin `_test` ile bitmek zorunda olduğunu doğruluyor.
 */

const GERCEK_DB = 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi?schema=public'

describe('veritabaniAdi', () => {
  it('adresten veritabanı adını çıkarır', () => {
    expect(veritabaniAdi(GERCEK_DB)).toBe('localakademi')
    expect(veritabaniAdi(VARSAYILAN_TEST_URL)).toBe('localakademi_test')
  })

  it('veritabanı adı yoksa fırlatır', () => {
    expect(() => veritabaniAdi('postgresql://kullanici@127.0.0.1:5432/')).toThrow()
  })
})

describe('testVeritabaniMi', () => {
  it('gerçek geliştirme veritabanını REDDEDER', () => {
    expect(testVeritabaniMi(GERCEK_DB)).toBe(false)
  })

  it('test veritabanını kabul eder', () => {
    expect(testVeritabaniMi(VARSAYILAN_TEST_URL)).toBe(true)
  })

  it('"test" ile başlayan ama _test ile bitmeyeni reddeder', () => {
    expect(testVeritabaniMi('postgresql://u@h:5432/test_localakademi')).toBe(false)
  })

  it('üretim adresini reddeder', () => {
    expect(testVeritabaniMi('postgresql://u:p@db.uretim.example.com:5432/localakademi_prod')).toBe(false)
  })

  it('bozuk adresi reddeder (sessizce geçmez)', () => {
    expect(testVeritabaniMi('bu bir url degil')).toBe(false)
  })
})

describe('hedefUrlSec önceliği', () => {
  it('TEST_DATABASE_URL her şeyin önünde gelir', () => {
    const secilen = hedefUrlSec({ TEST_DATABASE_URL: VARSAYILAN_TEST_URL, DATABASE_URL: GERCEK_DB })
    expect(secilen).toBe(VARSAYILAN_TEST_URL)
  })

  it('yalnız DATABASE_URL varsa onu seçer — ama guard sonra reddeder', () => {
    const secilen = hedefUrlSec({ DATABASE_URL: GERCEK_DB })
    expect(secilen).toBe(GERCEK_DB)
    expect(testVeritabaniMi(secilen)).toBe(false)
  })

  it('hiçbiri yoksa varsayılan test adresine düşer', () => {
    expect(hedefUrlSec({})).toBe(VARSAYILAN_TEST_URL)
  })
})

describe('redMesaji', () => {
  it('hangi veritabanının reddedildiğini söyler', () => {
    expect(redMesaji(GERCEK_DB)).toContain('localakademi')
    expect(redMesaji(GERCEK_DB)).toContain('_test')
  })

  it('bozuk adreste de çökmez', () => {
    expect(redMesaji('bozuk')).toContain('çözümlenemedi')
  })
})

describe('betiğin kendisi (gerçek süreç)', () => {
  /* Asıl kanıt: betik yıkıcı komuta ULAŞMADAN sıfırdan farklı kodla çıkmalı. */
  it('gerçek veritabanı hedeflendiğinde çıkış kodu 1 verir ve db push ÇALIŞTIRMAZ', () => {
    let cikisKodu = 0
    let ciktilar = ''
    try {
      ciktilar = execFileSync('npx', ['tsx', 'scripts/apply-migration-to-tests.ts'], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        shell: process.platform === 'win32',
        env: { ...process.env, TEST_DATABASE_URL: '', DATABASE_URL: GERCEK_DB },
        timeout: 60_000
      })
    } catch (err: any) {
      cikisKodu = err.status
      ciktilar = String(err.stdout ?? '') + String(err.stderr ?? '')
    }
    expect(cikisKodu).toBe(1)
    expect(ciktilar).toContain('DURDURULDU')
    /* Prisma hiç konuşmamış olmalı — komuta gelinmedi. */
    expect(ciktilar).not.toContain('Your database is now in sync')
  }, 90_000)
})
