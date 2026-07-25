import styles from './Button.module.css'

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, onClick, type = 'button', ariaLabel, ...props }) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  )
}
