/*
 * Test şemasının yalnız test veritabanına uygulanmasını sağlayan saf yardımcılar.
 *
 * Ayrı dosyada tutuluyorlar: `apply-migration-to-tests.ts` içe aktarıldığı anda
 * `prisma db push` çalıştırır, dolayısıyla test edilebilir olması için mantığın
 * yan etkisiz bir modülde olması gerekir.
 */

export const VARSAYILAN_TEST_URL =
  'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'

/** Bağlantı adresinden veritabanı adını çıkarır. Geçersiz adreste fırlatır. */
export function veritabaniAdi(url: string): string {
  const yol = new URL(url).pathname
  const ad = decodeURIComponent(yol.replace(/^\//, ''))
  if (!ad) throw new Error('Bağlantı adresinde veritabanı adı yok')
  return ad
}

/** Yalnız adı `_test` ile biten veritabanları hedeflenebilir. */
export function testVeritabaniMi(url: string): boolean {
  try {
    return veritabaniAdi(url).endsWith('_test')
  } catch {
    return false
  }
}

/**
 * Şema uygulanacak adresi seçer.
 * Öncelik: açıkça test için verilen adres > genel adres > varsayılan.
 */
export function hedefUrlSec(env: NodeJS.ProcessEnv = process.env): string {
  return env.TEST_DATABASE_URL || env.DATABASE_URL || VARSAYILAN_TEST_URL
}

/** Reddedilme durumunda kullanıcıya gösterilecek metin. */
export function redMesaji(url: string): string {
  let ad: string
  try {
    ad = veritabaniAdi(url)
  } catch {
    ad = '(çözümlenemedi)'
  }
  return [
    '',
    'DURDURULDU — test şeması test olmayan bir veritabanına uygulanacaktı.',
    '',
    `  Hedef veritabanı : ${ad}`,
    '  Beklenen         : adı "_test" ile biten bir veritabanı',
    '',
    '  Bu adım "prisma db push --accept-data-loss" çalıştırır; test dışı',
    '  bir veritabanında şema kaybına yol açar.',
    '',
    '  Çözüm: testleri çalıştırmadan önce TEST_DATABASE_URL tanımlayın, ör.',
    `    TEST_DATABASE_URL="${VARSAYILAN_TEST_URL}" npm test`,
    ''
  ].join('\n')
}
