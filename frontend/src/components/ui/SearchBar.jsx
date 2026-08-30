import { Search } from 'lucide-react'
import styles from './SearchBar.module.css'
import { useTranslation } from 'react-i18next'

export default function SearchBar({ value, onChange, onSearch, placeholder, className = '' }) {
  const { t } = useTranslation('common')
  const effectivePlaceholder = placeholder || t('ui.searchBar.placeholder')
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
        placeholder={effectivePlaceholder}
        aria-label={effectivePlaceholder}
      />
      <button className={styles.btn} onClick={onSearch} aria-label={t('ui.searchBar.action')}>
        <Search size={18} />
      </button>
    </div>
  )
}
