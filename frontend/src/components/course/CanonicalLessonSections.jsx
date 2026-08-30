import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Calculator, Scale, AlertTriangle, CheckCircle2, Lightbulb, Target } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { CALCULATION_DEFINITIONS } from '@/data/calculationCatalog'
import { useTranslation } from 'react-i18next'
import {
  extractInlineReferences,
  resolveCalculation,
  extractDecisionCode,
  cleanCalculationLabel,
  parseDecisionIntegration,
  parsePracticeCards,
  DECISION_TOOL_TITLES,
  resolveDecisionTool
} from '@/utils/canonicalContent'
import styles from './CanonicalLessonSections.module.css'

const DECISION_TOOL_TITLE_KEYS = {
  'DC-PROFIT-001': 'tools:decisions.cards.profit.title',
  'DC-DISCOUNT-002': 'tools:decisions.cards.discount.title',
  'DC-FREESHIP-003': 'tools:decisions.cards.freeShipping.title',
  'DC-MARKETPLACE-004': 'tools:decisions.cards.marketplace.title',
  'DC-ADS-005': 'tools:decisions.cards.ads.title',
  'DC-HIRE-006': 'tools:decisions.cards.hiring.title',
  'DC-LOAN-007': 'tools:decisions.cards.loan.title',
  'DC-CASHFLOW-008': 'tools:decisions.cards.cashflow.title',
  'DC-BRANCH-009': 'tools:decisions.cards.branch.title',
  'DC-CAMPAIGN-010': 'tools:decisions.cards.campaign.title',
  'DC-STOCK-011': 'tools:decisions.cards.stock.title',
  'DC-CONTINUE-012': 'tools:decisions.cards.continue.title',
  'DC-TAX-013': 'tools:decisions.cards.tax.title'
}

/** KaTeX destekli küçük markdown render'ı (formül kartı içi). */
function MathMarkdown({ children }) {
  if (!children) return null
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {children}
    </ReactMarkdown>
  )
}

/**
 * Canonical dersin yapısal bölümleri.
 *
 * Markdown gövdesinden ayrılan bölümler burada gerçek bileşen olarak
 * render edilir:
 *   - 3. bölüm  → karar aracı kartı (gerçek başlık + bağlam + adımlar)
 *                 + gerçek hesaplama CTA'ları
 *   - 4. bölüm  → formül kartları (gerçek LaTeX) + hata/doğru kartları
 *
 * Böylece aynı içerik gövdede ikinci kez basılmaz ve `[ Karar Araçları > ... ]`
 * gibi düz metinler kullanıcıya ham görünmez.
 */
