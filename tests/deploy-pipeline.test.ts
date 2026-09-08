import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/*
 * 🔴 DAGITIM, DAGITMADAN "BASARILI" DEDI.
 *
 * Olculdu (08.09.2026, ilk uretim dagitimi): is akisi yesil bitti,
 * 13 saniye surdu, veritabani yedegi alindi -- ve site eski surumde
 * kaldi. Hukuk metni surumu ile `/health` uzerinden dogrulandi.
 *
 * Sebep: betik sunucuya STDIN'den veriliyordu
 * (`bash -s ... < deploy-production.sh`). Bash betigi STDIN'den satir
 * satir okuyor; betigin icindeki `docker compose exec` de STDIN'den
 * okuyor. Yedek komutu betigin GERI KALANINI yuttu, bash "dosya
 * bitti" deyip 0 ile cikti. Imaj hic cekilmedi, servis yeniden
 * baslatilmadi, saglik ve surum dogrulamasi hic calismadi.
 *
 * ⚠️ Bu testler DAVRANISI degil SOZLESMEYI koruyor: bu dosyalar bir
 * kabuk betigi ve bir CI tanimi, birim testi kosulamiyor. Ama arizanin
 * sessizligi yuzunden geri gelmesi cok pahali; en azindan desen
 * bozulursa test dusuyor.
 */
const kok = join(__dirname, '..')
const isAkisi = readFileSync(join(kok, '.github/workflows/deploy-production.yml'), 'utf8')
const betik = readFileSync(join(kok, 'deploy/deploy-production.sh'), 'utf8')

/* ⚠️ Yorum satirlari ayiklaniyor: arizayi ANLATAN yorumlar da eski
   deseni iceriyor ve testi yaniltiyordu (ilk yazimda tam bunu
   yakaladi). Test CALISAN satirlara bakmali. */
const komutlar = (metin: string) =>
  metin.split('\n').filter(satir => !/^\s*#/.test(satir)).join('\n')

describe('uretim dagitim hatti', () => {
  it('betik uzak sunucuya STDIN ile beslenmiyor', () => {
    /* `bash -s` + yonlendirme = betigin kendisi STDIN'de demektir. */
    expect(komutlar(isAkisi)).not.toMatch(/bash -s[^\n]*<\s*deploy\/deploy-production\.sh/)
  })

  it('betik once dosyaya yazilip sonra STDIN kapali calistiriliyor', () => {
    expect(isAkisi).toContain("cat > '$remote_script'")
    /* `ssh -n`: uzak komut yerel STDIN'i okuyamaz. */
    expect(isAkisi).toMatch(/ssh -n /)
  })

  it('is akisi yalniz cikis koduna guvenmiyor', () => {
    /* Ariza tam da 0 ile cikmisti. */
    expect(isAkisi).toContain('DEPLOY_COMPLETE ${IMAGE_SHA}')
  })

  it('betik tamamlandi isaretini YALNIZ basari yolunda yaziyor', () => {
    const isaretSayisi = komutlar(betik).match(/DEPLOY_COMPLETE/g)?.length ?? 0
    expect(isaretSayisi).toBe(1)
    const isaretIndeksi = betik.indexOf('echo "DEPLOY_COMPLETE')
    const basariIndeksi = betik.indexOf('Production health check passed')
    const hataIndeksi = betik.indexOf('Production health check failed')
    expect(isaretIndeksi).toBeGreaterThan(basariIndeksi)
    expect(isaretIndeksi).toBeLessThan(hataIndeksi)
  })

  it('STDIN okuyan komut kapatilmis', () => {
    expect(betik).toMatch(/exec -T server npm run ops:backup < \/dev\/null/)
  })

  it('calisan surum dagitilan etiketle karsilastiriliyor', () => {
    /* Saglik kontrolu tek basina "yeni surum ayakta" demek degil:
       eski konteyner de 200 doner. */
    expect(betik).toContain('expected_commit="${target_image##*:}"')
    expect(betik).toMatch(/reported_commit" != "\$expected_commit/)
  })

  it('basarisizlikta onceki imaja donuluyor', () => {
    expect(betik).toContain('Rolling back to $previous_image')
  })

  it('yedek, yeni imaj calistirilmadan ONCE aliniyor', () => {
    const yedekIndeksi = betik.indexOf('ops:backup')
    const calistirIndeksi = betik.indexOf('up -d --no-build server')
    expect(yedekIndeksi).toBeGreaterThan(-1)
    expect(yedekIndeksi).toBeLessThan(calistirIndeksi)
  })
})
