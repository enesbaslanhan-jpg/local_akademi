import styles from './EkranCizimi.module.css'

/*
 * Hakkında sayfasındaki temsili ekran çizimleri.
 *
 * GERÇEK EKRAN GÖRÜNTÜSÜ DEĞİL — bilinçli. Gerçek görüntü açık ve koyu
 * tema için iki ayrı takım ister, arayüz her değiştiğinde bayatlar ve
 * sayfayı ağırlaştırır. Bu çizimler uygulamanın kendi renk
 * değişkenleriyle çiziliyor, dolayısıyla temayı kendiliğinden izliyor,
 * ağ isteği yok ve bir daha kırılmaz.
 *
 * DÜRÜSTLÜK SINIRI: her çizim, o ekranda GERÇEKTEN bulunan öğeleri
 * gösterir. Var olmayan bir grafik, sahte bir rakam vitrini ya da
 * henüz yazılmamış bir özellik çizilmiyor. Sayfanın kendisi "Neyi
 * yapmaz?" bölümü taşıyor; çizimlerin onunla çelişmemesi gerekiyor.
 *
 * Çizimler süs olduğu için `aria-hidden`: anlamı taşıyan şey yanındaki
 * başlık ve maddelerdir, ekran okuyucuya iki kez okutmanın değeri yok.
 */

/* Ortak kabuk: üst çubuk + gövde. Tek yerde durması, altı çizimin
   birbirinden görsel olarak ayrışmamasını sağlıyor. */
function Kabuk({ children, baslikGenisligi = 74 }) {
  return (
    <svg viewBox="0 0 320 200" className={styles.cizim} aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="319" height="199" rx="12"
            fill="var(--surface-card)" stroke="var(--border)" />
      <path d="M0 12a12 12 0 0 1 12-12h296a12 12 0 0 1 12 12v20H0z"
            fill="var(--surface-panel)" />
      <line x1="0" y1="32" x2="320" y2="32" stroke="var(--border)" />
      <rect x="16" y="12" width={baslikGenisligi} height="8" rx="4" fill="var(--text-light)" opacity="0.5" />
      <g transform="translate(0 32)">{children}</g>
    </svg>
  )
}

/** Yatay yazı çizgisi — metin bloklarını temsil eder. */
function Satir({ x, y, w, h = 6, opacity = 0.28, renk = 'var(--text-light)' }) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={renk} opacity={opacity} />
}

