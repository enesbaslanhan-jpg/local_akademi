import styles from './Loading.module.css'

export default function Loading({ text = 'Yükleniyor...', fullPage }) {
  return (
    <div className={`${styles.loading} ${fullPage ? styles.fullPage : ''}`} role="status" aria-label={text}>
      <div className={styles.spinner} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  )
}
