import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Badge, Button, EmptyState, SearchBar, Select } from '@/components/ui'
import { BookOpen, ChevronRight, Filter, X, Clock } from 'lucide-react'
import styles from './KnowledgePage.module.css'

const LEVELS = ['Başlangıç', 'Orta', 'İleri']
const SORT_OPTIONS = [
  { value: 'updatedAt_desc', label: 'En Yeni' },
  { value: 'updatedAt_asc', label: 'En Eski' },
  { value: 'title_asc', label: 'Başlık (A-Z)' },
  { value: 'title_desc', label: 'Başlık (Z-A)' }
]

export default function KnowledgePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [data, setData] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const mountedRef = useRef(false)
  const abortRef = useRef(null)

  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const sortBy = searchParams.get('sortBy') || 'updatedAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const page = parseInt(searchParams.get('page')) || 1
  const pageSize = 12

  const updateFilter = useCallback((key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    if (key !== 'page') params.set('page', '1')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    const params = { page, pageSize, sortBy, sortOrder }
    if (search) params.search = search
    if (category) params.category = category

    try {
      const res = await api.knowledgeV2.listTopics(params)
      if (!mountedRef.current || controller.signal.aborted) return
      setData(res)
    } catch (err) {
      if (!mountedRef.current || err.name === 'AbortError') return
      setError(err.message || 'Liste yüklenemedi')
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setLoading(false)
    }
  }, [page, pageSize, search, category, sortBy, sortOrder])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.knowledgeV2.getCategories()
      if (mountedRef.current) setCategories(res.categories || [])
    } catch {}
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchData()
    fetchCategories()
    return () => { mountedRef.current = false }
  }, [fetchData, fetchCategories])

  const hasActiveFilters = !!(search || category)
  const activeFilterCount = [search, category].filter(Boolean).length

  const results = data?.results || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 0

  const groupedByCategory = results.reduce((acc, topic) => {
    const cat = topic.category || 'Diğer'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(topic)
    return acc
  }, {})

  if (loading && results.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.headerSkeleton}>
          <div className={styles.skelLine} style={{ width: '200px' }} />
          <div className={styles.skelLine} style={{ width: '300px' }} />
        </div>
        <div className={styles.gridSkeleton}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.cardSkeleton}>
              <div className={styles.skelLine} style={{ width: '80px' }} />
              <div className={styles.skelLine} style={{ width: '70%' }} />
              <div className={styles.skelLine} style={{ width: '50%' }} />
              <div className={styles.skelLine} style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Button onClick={fetchData}>Tekrar Dene</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
          <h1 className="sr-only">Bilgi Nesneleri</h1>
          <p className={styles.subtitle}>
            {total > 0 ? `${total} konu başlığı bulundu` : 'Henüz içerik bulunmuyor'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={styles.filterToggle}
          onClick={() => setFiltersOpen(!filtersOpen)}
          ariaLabel="Filtreleri aç/kapa"
        >
          <Filter size={16} />
          Filtreler
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchBar
            value={search}
            onChange={v => updateFilter('search', v)}
            onSearch={() => { if (search) updateFilter('search', search) }}
            placeholder="Konu ara..."
          />
        </div>
        <div className={styles.sortWrap}>
          <Select
            value={`${sortBy}_${sortOrder}`}
            onChange={value => {
              const [sb, so] = value.split('_')
              const params = new URLSearchParams(searchParams)
              params.set('sortBy', sb)
              params.set('sortOrder', so)
              params.set('page', '1')
              setSearchParams(params, { replace: true })
            }}
            options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            aria-label="Sıralama"
          />
        </div>
      </div>

      {filtersOpen && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterRow}>
            <Select
              label="Kategori"
              value={category}
              onChange={value => updateFilter('category', value)}
              placeholder="Tüm Kategoriler"
              options={categories.map(c => ({ value: c.name, label: `${c.name} (${c.count})` }))}
            />
          </div>
          {hasActiveFilters && (
            <button className={styles.clearFilters} onClick={() => setSearchParams({})}>
              <X size={14} /> Tüm Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          {search && (
            <span className={styles.activeFilterBadge}>
              Ara: "{search}"
              <button onClick={() => updateFilter('search', '')} aria-label="Kaldır"><X size={12} /></button>
            </span>
          )}
          {category && (
            <span className={styles.activeFilterBadge}>
              {category}
              <button onClick={() => updateFilter('category', '')} aria-label="Kaldır"><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <div className={styles.emptySection}>
          <EmptyState
            icon={<BookOpen size={48} />}
            title="Henüz içerik yok"
            message={hasActiveFilters
              ? 'Bu filtrelerle eşleşen konu bulunamadı.'
              : 'Henüz yayınlanmış profesyonel içerik bulunmuyor.'}
            action
            actionLabel={hasActiveFilters ? 'Filtreleri Temizle' : "Dashboard'a Dön"}
            onAction={() => hasActiveFilters ? setSearchParams({}) : navigate('/app/dashboard')}
          />
        </div>
      ) : (
        <>
          {Object.entries(groupedByCategory).map(([catName, topics]) => (
            <div key={catName} className={styles.categoryGroup}>
              <h2 className={styles.categoryTitle}>{catName}</h2>
              <div className={styles.cardGrid}>
                {topics.map(topic => (
                  <Card
                    key={topic.topicKey}
                    className={styles.card}
                    hoverable
                    onClick={() => navigate(`/app/knowledge/topic/${topic.topicKey}`)}
                  >
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>{topic.title}</div>
                      <div className={styles.cardLevels}>
                        {topic.availableLevels.map(lvl => (
                          <span
                            key={lvl.level}
                            className={styles.levelChip}
                            onClick={e => {
                              e.stopPropagation()
                              navigate(`/app/knowledge/topic/${topic.topicKey}?level=${lvl.level}`)
                            }}
                          >
                            {lvl.level}
                          </span>
                        ))}
                      </div>
                      <div className={styles.cardMeta}>
                        <span className={styles.sourceCount}>
                          {topic.sourceCount > 0 ? `${topic.sourceCount} kaynak` : 'Kaynak yok'}
                        </span>
                        {topic.estimatedTime > 0 && (
                          <span className={styles.cardDuration}>
                            <Clock size={12} /> ~{topic.estimatedTime} dk
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardFooter}>
                      <span className={styles.cardDate}>
                        {new Date(topic.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={styles.cardAction}>
                        İncele <ChevronRight size={14} />
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateFilter('page', String(page - 1))}
            ariaLabel="Önceki sayfa"
          >
            Önceki
          </Button>
          <div className={styles.pageInfo}>
            {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateFilter('page', String(page + 1))}
            ariaLabel="Sonraki sayfa"
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  )
}
