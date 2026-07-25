import styles from './Badge.module.css'

const variantMap = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  default: 'default'
}

export default function Badge({ children, variant = 'default', className = '', ...props }) {
  const v = variantMap[variant] || 'default'
  return (
    <span className={`${styles.badge} ${styles[v]} ${className}`} {...props}>
      {children}
    </span>
  )
}
