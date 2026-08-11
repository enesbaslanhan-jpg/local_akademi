import { useEffect, useRef, useState, useId, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronUp, Check, Search } from 'lucide-react'
import styles from './Select.module.css'

const DEFAULT_EMPTY_MESSAGE = 'Eşleşen sonuç yok'
const SEARCH_THRESHOLD = 12

/*
 * LocalKarar ortak Select/Dropdown. Native <select> menüsü yerine gerçek
 * listbox popover kullanır: arama (uzun listelerde otomatik), klavye
 * navigasyonu, Escape/dış tıklama ile kapanma, mobilde bottom-sheet.
 *
 * API: options=[{value,label,disabled?}], placeholder (sıfırlama seçeneği),
 * value/onChange(value), label/error/className/aria-label/disabled/name.
 */
export default function Select({
  label,
  error,
  className = '',
  variant = 'default',
  id,
  options = [],
  placeholder,
  value,
  onChange,
  disabled,
  name,
  searchable,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  'aria-label': ariaLabel,
}) {
  const uid = useId().replace(/:/g, '')
  const selectId = id || `select-${uid}`
  const listboxId = `${selectId}-listbox`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [query, setQuery] = useState('')

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const optionRefs = useRef([])

  const allOptions = useMemo(() => {
    const base = Array.isArray(options) ? options : []
    if (placeholder) return [{ value: '', label: placeholder, disabled: false }, ...base]
    return base
  }, [options, placeholder])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return allOptions
    return allOptions.filter(o => o.label.toLocaleLowerCase('tr-TR').includes(q))
  }, [allOptions, query])

  const effectiveSearchable = searchable ?? allOptions.length >= SEARCH_THRESHOLD
  const selected = allOptions.find(o => o.value === value)
  const selectedIndex = allOptions.findIndex(o => o.value === value)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(-1)
  }, [])

  const openList = useCallback(() => {
    const initial = selectedIndex >= 0 ? selectedIndex : 0
    setActiveIndex(initial)
    setOpen(true)
  }, [selectedIndex])

  /* Dış tıklama + Escape kapatma */
  useEffect(() => {
    if (!open) return
    function handleMouseDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close()
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, close])

  /* Açılışta odak: arama varsa arama kutusuna, yoksa aktif seçeneğe. */
  useEffect(() => {
    if (!open) return
    if (effectiveSearchable) {
      searchRef.current?.focus()
    } else {
      const el = optionRefs.current[activeIndex]
      ;(el || triggerRef.current)?.focus()
    }
  }, [open, effectiveSearchable, activeIndex])

  /* Aktif seçeneği görünürde tut. */
  useEffect(() => {
    if (!open) return
    const el = optionRefs.current[activeIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  function select(opt) {
    if (!opt || opt.disabled) return
    if (opt.value !== value && typeof onChange === 'function') {
      onChange(opt.value)
    }
    close()
    triggerRef.current?.focus()
  }

  function move(step) {
    setActiveIndex(prev => {
      const len = filtered.length
      if (len === 0) return -1
      let i = prev < 0 ? (step > 0 ? -1 : 0) : prev
      for (let k = 0; k < len; k++) {
        i = (i + step + len) % len
        if (!filtered[i].disabled) return i
      }
      return prev
    })
  }

  function firstEnabled() {
    const i = filtered.findIndex(o => !o.disabled)
    return i
  }

  function lastEnabled() {
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (!filtered[i].disabled) return i
    }
    return -1
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList()
        else move(event.key === 'ArrowDown' ? 1 : -1)
        break
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        if (!open) openList()
        break
      case 'Escape':
        if (open) close()
        break
      default:
        break
    }
  }

  function handleListKeyDown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(firstEnabled())
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(lastEnabled())
        break
      case 'Enter':
      case ' ':
      case 'Spacebar':
        event.preventDefault()
        if (activeIndex >= 0) select(filtered[activeIndex])
        break
      case 'Escape':
        event.preventDefault()
        close()
        triggerRef.current?.focus()
        break
      case 'Tab':
        close()
        break
      default:
        break
    }
  }

  const triggerLabel =
    ariaLabel || label || 'Seçim'

  return (
    <div className={`${styles.wrapper} ${variant === 'bare' ? styles.wrapperBare : ''} ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <button
        type="button"
        id={selectId}
        ref={triggerRef}
        name={name}
        className={`${styles.trigger} ${variant === 'bare' ? styles.triggerBare : ''} ${error ? styles.hasError : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={!!error}
        aria-label={triggerLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.triggerText}>
          {selected ? selected.label : placeholder || 'Seçiniz'}
        </span>
        {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {open && (
        <div
          className={styles.menu}
          id={listboxId}
          role="listbox"
          aria-label={triggerLabel}
          ref={listRef}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
        >
          {effectiveSearchable && (
            <div className={styles.searchWrap}>
              <Search size={14} aria-hidden="true" />
              <input
                ref={searchRef}
                className={styles.searchInput}
                value={query}
                onChange={event => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                }}
                placeholder="Ara..."
                aria-label="Seçenek ara"
              />
            </div>
          )}
          <div className={styles.list}>
            {filtered.length === 0 && (
              <div className={styles.empty}>{emptyMessage}</div>
            )}
            {filtered.map((opt, index) => (
              <div
                key={`${opt.value}-${index}`}
                ref={el => { optionRefs.current[index] = el }}
                id={`${listboxId}-opt-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={opt.value === value}
                aria-disabled={!!opt.disabled}
                className={`${styles.option} ${opt.value === value ? styles.optionSelected : ''} ${
                  index === activeIndex ? styles.optionActive : ''
                }`}
                onMouseDown={event => {
                  event.preventDefault()
                  select(opt)
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className={styles.optionLabel}>{opt.label}</span>
                {opt.value === value && <Check size={14} aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <span className={styles.error} role="alert">{error}</span>
      )}
    </div>
  )
}