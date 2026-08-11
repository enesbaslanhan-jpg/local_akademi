import styles from './Card.module.css'

/*
 * sweep: açık kartta hover'da TEK SEFERLİK ayna hüzmesi (koyu panellerdeki
 * döngüsel varyantın karşılığı). Opsiyonel, çünkü hüzme `overflow: hidden`
 * gerektirir — kartın içinde taşan bir menü/açılır liste varsa kırpar.
 * Bu yüzden yalnızca hüzmenin istendiği kartlarda açılır.
 */
export default function Card({ children, className = '', onClick, hoverable, selected, sweep, ...props }) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${sweep ? styles.sweep : ''} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) } } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return <div className={`${styles.header} ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }) {
  return <div className={`${styles.title} ${className}`}>{children}</div>
}

export function CardMeta({ children, className = '' }) {
  return <div className={`${styles.meta} ${className}`}>{children}</div>
}

export function CardActions({ children, className = '' }) {
  return <div className={`${styles.actions} ${className}`}>{children}</div>
}
