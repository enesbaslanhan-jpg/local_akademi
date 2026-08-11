import { Link } from 'react-router-dom'
import styles from './CitationBadge.module.css'

export default function CitationBadge({ id, title, code, sourceRefs }) {
  const label = title || 'Bilinmeyen kaynak'
  const sourceCount = Array.isArray(sourceRefs) ? sourceRefs.length : 0
  const showSourceIndicator = sourceCount > 0

  const content = (
    <>
      <span className={`truncate max-w-[150px] md:max-w-[200px] ${styles.label}`}>{label}</span>
      {code && <span className={`ml-1 opacity-80 ${styles.code}`}>({code})</span>}
      {showSourceIndicator && (
        <span className={`ml-1 w-1 h-1 rounded-full bg-current opacity-60 ${styles.sourceDot}`} aria-hidden="true" />
      )}
    </>
  )

  const baseClasses = `
    inline-flex items-center text-[11px] px-1.5 py-0.5 rounded mr-1 mb-1
    bg-[var(--primary-light)] text-[var(--primary)]
    transition-colors
    hover:bg-[var(--primary)] hover:text-white
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1
    ${styles.badge}
  `

  const isValidCode = code && typeof code === 'string' && code.trim().length > 0

  if (isValidCode) {
    return (
      <Link
        to={`/app/knowledge/${encodeURIComponent(code)}`}
        className={`${baseClasses} no-underline`}
        aria-label={`${label} bilgi içeriğini aç`}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </Link>
    )
  }

  return (
    <span className={baseClasses}>
      {content}
    </span>
  )
}
