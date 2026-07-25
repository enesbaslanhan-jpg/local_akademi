import styles from './Progress.module.css'

export default function Progress({ value = 0, max = 100, showLabel = false, size = 'md', variant = 'primary' }) {
  const pct = Math.min(Math.max(0, Number(value)), Number(max))
  const pctDisplay = max > 0 ? Math.round((pct / max) * 100) : 0

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.track} ${styles[size]}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={max}>
        <div className={`${styles.fill} ${styles[variant]}`} style={{ width: `${pctDisplay}%` }} />
      </div>
      {showLabel && (
        <span className={styles.label}>%{pctDisplay}</span>
      )}
    </div>
  )
}
