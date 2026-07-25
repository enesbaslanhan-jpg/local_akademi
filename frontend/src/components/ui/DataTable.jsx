import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './DataTable.module.css'

export default function DataTable({ columns = [], data = [], loading, emptyMessage = 'Veri bulunamadı', page, pageSize, total, onPageChange, onSort, sortKey, sortDir, keyField = 'id', mobileCard }) {
  if (loading) {
    return (
      <div className={styles.wrapper}>
        {[1,2,3].map(i => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '40%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <div className={styles.empty}>{emptyMessage}</div>
  }

  const totalPages = Math.ceil((total || data.length) / (pageSize || data.length))

  return (
    <div className={styles.wrapper}>
      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${styles.th} ${col.sortable ? styles.sortable : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span className={styles.sortIcon}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row[keyField] ?? idx} className={styles.tr} onClick={() => columns.find(c => c.render)?.onClick?.(row)}>
                {columns.map(col => (
                  <td key={col.key} className={styles.td} data-label={col.label}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className={styles.mobileCards}>
        {data.map((row, idx) => (
          <div key={row[keyField] ?? idx} className={styles.mobileCard}>
            {columns.map(col => (
              <div key={col.key} className={styles.mobileField}>
                <span className={styles.mobileLabel}>{col.label}</span>
                <span className={styles.mobileValue}>
                  {col.render ? col.render(row) : row[col.key] ?? '-'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft size={16} />
          </button>

          <span className={styles.pageInfo}>
            {page} / {totalPages}
          </span>

          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => onPageChange?.(page + 1)}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
