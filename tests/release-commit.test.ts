import { describe, expect, it } from 'vitest'
import { normalizeReleaseCommit, RELEASE_INFO } from '../src/config/release'

/*
 * CALISAN SURUMUN KIMLIGI.
 *
 * 🔴 `/health` hangi kodun calistigini soylemiyordu: `version` her
 * imajda ayni sabit dize. Olculdu (08.09.2026): canli `/health` 200
 * donuyordu ama uzerinde calistigi commit ancak hukuk metni surumune
 * bakilarak dolayli anlasilabildi.
 *
 * ⚠️ Bu testler ASIL degeri koruyor: dagitim betigi `/health`teki
 * `commit` alanini dagitilan imaj etiketiyle karsilastiriyor. Bicim
 * bozulursa dogrulama sessizce ise yaramaz hale gelir -- 200 donen
 * eski bir konteyner "basarili" sayilirdi.
 *
 * ⚠️ SAF FONKSIYON CAGRILIYOR, modul yeniden yuklenmiyor. Ilk yazimda
 * `vi.resetModules()` ile ortam degiskeni degistirilip modul tekrar
 * import ediliyordu; dosyalar tek surecte sirayla kostugu icin bu
 * SONRAKI test dosyalarini bozdu ve kapiyi ilgisiz bir testte
 * dusurdu. Saf fonksiyonu disa acmak hem daha dogru testti hem de
 * yan etkiyi tumden kaldirdi.
 */
const GECERLI = 'a'.repeat(40)

describe('surum commit kimligi', () => {
  it('gecerli commit oldugu gibi kabul ediliyor', () => {
    expect(normalizeReleaseCommit(GECERLI)).toBe(GECERLI)
  })

  it('buyuk harfli SHA kucuk harfe indiriliyor', () => {
    /* Etiket karsilastirmasi birebir; iki farkli yazim ayni surumu
       farkli gosterip dagitimi bosuna geri aldirirdi. */
    expect(normalizeReleaseCommit('A'.repeat(40))).toBe(GECERLI)
  })

  it('bastaki ve sondaki bosluklar temizleniyor', () => {
    expect(normalizeReleaseCommit(`  ${GECERLI}\n`)).toBe(GECERLI)
  })

  it('deger verilmediginde surum uydurulmuyor', () => {
    expect(normalizeReleaseCommit(undefined)).toBe('unknown')
    expect(normalizeReleaseCommit('')).toBe('unknown')
  })

  /*
   * ⚠️ Ortamdan gelen serbest bir dizeyi oldugu gibi yayimlamak,
   * saglik ucuna disaridan metin sokmanin yolu olurdu.
   */
  it('bicimi tutmayan degerler saglik ucuna sizmiyor', () => {
    for (const kotu of [
      'kisa',
      'z'.repeat(40),
      `${GECERLI}x`,
      GECERLI.slice(0, 39),
      '<script>alert(1)</script>',
      `${GECERLI}", "status": "compromised`
    ]) {
      expect(normalizeReleaseCommit(kotu), kotu).toBe('unknown')
    }
  })

  it('yayimlanan surum bilgisi commit alanini tasiyor', () => {
    expect(RELEASE_INFO).toHaveProperty('commit')
    expect(RELEASE_INFO.commit).toMatch(/^([0-9a-f]{40}|unknown)$/)
  })
})