export default function CanonicalLessonSections({
  decisionToolCode,
  strippedSections = {},
  embeddedPracticeBlocks = []
}) {
  const navigate = useNavigate()
  const { t } = useTranslation(['learning', 'tools'])
  const localizedDecisionTitle = code => {
    const key = DECISION_TOOL_TITLE_KEYS[code]
    return key ? t(key) : (DECISION_TOOL_TITLES[code] || code)
  }

  /* Hesaplama referansları markdown'ın çıkarılan bölümlerinden okunur.
     Eşleşmeyen referans için SAHTE ROUTE üretilmez. */
  const calculations = useMemo(() => {
    const raw = [
      ...extractInlineReferences(strippedSections.decisionTools || '').calculations,
      ...extractInlineReferences(strippedSections.practiceCards || '').calculations,
      ...extractInlineReferences(strippedSections.inlineRefs || '').calculations
    ]
    const seen = new Set()
    return raw
      .filter(label => {
        const key = cleanCalculationLabel(label).toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(label => ({ label, ...resolveCalculation(label, CALCULATION_DEFINITIONS) }))
  }, [strippedSections])

  /*
   * Tekilleştirme ÇÖZÜLEN HESAPLAMAYA göre yapılır, etikete göre değil.
   *
   * Yukarıdaki filtre yalnız aynı metni ikinci kez yazmayı engelliyor. Ama
   * farklı iki etiket (ör. "Başa Baş Satış Adedi" ve "Başa Baş Noktası")
   * aynı hesaplamaya çözülebiliyor; o zaman liste iki satır basıyor ve
   * ikisi de AYNI yere gidiyordu. İlk görülen etiket kalır, sırası korunur.
   */
  const openable = useMemo(() => {
    const gorulen = new Set()
    return calculations.filter(c => {
      if (c.status !== 'FOUND' || !c.definition) return false
      if (gorulen.has(c.definition.id)) return false
      gorulen.add(c.definition.id)
      return true
    })
  }, [calculations])

  /* 3. bölüm → karar aracı kartı. Markdown'da karar aracı sinyali yoksa
     bile metadata decisionToolCode ile kart basılır; ama o zaman içerik
     uydurulmaz (bağlam/adımlar yalnız gerçek markdown'dan gelir). */
  const decision = useMemo(() => {
    const parsed = parseDecisionIntegration(strippedSections.decisionTools || '')
    if (parsed) {
      return {
        ...parsed,
        toolCode: parsed.toolCode || decisionToolCode || null,
        toolTitle: parsed.toolTitle || localizedDecisionTitle(parsed.toolCode || decisionToolCode) || parsed.toolCode || decisionToolCode || null
      }
    }
    if (decisionToolCode) {
      return {
        toolCode: decisionToolCode,
        toolTitle: localizedDecisionTitle(decisionToolCode),
        context: '',
        bullets: [],
        result: t('learning:player.decisionResultFallback')
      }
    }
    return null
  }, [strippedSections, decisionToolCode, t])

  /* 4. bölüm → formül kartları + hata/doğru kartları.
     Her formül kartı, 3. bölümün referans listesine değil DOĞRUDAN
     kataloga çözülür (resolveCalculation). FOUND dönerse gerçek
     hesaplama vardır ve CTA basılır; aksi halde CTA üretilmez
     (sahte route üretme kuralı). */
  const practice = useMemo(() => {
    const { formulaCards, warningCards } = parsePracticeCards(strippedSections.practiceCards || '')
    return {
      formulaCards: formulaCards.map(card => ({
        ...card,
        calculation: resolveCalculation(card.title, CALCULATION_DEFINITIONS)
      })),
      warningCards
    }
  }, [strippedSections])

  /* Metadata'dan gelen hata kartı başlıkları: markdown hata kartında başlık
     yoktur, metadata'da "Sabit Personel Maliyeti Dağıtımı" gibi bir konu adı
     vardır. İçerik kaybolmasın diye başlık olarak kullanılır. */
  const mistakeTitles = useMemo(() => {
    return embeddedPracticeBlocks
      .filter(b => b.type === 'common_mistake')
      .map(b => b.title)
      .filter(Boolean)
  }, [embeddedPracticeBlocks])

  /* Ek DC kodları (markdown içinde geçen ama metadata kodu olmayanlar). */
  const extraDecisionCodes = useMemo(() => {
    const refs = extractInlineReferences(
      [strippedSections.decisionTools, strippedSections.inlineRefs].filter(Boolean).join('\n')
    )
    const codes = [...refs.decisionTools, ...refs.calculations]
      .map(extractDecisionCode)
      .filter(Boolean)
    return [...new Set(codes)].filter(code => code !== decision?.toolCode)
  }, [strippedSections, decision])

  const hasDecision = Boolean(decision?.toolCode)
  const hasCalculations = openable.length > 0

  const sectionHeading = hasCalculations && hasDecision
    ? t('learning:player.canonicalHeadingBoth')
    : hasCalculations
      ? t('learning:player.canonicalHeadingCalculations')
      : t('learning:player.canonicalHeadingDecision')

  if (!hasDecision && !hasCalculations && practice.formulaCards.length === 0 && practice.warningCards.length === 0) return null

  return (
    <Card className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {hasCalculations ? <Calculator size={16} aria-hidden="true" /> : <Scale size={16} aria-hidden="true" />}
        {' '}{sectionHeading}
      </h2>

      {/* ---------- Karar aracı kartı ---------- */}
      {decision?.toolCode && (
        <div className={styles.decisionCard}>
          <span className={styles.decisionEyebrow}>{t('learning:player.decisionEyebrow')}</span>
          <h3 className={styles.decisionTitle}>{decision.toolTitle}</h3>
          {decision.context && <p className={styles.decisionContext}>{decision.context}</p>}
          {decision.bullets.length > 0 && (
            <div className={styles.decisionBullets}>
              <span className={styles.decisionBulletsLabel}>{t('learning:player.decisionBulletsLabel')}</span>
              <ul>
                {decision.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          <p className={styles.decisionResult}>{decision.result}</p>
          <Button
            variant="primary"
            onClick={() => navigate(`/app/decision-checks/${decision.toolCode}`)}
          >
            {t('learning:player.openDecisionTool')}
          </Button>
          {extraDecisionCodes.length > 0 && (
            <div className={styles.ctaRow}>
              {extraDecisionCodes.map(code => (
                <Button
                  key={code}
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/app/decision-checks/${code}`)}
                >
                  {localizedDecisionTitle(code)} →
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Hesaplama CTA'ları ---------- */}
      {hasCalculations && (
        <div className={styles.calcList}>
          {openable.map(({ label, definition }) => (
            <div key={label} className={styles.calcItem}>
              <div className={styles.calcInfo}>
                <strong>{t(`tools:${definition.titleKey}`)}</strong>
                <span className={styles.calcModes}>
                  {definition.simple ? t('learning:player.simpleMode') : ''}
                  {definition.simple && definition.detailed ? ' · ' : ''}
                  {definition.detailed ? t('learning:player.detailedMode') : ''}
                </span>
              </div>
              <Button
                variant="secondary" size="sm"
                onClick={() => navigate(`/app/tools?view=calculator&tool=${definition.id}`)}
              >
                {t('learning:player.openCalculation')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Formül kartları ---------- */}
      {practice.formulaCards.length > 0 && (
        <div className={styles.practiceGroup}>
          <h3 className={styles.practiceGroupTitle}><Lightbulb size={15} aria-hidden="true" /> {t('learning:player.formulaCardsTitle')}</h3>
          {practice.formulaCards.map((card, i) => {
            const calculation = card.calculation
            const open = calculation?.status === 'FOUND' && calculation.definition
              ? { definition: calculation.definition }
              : null
            const decisionToolCode = card.decisionToolCode
            const decisionToolTitle = decisionToolCode ? localizedDecisionTitle(decisionToolCode) : null
            return (
              <div key={`${card.title}-${i}`} className={styles.formulaBox}>
                <span className={styles.boxLabel}><Lightbulb size={12} aria-hidden="true" /> {t('learning:player.formulaCardLabel')}</span>
                <span className={styles.boxTitle}>{card.title}</span>
                {card.description && (
                  <div className={styles.boxText}><MathMarkdown>{card.description}</MathMarkdown></div>
                )}
                {card.formulas.length > 0 && (
                  <div className={styles.formulaBody}>
                    <span className={styles.formulaLabel}>{t('learning:player.formulaLabel')}</span>
                    {card.formulas.map((f, j) => (
                      <MathMarkdown key={j}>{`$$\n${f}\n$$`}</MathMarkdown>
                    ))}
                  </div>
                )}
                {card.example.intro && (
                  <div className={styles.formulaBody}>
                    <span className={styles.formulaLabel}>{t('learning:player.exampleLabel')}</span>
                    <MathMarkdown>{`*${card.example.intro}*`}</MathMarkdown>
                    {card.example.formulas.map((f, j) => (
                      <MathMarkdown key={j}>{`$$\n${f}\n$$`}</MathMarkdown>
                    ))}
                  </div>
                )}
                {card.interpretation && (
                  <p className={styles.formulaInterpretation}>{card.interpretation}</p>
                )}
                {(open || decisionToolCode) && (
                  <div className={styles.formulaCta}>
                    {open && (
                      <Button
                        variant="secondary" size="sm"
                        onClick={() => navigate(`/app/tools?view=calculator&tool=${open.definition.id}`)}
                      >
                        {t('learning:player.openCalculation')}
                      </Button>
                    )}
                    {decisionToolCode && (
                      <Button
                        variant="primary" size="sm"
                        onClick={() => navigate(`/app/decision-checks/${decisionToolCode}`)}
                      >
                        {t('learning:player.openDecisionToolWithTitle', { title: decisionToolTitle || decisionToolCode })}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- Hata / Doğru kartları ---------- */}
      {practice.warningCards.length > 0 && (
        <div className={styles.practiceGroup}>
          <h3 className={styles.practiceGroupTitle}><AlertTriangle size={15} aria-hidden="true" /> {t('learning:player.warningCardsTitle')}</h3>
          {practice.warningCards.map((card, i) => (
            <div key={i} className={styles.mistakeBox}>
              {mistakeTitles[i] && <span className={styles.boxTitle}>{mistakeTitles[i]}</span>}
              <div className={styles.mistakeSide}>
                <span className={`${styles.boxLabel} ${styles.wrongLabel}`}>
                  <AlertTriangle size={12} aria-hidden="true" /> {t('learning:player.wrongLabel')}
                </span>
                {card.wrong && <p>{card.wrong}</p>}
              </div>
              <div className={styles.mistakeSide}>
                <span className={`${styles.boxLabel} ${styles.correctLabel}`}>
                  <CheckCircle2 size={12} aria-hidden="true" /> {t('learning:player.correctLabel')}
                </span>
                {card.correct && <p>{card.correct}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
