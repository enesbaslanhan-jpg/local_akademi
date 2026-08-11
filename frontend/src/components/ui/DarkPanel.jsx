import styles from './DarkPanel.module.css'

/*
 * Signature Dark Panel.
 *
 * Ana Sayfa'da en fazla 3 kez kullanılır (Net Durum KPI, Önerilen Karar
 * Aracı, Son Karar Sonucu). Glass değildir — düz koyu yüzey.
 *
 * sweep: hover'da tek seferlik ince ışık taraması (Mirror Sweep). Yalnızca
 * gerçek hover destekleyen cihazlarda çalışır; açık renkli kartlarda
 * kullanılmaz.
 *
 * bevel: sağ üst köşe pahı. Dar kartlarda imza öğesidir (varsayılan açık),
 * ama sayfa genişliğinde geniş şeritlerde çentik gibi okunduğu için
 * `bevel={false}` ile kapatılabilir. Altın hairline ve iç yansıma her iki
 * varyantta da korunur.
 */
export default function DarkPanel({
  children,
  className = '',
  onClick,
  sweep = false,
  bevel = true,
  ...props
}) {
  return (
    <div
      className={`${styles.panel} ${bevel ? styles.beveled : ''} ${sweep ? styles.sweep : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) }
      } : undefined}
      {...props}
    >
      <span className={styles.sheen} aria-hidden="true" />
      {sweep && <span className={styles.sweepBar} aria-hidden="true" />}
      {children}
    </div>
  )
}