const CIZIMLER = {
  /* Soru + kendi rakamlarını girdiğin alanlar + gerekçeli sonuç. */
  'karar-araclari': (
    <>
      <Satir x={16} y={14} w={168} h={8} opacity={0.6} />
      <Satir x={16} y={30} w={104} />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="16" y={50 + i * 28} width="180" height="20" rx="6"
                fill="var(--surface-panel)" stroke="var(--border)" />
          <Satir x={24} y={57 + i * 28} w={54} />
          <Satir x={150} y={57 + i * 28} w={36} opacity={0.5} renk="var(--primary)" />
        </g>
      ))}
      <rect x="210" y="50" width="94" height="76" rx="10"
            fill="var(--primary-light)" stroke="var(--primary)" opacity="0.9" />
      <Satir x={222} y={62} w={40} opacity={0.7} renk="var(--primary-dark)" />
      <rect x="222" y="76" width="58" height="12" rx="4" fill="var(--primary)" opacity="0.85" />
      <Satir x={222} y={96} w={68} opacity={0.45} renk="var(--primary-dark)" />
      <Satir x={222} y={106} w={52} opacity={0.45} renk="var(--primary-dark)" />
    </>
  ),

  /* Gelir/gider satırları ve tutar sütunu; sağda belge yükleme. */
  'isletme-takibi': (
    <>
      <Satir x={16} y={14} w={120} h={8} opacity={0.6} />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <line x1="16" y1={38 + i * 24} x2="212" y2={38 + i * 24} stroke="var(--border)" />
          <circle cx="24" cy={50 + i * 24} r="4"
                  fill={i % 2 === 0 ? 'var(--success)' : 'var(--danger)'} opacity="0.75" />
          <Satir x={36} y={47 + i * 24} w={i % 2 === 0 ? 92 : 74} />
          <Satir x={160} y={47 + i * 24} w={48} opacity={0.5}
                 renk={i % 2 === 0 ? 'var(--success)' : 'var(--danger)'} />
        </g>
      ))}
      <rect x="228" y="38" width="76" height="88" rx="10"
            fill="var(--surface-panel)" stroke="var(--border)" strokeDasharray="4 3" />
      <path d="M258 62h14l8 8v22a4 4 0 0 1-4 4h-18a4 4 0 0 1-4-4V66a4 4 0 0 1 4-4z"
            fill="var(--primary)" opacity="0.2" stroke="var(--primary)" />
      <Satir x={240} y={106} w={52} opacity={0.4} />
    </>
  ),

  /* Sohbet balonları ve yanıtın dayandığı kaynak rozeti. */
  'ai-mentor': (
    <>
      <rect x="104" y="14" width="200" height="30" rx="10" fill="var(--primary)" opacity="0.16" />
      <Satir x={116} y={22} w={140} opacity={0.5} renk="var(--primary-dark)" />
      <Satir x={116} y={32} w={92} opacity={0.4} renk="var(--primary-dark)" />

      <rect x="16" y="54" width="212" height="52" rx="10"
            fill="var(--surface-panel)" stroke="var(--border)" />
      <Satir x={28} y={64} w={172} />
      <Satir x={28} y={76} w={148} />
      <rect x="28" y="88" width="76" height="10" rx="5"
            fill="var(--primary)" opacity="0.22" />
      <Satir x={34} y={91} w={44} opacity={0.6} renk="var(--primary-dark)" />

      <rect x="16" y="120" width="252" height="22" rx="8"
            fill="var(--surface-panel)" stroke="var(--border)" />
      <Satir x={28} y={128} w={92} opacity={0.35} />
      <circle cx="288" cy="131" r="12" fill="var(--primary)" opacity="0.85" />
    </>
  ),

  /* Girdi alanları ve büyük sonuç. */
  hesaplamalar: (
    <>
      <Satir x={16} y={14} w={132} h={8} opacity={0.6} />
      {[0, 1, 2].map(i => (
        <g key={i}>
          <Satir x={16} y={40 + i * 26} w={62} opacity={0.4} />
          <rect x="16" y={50 + i * 26} width="140" height="16" rx="5"
                fill="var(--surface-panel)" stroke="var(--border)" />
          <Satir x={24} y={55 + i * 26} w={40} opacity={0.35} />
        </g>
      ))}
      <rect x="176" y="40" width="128" height="86" rx="12"
            fill="var(--primary)" opacity="0.1" />
      <Satir x={190} y={54} w={62} opacity={0.55} renk="var(--primary-dark)" />
      <rect x="190" y="70" width="82" height="18" rx="5" fill="var(--primary)" opacity="0.9" />
      <Satir x={190} y={98} w={100} opacity={0.4} renk="var(--primary-dark)" />
      <Satir x={190} y={108} w={72} opacity={0.4} renk="var(--primary-dark)" />
    </>
  ),

  /* Solda ders listesi, sağda ders içeriği. */
  kurslar: (
    <>
      <rect x="16" y="14" width="92" height="112" rx="10"
            fill="var(--surface-panel)" stroke="var(--border)" />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <circle cx="30" cy={30 + i * 24} r="5"
                  fill={i === 0 ? 'var(--primary)' : 'var(--text-light)'}
                  opacity={i === 0 ? 0.9 : 0.3} />
          <Satir x={42} y={27 + i * 24} w={i === 0 ? 52 : 44} opacity={i === 0 ? 0.55 : 0.28} />
        </g>
      ))}
      <Satir x={124} y={16} w={150} h={8} opacity={0.6} />
      <Satir x={124} y={34} w={176} />
      <Satir x={124} y={46} w={166} />
      <Satir x={124} y={58} w={140} />
      <rect x="124" y="76" width="180" height="34" rx="8"
            fill="var(--primary-light)" stroke="var(--primary)" opacity="0.8" />
      <Satir x={134} y={86} w={62} opacity={0.6} renk="var(--primary-dark)" />
      <Satir x={134} y={97} w={128} opacity={0.4} renk="var(--primary-dark)" />
    </>
  ),

  /* Gönderi kartları: yazar dairesi, metin, etkileşim satırı. */
  topluluk: (
    <>
      <Satir x={16} y={14} w={96} h={8} opacity={0.6} />
      {[0, 1].map(i => (
        <g key={i}>
          <rect x="16" y={34 + i * 50} width="288" height="42" rx="10"
                fill="var(--surface-panel)" stroke="var(--border)" />
          <circle cx="34" cy={48 + i * 50} r="8" fill="var(--primary)" opacity="0.35" />
          <Satir x={50} y={44 + i * 50} w={66} opacity={0.45} />
          <Satir x={50} y={56 + i * 50} w={196} />
          <Satir x={50} y={66 + i * 50} w={128} opacity={0.22} />
          <circle cx="286" cy={48 + i * 50} r="4" fill="var(--text-light)" opacity="0.3" />
        </g>
      ))}
    </>
  )
}

export default function EkranCizimi({ tur, baslikGenisligi }) {
  const icerik = CIZIMLER[tur]
  if (!icerik) return null
  return <Kabuk baslikGenisligi={baslikGenisligi}>{icerik}</Kabuk>
}
