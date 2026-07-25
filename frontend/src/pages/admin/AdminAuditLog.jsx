import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import { Loading } from '@/components/ui'
import { Shield, Filter, ArrowUpDown } from 'lucide-react'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '-' }
}

export default function AdminAuditLog() {
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
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield size={24} className="text-indigo-600" />
        <h1 className="text-2xl font-bold">Denetim Kayıtları</h1>
        <span className="text-sm text-gray-500 ml-2">({total} kayıt)</span>
      </div>

      <div className="flex gap-4 mb-4 items-end">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Varlık Türü</label>
          <input
            className="border rounded px-3 py-1.5 text-sm"
            placeholder="örn: knowledge_object"
            value={filters.entityType}
            onChange={e => { setFilters(f => ({ ...f, entityType: e.target.value })); setPage(1) }}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">İşlem</label>
          <input
            className="border rounded px-3 py-1.5 text-sm"
            placeholder="örn: knowledge_object.published"
            value={filters.action}
            onChange={e => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1) }}
          />
        </div>
        {(filters.entityType || filters.action) && (
          <button
            className="text-sm text-indigo-600 px-3 py-1.5"
            onClick={() => { setFilters({ entityType: '', action: '' }); setPage(1) }}
          >
            Temizle
          </button>
        )}
      </div>

      {loading ? (
        <Loading text="Yükleniyor..." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 border-b font-medium text-gray-600">Tarih</th>
                  <th className="px-3 py-2 border-b font-medium text-gray-600">İşlem</th>
                  <th className="px-3 py-2 border-b font-medium text-gray-600">Varlık</th>
                  <th className="px-3 py-2 border-b font-medium text-gray-600">Varlık ID</th>
                  <th className="px-3 py-2 border-b font-medium text-gray-600">Kullanıcı</th>
                  <th className="px-3 py-2 border-b font-medium text-gray-600">Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-2"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{log.action}</code></td>
                    <td className="px-3 py-2">{log.entityType}</td>
                    <td className="px-3 py-2 font-mono text-xs">{log.entityId || '-'}</td>
                    <td className="px-3 py-2">{log.actorName || `#${log.actorId}`}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '-'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">Kayıt bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Önceki
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Sayfa {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Sonraki
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
