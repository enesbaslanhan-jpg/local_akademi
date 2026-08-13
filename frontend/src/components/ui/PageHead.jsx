import styles from './PageHead.module.css'

/*
 * Sayfa başlığı bloğu — başlık, açıklama ve sağdaki aksiyonlar.
 *
 * 18 ekranın tamamı bununla açılır. Başlık sayfanın <h1>'idir; üst bardaki
 * rota etiketi yalnız konum işaretidir, başlık değildir.
 *
 * <PageHead
 *   title="Finans Merkezi"
 *   subtitle="Finansal konumunu ve riskleri gör."
 *   actions={<Button>Hesaplama başlat</Button>}
 * />
 */
export default function PageHead({ title, subtitle, actions, className = '' }) {
  return (
    <header className={`${styles.head} ${className}`}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
