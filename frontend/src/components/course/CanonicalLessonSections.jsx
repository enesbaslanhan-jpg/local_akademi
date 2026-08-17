import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Calculator, Scale, AlertTriangle, CheckCircle2, Lightbulb, Target } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { CALCULATION_DEFINITIONS } from '@/data/calculationCatalog'
import {
  extractInlineReferences,
  resolveCalculation,
  extractDecisionCode,
  cleanCalculationLabel,
  parseDecisionIntegration,
  parsePracticeCards,
  DECISION_TOOL_TITLES
} from '@/utils/canonicalContent'
import styles from './CanonicalLessonSections.module.css'

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

  const openable = calculations.filter(c => c.status === 'FOUND' && c.definition)

  /* 3. bölüm → karar aracı kartı. Markdown'da karar aracı sinyali yoksa
     bile metadata decisionToolCode ile kart basılır; ama o zaman içerik
     uydurulmaz (bağlam/adımlar yalnız gerçek markdown'dan gelir). */
  const decision = useMemo(() => {
    const parsed = parseDecisionIntegration(strippedSections.decisionTools || '')
    if (parsed) {
      return {
        ...parsed,
        toolCode: parsed.toolCode || decisionToolCode || null,
        toolTitle: parsed.toolTitle || DECISION_TOOL_TITLES[parsed.toolCode || decisionToolCode] || parsed.toolCode || decisionToolCode || null
      }
    }
    if (decisionToolCode) {
      return {
        toolCode: decisionToolCode,
        toolTitle: DECISION_TOOL_TITLES[decisionToolCode] || decisionToolCode,
        context: '',
        bullets: [],
        result: 'Sonuç: gerekçeli karar fişi'
      }
    }
    return null
  }, [strippedSections, decisionToolCode])

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
    ? 'Hesaplamalar ve Karar Araçları Entegrasyonu'
    : hasCalculations
      ? 'Hesaplamalar Entegrasyonu'
      : 'Karar Araçları Entegrasyonu'

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
          <span className={styles.decisionEyebrow}>KARARINI TEST ET</span>
          <h3 className={styles.decisionTitle}>{decision.toolTitle}</h3>
          {decision.context && <p className={styles.decisionContext}>{decision.context}</p>}
          {decision.bullets.length > 0 && (
            <div className={styles.decisionBullets}>
              <span className={styles.decisionBulletsLabel}>Bu araçta</span>
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
            Karar Aracını Aç →
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
                  {DECISION_TOOL_TITLES[code] || code} →
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
                <strong>{definition.title}</strong>
                <span className={styles.calcModes}>
                  {definition.simple ? 'Basit mod' : ''}
                  {definition.simple && definition.detailed ? ' · ' : ''}
                  {definition.detailed ? 'Detaylı mod' : ''}
                </span>
              </div>
              <Button
                variant="secondary" size="sm"
                onClick={() => navigate(`/app/tools?view=calculator&tool=${definition.id}`)}
              >
                Hesaplamayı Aç →
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Formül kartları ---------- */}
      {practice.formulaCards.length > 0 && (
        <div className={styles.practiceGroup}>
          <h3 className={styles.practiceGroupTitle}><Lightbulb size={15} aria-hidden="true" /> Formül Kartları</h3>
          {practice.formulaCards.map((card, i) => {
            const calculation = card.calculation
            const open = calculation?.status === 'FOUND' && calculation.definition
              ? { definition: calculation.definition }
              : null
            return (
              <div key={`${card.title}-${i}`} className={styles.formulaBox}>
                <span className={styles.boxLabel}><Lightbulb size={12} aria-hidden="true" /> FORMÜL KARTI</span>
                <span className={styles.boxTitle}>{card.title}</span>
                {card.description && (
                  <div className={styles.boxText}><MathMarkdown>{card.description}</MathMarkdown></div>
                )}
                {card.formulas.length > 0 && (
                  <div className={styles.formulaBody}>
                    <span className={styles.formulaLabel}>FORMÜL</span>
                    {card.formulas.map((f, j) => (
                      <MathMarkdown key={j}>{`$$\n${f}\n$$`}</MathMarkdown>
                    ))}
                  </div>
                )}
                {card.example.intro && (
                  <div className={styles.formulaBody}>
                    <span className={styles.formulaLabel}>ÖRNEK</span>
                    <MathMarkdown>{`*${card.example.intro}*`}</MathMarkdown>
                    {card.example.formulas.map((f, j) => (
                      <MathMarkdown key={j}>{`$$\n${f}\n$$`}</MathMarkdown>
                    ))}
                  </div>
                )}
                {card.interpretation && (
                  <p className={styles.formulaInterpretation}>{card.interpretation}</p>
                )}
                {open && (
                  <div className={styles.formulaCta}>
                    <Button
                      variant="secondary" size="sm"
                      onClick={() => navigate(`/app/tools?view=calculator&tool=${open.definition.id}`)}
                    >
                      Hesaplamayı Aç →
                    </Button>
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
          <h3 className={styles.practiceGroupTitle}><AlertTriangle size={15} aria-hidden="true" /> Hata / Doğru Kartları</h3>
          {practice.warningCards.map((card, i) => (
            <div key={i} className={styles.mistakeBox}>
              {mistakeTitles[i] && <span className={styles.boxTitle}>{mistakeTitles[i]}</span>}
              <div className={styles.mistakeSide}>
                <span className={`${styles.boxLabel} ${styles.wrongLabel}`}>
                  <AlertTriangle size={12} aria-hidden="true" /> YAYGIN HATA
                </span>
                {card.wrong && <p>{card.wrong}</p>}
              </div>
              <div className={styles.mistakeSide}>
                <span className={`${styles.boxLabel} ${styles.correctLabel}`}>
                  <CheckCircle2 size={12} aria-hidden="true" /> DOĞRU YAKLAŞIM
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