import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Loading } from '@/components/ui'
import { Shield, Filter, ArrowUpDown } from 'lucide-react'
import styles from './AdminAuditLog.module.css'
import { getFormatLocale } from '@/utils/formatters'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(getFormatLocale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '-' }
}

export default function AdminAuditLog() {
  const { t } = useTranslation('admin')
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ entityType: '', action: '' })
  const limit = 20

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit }
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.action) params.action = filters.action
      const data = await api.admin.getAuditLogs(params)
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch { } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { loadLogs() }, [loadLogs])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className={`p-6 ${styles.page}`}>
      <div className={`flex items-center gap-2 mb-6 ${styles.header}`}>
        <Shield size={24} className={`text-indigo-600 ${styles.headerIcon}`} />
        {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
        <h1 className="sr-only">{t('audit.heading')}</h1>
        <span className={styles.title}>{t('audit.heading')}</span>
        <span className={`text-sm text-gray-500 ml-2 ${styles.count}`}>({total} {t('audit.recordCount')})</span>
      </div>

      <div className={`flex gap-4 mb-4 items-end ${styles.filters}`}>
        <div>
          <label className={`text-xs text-gray-500 mb-1 block ${styles.filterLabel}`}>{t('audit.filters.entityType')}</label>
          <input
            className={`border rounded px-3 py-1.5 text-sm ${styles.filterInput}`}
            placeholder={t('audit.filters.entityPlaceholder')}
            value={filters.entityType}
            onChange={e => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1) }}
          />
        </div>
        <div>
          <label className={`text-xs text-gray-500 mb-1 block ${styles.filterLabel}`}>{t('audit.filters.action')}</label>
          <input
            className={`border rounded px-3 py-1.5 text-sm ${styles.filterInput}`}
            placeholder={t('audit.filters.actionPlaceholder')}
            value={filters.action}
            onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
          />
        </div>
        {(filters.entityType || filters.action) && (
          <button
            className={`text-sm text-indigo-600 px-3 py-1.5 ${styles.clearBtn}`}
            onClick={() => { setFilters({ entityType: '', action: '' }); setPage(1) }}
          >
            {t('audit.filters.clear')}
          </button>
        )}
      </div>

      {loading ? (
        <Loading text={t('audit.loading')} />
      ) : (
        <>
          <div className={`overflow-x-auto ${styles.tableWrap}`}>
            <table className={`w-full text-sm border-collapse ${styles.table}`}>
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.date')}</th>
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.action')}</th>
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.entity')}</th>
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.entityId')}</th>
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.user')}</th>
                  <th className={`px-3 py-2 border-b font-medium text-gray-600 ${styles.th}`}>{t('audit.table.detail')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className={`border-b hover:bg-gray-50 ${styles.tr}`}>
                    <td className={`px-3 py-2 text-gray-600 whitespace-nowrap ${styles.td} ${styles.tdDate}`}>{formatDate(log.createdAt)}</td>
                    <td className={`px-3 py-2 ${styles.td}`}><code className={`text-xs bg-gray-100 px-1.5 py-0.5 rounded ${styles.actionCode}`}>{log.action}</code></td>
                    <td className={`px-3 py-2 ${styles.td}`}>{log.entityType}</td>
                    <td className={`px-3 py-2 font-mono text-xs ${styles.td} ${styles.tdMono}`}>{log.entityId || '-'}</td>
                    <td className={`px-3 py-2 ${styles.td}`}>{log.actorName || `#${log.actorId}`}</td>
                    <td className={`px-3 py-2 text-xs text-gray-500 max-w-xs truncate ${styles.td} ${styles.tdMeta}`}>
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '-'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className={`px-3 py-8 text-center text-gray-400 ${styles.emptyCell}`}>{t('audit.empty')}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={`flex justify-center gap-2 mt-4 ${styles.pagination}`}>
              <button
                className={`px-3 py-1 text-sm border rounded disabled:opacity-50 ${styles.pageBtn}`}
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                {t('audit.pagination.previous')}
              </button>
              <span className={`px-3 py-1 text-sm text-gray-600 ${styles.pageInfo}`}>
                {t('audit.pagination.page')} {page} / {totalPages}
              </span>
              <button
                className={`px-3 py-1 text-sm border rounded disabled:opacity-50 ${styles.pageBtn}`}
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                {t('audit.pagination.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
