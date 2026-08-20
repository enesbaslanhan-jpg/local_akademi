/*
 * `DATABASE_URL`'i Postgres istemci araçlarına (pg_dump, psql) verilebilir
 * hale getirir.
 *
 * NEDEN GEREKLİ: Prisma bağlantı dizesine kendi parametrelerini koyuyor —
 * `schema`, `connection_limit`, `pool_timeout`, `pgbouncer`, `sslidentity`…
 * Bunlar libpq'nun tanımadığı adlar ve `pg_dump` doğrudan reddediyor:
 *
 *     pg_dump: error: invalid URI query parameter: "schema"
 *
 * Ölçüldü (20.08.2026): yedekleme betiği bu yüzden HİÇBİR ORTAMDA
 * çalışmıyordu. Kabuk yönlendirmesi dosyayı önceden oluşturduğu için
 * geriye 0 baytlık "yedekler" kalıyordu — `BACKUPS/` içindeki otomatik
 * `.sql` dosyalarının beşi de böyleydi.
 *
 * `schema` bilgisini atmak kayıp değil: `pg_dump` varsayılan olarak
 * bütün şemaları döküyor, yani sonuç daha kapsamlı oluyor.
 */

/** libpq'nun anladığı parametreler; gerisi atılır. */
const LIBPQ_PARAMETRELERI = new Set([
  'sslmode',
  'sslcert',
  'sslkey',
  'sslrootcert',
  'application_name',
  'connect_timeout',
  'options',
  'target_session_attrs',
])

/**
 * Prisma'ya özel parametreleri temizler.
 *
 * @param url Ham `DATABASE_URL`
 * @param veritabani Verilirse hedef veritabanı adını değiştirir
 *        (geri yükleme doğrulaması geçici bir kopyaya bağlanıyor).
 */
export function pgIstemciUrl(url: string, veritabani?: string): string {
  const u = new URL(url)

  for (const anahtar of [...u.searchParams.keys()]) {
    if (!LIBPQ_PARAMETRELERI.has(anahtar)) u.searchParams.delete(anahtar)
  }

  if (veritabani !== undefined) u.pathname = `/${veritabani}`

  return u.toString()
}

/** Bağlantı dizesindeki veritabanı adı. */
export function veritabaniAdi(url: string): string {
  return new URL(url).pathname.replace(/^\//, '')
}
