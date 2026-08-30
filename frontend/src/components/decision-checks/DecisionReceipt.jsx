import { Scale, Printer, Bot, Check, AlertTriangle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './DecisionReceipt.module.css'
import { getFormatLocale } from '@/utils/formatters'

/*
 * Karar Fişi — kararın saklanabilir / yazdırılabilir özet artefaktı.
 * Detaylı sonuç sayfasının yerine geçmez, yanında durur.
 *
 * Tüm alanlar sonuç snapshot'ından okunur; bulunmayan alan hiç gösterilmez.
 */

function formatValue(value, format, t) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const locale = getFormatLocale()
  if (format === 'money') return new Intl.NumberFormat(locale, { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n)
  if (format === 'percent') return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(n / 100)
  if (format === 'months') return t('session.monthsValue', { value: n.toLocaleString(locale, { maximumFractionDigits: 1 }) })
  if (format === 'days') return t('session.daysValue', { value: n.toLocaleString(locale, { maximumFractionDigits: 1 }) })
  return n.toLocaleString(locale, { maximumFractionDigits: 2 })
}

function longDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(getFormatLocale(), {
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

function verdictLabelOf(snapshot, t) {
  const label = snapshot?.calculationOutput?.decisionLabel
  if (label) return label
  const risk = snapshot?.riskLevel
  if (risk === 'low') return t('receipt.verdictStrong')
  if (risk === 'medium') return t('receipt.verdictCaution')
  if (risk === 'high' || risk === 'critical') return t('receipt.verdictWeak')
  return null
}

/* Satır kalemleri. Yapılandırılmış araçlarda metrics[] doğrudan kullanılır
   (girdi yankısı olanlar dahil — fişte detay göstermek doğru).
   DC-PROFIT-001 metrics[] üretmediği için kendi alanlarından kurulur. */
function buildLines(snapshot, excludeKey, t) {
  const calc = snapshot?.calculationOutput
  if (!calc) return []

  if (Array.isArray(calc.metrics) && calc.metrics.length > 0) {
    return calc.metrics
      // Ana sonuç olarak seçilen metrik burada tekrar basılmaz.
      .filter(m => !excludeKey || (m?.key ?? m?.label) !== excludeKey)
      .map(m => ({ label: m.label, value: formatValue(m.value, m.format, t) }))
      .filter(l => l.label && l.value)
  }

  return [
    { label: t('receipt.lines.salePrice'), value: formatValue(calc.revenue, 'money', t) },
    { label: t('receipt.lines.totalKnownCost'), value: formatValue(calc.totalKnownCost, 'money', t) },
    { label: t('receipt.lines.contributionMargin'), value: formatValue(calc.contributionMarginPercent, 'percent', t) },
    { label: t('receipt.lines.breakEvenPrice'), value: formatValue(calc.breakEvenPrice, 'money', t) }
  ].filter(l => l.value)
}

/* Ana sonuç satırı. Öncelik: contribution → adı katkı/net/marj geçen ilk
   metrik. Girdi yankısı olan metrikler (fiyat, adet) ana sonuç yapılmaz. */
const OUTCOME_RE = /katkı|net|marj/i

function buildTotal(snapshot, t) {
  const calc = snapshot?.calculationOutput
  if (!calc) return null

  // DC-PROFIT-001 metrics[] üretmez; contribution zaten listede yer almaz.
  if (Number.isFinite(Number(calc.contribution))) {
    return { label: t('receipt.netContributionPerUnit'), value: formatValue(calc.contribution, 'money', t), key: null }
  }

  const metrics = Array.isArray(calc.metrics) ? calc.metrics : []
  const outcome = metrics.find(m => OUTCOME_RE.test(m?.label || '') && Number.isFinite(Number(m?.value)))
  if (!outcome) return null

  const value = formatValue(outcome.value, outcome.format, t)
  // key: satır kalemleri listesinden bu metriği çıkarmak için kullanılır.
  return value ? { label: outcome.label, value, key: outcome.key ?? outcome.label } : null
}

const VERDICT_ICON = { Good: Check, Warn: AlertTriangle, Bad: X }

/*
 * `sik` -- daraltılmış dikey aralıklar.
 *
 * Ana sayfadaki fiş bir kipin içinde açılıyor ve orada tek ekrana
 * sığması gerekiyor -- ölçüldü: rahat aralıklarla 563 piksel, 768
 * pikselik bir dizüstünde taşıyordu.
 *
 * Karar araçlarının kendi sonuç sayfalarında fiş BİLEREK rahat kalıyor:
 * orada sayfa zaten kaydırılıyor ve fiş asıl çıktı. Üçünü aynı yapmak,
 * bir yerdeki kısıtı gerekçesiz olarak diğerlerine taşımak olurdu.
 */
export default function DecisionReceipt({ snapshot, title, completedAt, sik = false }) {
  const { t } = useTranslation('tools')
  const navigate = useNavigate()
  if (!snapshot) return null

  const tone = toneOf(snapshot)
  const verdict = verdictLabelOf(snapshot, t)
  const summary = snapshot?.calculationOutput?.summary
  const total = buildTotal(snapshot, t)
  const lines = buildLines(snapshot, total?.key, t)
  const date = longDate(completedAt || snapshot?.completedAt)
  const VerdictIcon = tone ? VERDICT_ICON[tone] : null
  const evidence = [
    ...(snapshot?.calculationOutput?.formulas || []).map(item => typeof item === 'string' ? item : item?.description || item?.label || item?.formula),
    ...(snapshot?.calculationOutput?.riskWarnings || []),
  ].filter(Boolean).slice(0, 3)
  const nextSteps = (snapshot?.calculationOutput?.safeNextSteps || []).filter(Boolean).slice(0, 3)

  function askMentor() {
    const context = [title, verdict, summary].filter(Boolean).join(' — ')
    navigate(`/app/mentor?prompt=${encodeURIComponent(t('receipt.mentorPrompt', { context }))}`)
  }

  // `dr-print-root` global bir işaretçidir: CSS Module sınıf adları
  // hash'lendiği için styles/print.css fişi bu sabit adla bulur.
  return (
    <div className={`dr-print-root ${styles.receipt} ${sik ? styles.sikFis : ''}`}>
      <span className={styles.sweepBar} aria-hidden="true" />

      <div className={styles.head}>
        <span className={styles.headIcon} aria-hidden="true">
          <Scale size={19} />
        </span>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>{t('receipt.eyebrow')}</span>
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
          <h4>{t('receipt.evidenceHeading')}</h4>
          <ul>{evidence.map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>
      )}

      {nextSteps.length > 0 && (
        <section className={styles.receiptSection}>
          <h4>{t('receipt.nextStepHeading')}</h4>
          <ol>{nextSteps.map((item, index) => <li key={index}>{item}</li>)}</ol>
        </section>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" />
          {t('receipt.printAction')}
        </button>
        <button type="button" className={styles.action} onClick={askMentor}>
          <Bot size={16} aria-hidden="true" />
          {t('receipt.askMentorAction')}
        </button>
      </div>

      <div className={styles.printSignature}>
        LocalKarar{date ? ` · ${date}` : ''}
      </div>
    </div>
  )
}
