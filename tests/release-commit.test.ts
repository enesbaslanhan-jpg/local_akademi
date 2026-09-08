import { afterEach, describe, expect, it, vi } from 'vitest'

/*
 * CALISAN SURUMUN KIMLIGI.
 *
 * 🔴 `/health` hangi kodun calistigini soylemiyordu: `version` her
 * imajda ayni sabit dize. Olculdu (08.09.2026): canli `/health` 200
 * donuyordu ama uzerinde calistigi commit ancak hukuk metni surumune
 * bakilarak dolayli anlasilabildi.
 *
 * ⚠️ Bu testler ASIL degeri koruyor: dagitim betigi `/health`teki
 * `commit` alanini dagitilan imaj etiketiyle karsilastiriyor. Alanin
 * bicimi bozulursa dagitim dogrulamasi sessizce ise yaramaz hale
 * gelir -- 200 donen eski bir konteyner "basarili" sayilirdi.
 */
async function releaseInfoWith(commit: string | undefined) {
  vi.resetModules()
  if (commit === undefined) vi.stubEnv('RELEASE_COMMIT', '')
  else vi.stubEnv('RELEASE_COMMIT', commit)
  return await import('../src/config/release')
}

const GECERLI = 'a'.repeat(40)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('surum commit kimligi', () => {
  it('imaja gomulen commit oldugu gibi yayimlaniyor', async () => {
    const { RELEASE_INFO, RELEASE_COMMIT } = await releaseInfoWith(GECERLI)
    expect(RELEASE_COMMIT).toBe(GECERLI)
    expect(RELEASE_INFO.commit).toBe(GECERLI)
  })

  it('buyuk harfli SHA kucuk harfe indiriliyor', async () => {
    /* Etiket karsilastirmasi birebir; iki farkli yazim ayni surumu
       farkli gostererek dagitimi bosuna geri aldirirdi. */
    const { RELEASE_COMMIT } = await releaseInfoWith('A'.repeat(40))
    expect(RELEASE_COMMIT).toBe(GECERLI)
  })

  it('deger verilmediginde surum uydurulmuyor', async () => {
    const { RELEASE_COMMIT } = await releaseInfoWith(undefined)
    expect(RELEASE_COMMIT).toBe('unknown')
  })

  /*
   * ⚠️ Ortamdan gelen serbest bir dizeyi oldugu gibi yayimlamak,
   * saglik ucuna disaridan metin sokmanin yolu olurdu. Bicimi
   * tutmayan her deger "unknown".
   */
  it('bicimi tutmayan degerler saglik ucuna sizmiyor', async () => {
    for (const kotu of [
      'kisa',
      'z'.repeat(40),
      `${GECERLI}x`,
      GECERLI.slice(0, 39),
      '<script>alert(1)</script>',
      `${GECERLI}", "status": "compromised`
    ]) {
      const { RELEASE_COMMIT } = await releaseInfoWith(kotu)
      expect(RELEASE_COMMIT, kotu).toBe('unknown')
    }
  })

  it('bastaki ve sondaki bosluklar temizleniyor', async () => {
    const { RELEASE_COMMIT } = await releaseInfoWith(`  ${GECERLI}\n`)
    expect(RELEASE_COMMIT).toBe(GECERLI)
  })
})
