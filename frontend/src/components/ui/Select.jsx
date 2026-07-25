import styles from './Select.module.css'

export default function Select({ label, error, className = '', id, options = [], placeholder, ...props }) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${styles.select} ${error ? styles.hasError : ''}`}
        aria-invalid={!!error}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className={styles.error} role="alert">{error}</span>
      )}
    </div>
  )
}
