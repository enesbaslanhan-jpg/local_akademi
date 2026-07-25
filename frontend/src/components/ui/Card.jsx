import styles from './Card.module.css'

export default function Card({ children, className = '', onClick, hoverable, selected, ...props }) {
  return (
    <div
      className={`${styles.card} ${hoverable ? styles.hoverable : ''} ${selected ? styles.selected : ''} ${onClick ? styles.clickable : ''} ${className}`}
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
