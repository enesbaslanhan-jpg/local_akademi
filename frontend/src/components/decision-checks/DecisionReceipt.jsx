import { Scale, Printer, Bot, Check, AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import styles from './DecisionReceipt.module.css'

/*
 * Karar Fişi — kararın saklanabilir / yazdırılabilir özet artefaktı.
 * Detaylı sonuç sayfasının yerine geçmez, yanında durur.
 *
 * Tüm alanlar sonuç snapshot'ından okunur; bulunmayan alan hiç gösterilmez.
 */

const money = new Intl.NumberFormat('tr-TR', {
  style: 'currency', currency: 'TRY', maximumFractionDigits: 2
})

function formatValue(value, format) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (format === 'money') return money.format(n)
  if (format === 'percent') return `%${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
  if (format === 'months') return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ay`
  if (format === 'days') return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} gün`
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
}

function longDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

/* Karar tonu: yapılandırılmış araçlar decisionTone üretir, DC-PROFIT-001
   üretmez — o durumda riskLevel'a düşülür. */
function toneOf(snapshot) {
  const tone = snapshot?.calculationOutput?.decisionTone
  if (tone === 'good') return 'Good'
  if (tone === 'warning') return 'Warn'
  if (tone === 'bad') return 'Bad'
  const risk = snapshot?.riskLevel
  if (risk === 'low') return 'Good'
  if (risk === 'medium') return 'Warn'
  if (risk === 'high' || risk === 'critical') return 'Bad'
  return null
}

function verdictLabelOf(snapshot) {
  const label = snapshot?.calculationOutput?.decisionLabel
  if (label) return label
  const risk = snapshot?.riskLevel
  if (risk === 'low') return 'Güçlü görünüm'
  if (risk === 'medium') return 'Dikkat gerekiyor'
  if (risk === 'high' || risk === 'critical') return 'Zayıf görünüm'
  return null
}

/* Satır kalemleri. Yapılandırılmış araçlarda metrics[] doğrudan kullanılır
   (girdi yankısı olanlar dahil — fişte detay göstermek doğru).
   DC-PROFIT-001 metrics[] üretmediği için kendi alanlarından kurulur. */
function buildLines(snapshot, excludeKey) {
  const calc = snapshot?.calculationOutput
  if (!calc) return []

  if (Array.isArray(calc.metrics) && calc.metrics.length > 0) {
    return calc.metrics
      // Ana sonuç olarak seçilen metrik burada tekrar basılmaz.
      .filter(m => !excludeKey || (m?.key ?? m?.label) !== excludeKey)
      .map(m => ({ label: m.label, value: formatValue(m.value, m.format) }))
      .filter(l => l.label && l.value)
  }

  return [
    { label: 'Satış fiyatı', value: formatValue(calc.revenue, 'money') },
    { label: 'Toplam bilinen maliyet', value: formatValue(calc.totalKnownCost, 'money') },
    { label: 'Katkı marjı', value: formatValue(calc.contributionMarginPercent, 'percent') },
    { label: 'Başabaş fiyatı', value: formatValue(calc.breakEvenPrice, 'money') }
  ].filter(l => l.value)
}

/* Ana sonuç satırı. Öncelik: contribution → adı katkı/net/marj geçen ilk
   metrik. Girdi yankısı olan metrikler (fiyat, adet) ana sonuç yapılmaz. */
const OUTCOME_RE = /katkı|net|marj/i

function buildTotal(snapshot) {
  const calc = snapshot?.calculationOutput
  if (!calc) return null

  // DC-PROFIT-001 metrics[] üretmez; contribution zaten listede yer almaz.
  if (Number.isFinite(Number(calc.contribution))) {
    return { label: 'Ürün başına net katkı', value: money.format(calc.contribution), key: null }
  }

  const metrics = Array.isArray(calc.metrics) ? calc.metrics : []
  const outcome = metrics.find(m => OUTCOME_RE.test(m?.label || '') && Number.isFinite(Number(m?.value)))
  if (!outcome) return null

  const value = formatValue(outcome.value, outcome.format)
  // key: satır kalemleri listesinden bu metriği çıkarmak için kullanılır.
  return value ? { label: outcome.label, value, key: outcome.key ?? outcome.label } : null
}

const VERDICT_ICON = { Good: Check, Warn: AlertTriangle, Bad: X }

export default function DecisionReceipt({ snapshot, title, completedAt }) {
  const navigate = useNavigate()
  if (!snapshot) return null

  const tone = toneOf(snapshot)
  const verdict = verdictLabelOf(snapshot)
  const summary = snapshot?.calculationOutput?.summary
  const total = buildTotal(snapshot)
  const lines = buildLines(snapshot, total?.key)
  const date = longDate(completedAt || snapshot?.completedAt)
  const VerdictIcon = tone ? VERDICT_ICON[tone] : null
  const evidence = [
    ...(snapshot?.calculationOutput?.formulas || []).map(item => typeof item === 'string' ? item : item?.description || item?.label || item?.formula),
    ...(snapshot?.calculationOutput?.riskWarnings || []),
  ].filter(Boolean).slice(0, 3)
  const nextSteps = (snapshot?.calculationOutput?.safeNextSteps || []).filter(Boolean).slice(0, 3)

  function askMentor() {
    const context = [title, verdict, summary].filter(Boolean).join(' — ')
    navigate(`/app/mentor?prompt=${encodeURIComponent(`${context} karar fişini yorumla; kanıtları, riskleri ve en güvenli sonraki adımı açıkla.`)}`)
  }

  // `dr-print-root` global bir işaretçidir: CSS Module sınıf adları
  // hash'lendiği için styles/print.css fişi bu sabit adla bulur.
  return (
    <div className={`dr-print-root ${styles.receipt}`}>
      <span className={styles.sweepBar} aria-hidden="true" />

      <div className={styles.head}>
        <span className={styles.headIcon} aria-hidden="true">
          <Scale size={19} />
        </span>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>Karar Fişi</span>
          {date && <span className={styles.date}>{date}</span>}
        </div>
      </div>

      {title && <h3 className={styles.decisionTitle}>{title}</h3>}

      {lines.length > 0 && (
        <ul className={styles.lines}>
          {lines.map((l, i) => (
            <li key={i} className={styles.line}>
              <span className={styles.lineLabel}>{l.label}</span>
              <span className={styles.lineValue}>{l.value}</span>
            </li>
          ))}
        </ul>
      )}

      {total && (
        <div className={styles.total}>
          <span className={styles.totalLabel}>{total.label}</span>
          <span className={styles.totalValue}>{total.value}</span>
        </div>
      )}

      {verdict && (
        <div className={`${styles.verdict} ${tone ? styles[`tone${tone}`] : ''}`}>
          {VerdictIcon && (
            <span className={styles.verdictIcon} aria-hidden="true">
              <VerdictIcon size={15} />
            </span>
          )}
          <div className={styles.verdictBody}>
            <span className={styles.verdictLabel}>{verdict}</span>
            {summary && <p className={styles.verdictSummary}>{summary}</p>}
          </div>
        </div>
      )}

      {evidence.length > 0 && (
        <section className={styles.receiptSection}>
          <h4>Kanıt ve risk notları</h4>
          <ul>{evidence.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
      )}

      {nextSteps.length > 0 && (
        <section className={styles.receiptSection}>
          <h4>Sonraki adım</h4>
          <ol>{nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ol>
        </section>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          Yazdır / PDF
        </button>
        <button type="button" className={styles.action} onClick={askMentor}>
          <Bot size={16} aria-hidden="true" />
          Mentora sor
        </button>
      </div>

      <div className={styles.printSignature}>
        LocalKarar{date ? ` · ${date}` : ''}
      </div>
    </div>
  )
}
