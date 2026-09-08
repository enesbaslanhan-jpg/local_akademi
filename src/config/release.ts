/*
 * CALISAN SURUMUN KIMLIGI.
 *
 * 🔴 `/health` HANGI KODUN CALISTIGINI SOYLEMIYORDU. `version` elle
 * yazilan sabit bir dize ("2.0.0") ve her imajda ayni; dolayisiyla
 * dagitimdan sonra "yeni surum gercekten ayakta mi" sorusunun cevabi
 * yoktu. Olculdu (08.09.2026): canli `/health` 200 donerken uzerinde
 * calistigi commit ancak hukuk metni surumune bakilarak dolayli
 * anlasilabildi.
 *
 * ⚠️ Deger IMAJA GOMULUYOR (`Dockerfile` ARG -> ENV, CI'da
 * `--build-arg RELEASE_COMMIT=<verified_sha>`). Calisma aninda compose
 * ortamindan okunsaydi, imaj ile etiket birbirinden ayrilabilirdi;
 * imaja gomulu deger hangi kodun paketlendigini soyler.
 *
 * ⚠️ BICIM DOGRULANIYOR: yalniz 40 haneli kucuk harf onaltilik bir
 * dize kabul ediliyor, aksi halde "unknown". Ortamdan gelen serbest
 * bir dizeyi oldugu gibi yayimlamak, saglik ucuna disaridan metin
 * enjekte etmenin yolu olurdu.
 */
function commitFromEnv(): string {
  const raw = (process.env.RELEASE_COMMIT || '').trim().toLowerCase()
  return /^[0-9a-f]{40}$/.test(raw) ? raw : 'unknown'
}

export const RELEASE_COMMIT = commitFromEnv()

export const RELEASE_INFO = {
  version: '2.0.0',
  name: 'LocalKarar PostgreSQL',
  databaseProvider: 'postgresql',
  curriculumStandard: 'publishable-curriculum-v4',
  releasedAt: '2026-07-29',
  /** Imaja gomulen commit; gomulmemisse "unknown". */
  commit: RELEASE_COMMIT,
} as const
