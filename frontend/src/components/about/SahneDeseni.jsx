import styles from './SahneDeseni.module.css'

/*
 * Bölüm arka planı için kodla çizilen kompozisyon — DESIGN.md §23.1.
 *
 * Tanıtım sayfasında görselsiz bölümler vardı (hero, "Kime göre?",
 * kapanış) ve bölüm aralıkları büyütülünce bu boşluk daha da belirgin
 * hale geldi. Ölçüldü: 11 bölüm, 6 görsel, sayfa alanının %17'si.
 *
 * ⚠️ FOTOĞRAF DEĞİL, FOTOĞRAFIN YERİNE DE GEÇMİYOR. Yaşam fotoğrafları
 * (dükkan, atölye) lisanslı satın alınmalı; burada üretilemez. Bu desen
 * boşluğu doldurur ve sayfaya ritim verir, ama fotoğrafın anlattığı şeyi
 * anlatmaz. Fotoğraflar geldiğinde bu desen o bölümlerden kaldırılabilir.
 *
 * Renkler §23.2 gereği marka ailesinden: yeni hue üretilmiyor, hepsi
 * `--auth-*` ve `brand-*` tokenlarından türüyor.
 *
 * `aria-hidden`: tamamen dekoratif, ekran okuyucuya hiçbir şey söylemez.
 */

const DESENLER = {
  /** İç içe halkalar — karşılama ekranındaki dille aynı. */
  halka: 'halka',
  /** Seyrek nokta ızgarası — veri/ölçüm çağrışımı. */
  izgara: 'izgara',
  /** Çapraz bant — bölümü yatay olarak bölen yumuşak şerit. */
  bant: 'bant',
}

export default function SahneDeseni({ desen = 'halka', konum = 'sag' }) {
  const tur = DESENLER[desen] ?? DESENLER.halka
  return (
    <div
      className={`${styles.sahne} ${styles[tur]} ${styles[konum === 'sol' ? 'sol' : 'sag']}`}
      aria-hidden="true"
    />
  )
}
