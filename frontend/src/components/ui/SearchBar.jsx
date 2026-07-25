import { Search } from 'lucide-react'
import styles from './SearchBar.module.css'

export default function SearchBar({ value, onChange, onSearch, placeholder = 'Ara...', className = '' }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch?.()
  }

  return (
    <div className={`${styles.bar} ${className}`}>
      <input
        className={styles.input}
        type="search"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      <button className={styles.btn} onClick={onSearch} aria-label="Ara">
        <Search size={18} />
      </button>
    </div>
  )
}
