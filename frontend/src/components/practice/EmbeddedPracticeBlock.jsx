import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMentorContext } from '@/context/MentorContext'
import {
  Calculator, CheckSquare, AlertTriangle, Zap,
  ExternalLink, MessageSquare, ArrowRight
} from 'lucide-react'
import styles from './EmbeddedPracticeBlock.module.css'

const TYPE_LABELS = {
  formula: 'Formül Kutusu',
  checklist: 'Kontrol Listesi',
  common_mistake: 'Yaygın Hata',
  quick_application: 'Hızlı Uygulama'
}

const TYPE_ICONS = {
  formula: Calculator,
  checklist: CheckSquare,
  common_mistake: AlertTriangle,
  quick_application: Zap
}

const TYPE_BADGE_CLASS = {
  formula: styles.badgeFormula,
  checklist: styles.badgeChecklist,
  common_mistake: styles.badgeMistake,
  quick_application: styles.badgeQuick
}

export function EmbeddedPracticeBlock({
  blocks = [],
  contextType,
  contextCode,
  contextTitle
}) {
  const navigate = useNavigate()
  const mentorContext = useMentorContext()
  const isContextualMentorEnabled = import.meta.env.VITE_FF_CONTEXTUAL_MENTOR === 'true'

  if (!blocks || blocks.length === 0) return null

  return (
    <section aria-label="Uygulama kutuları" className={styles.blocks}>
      {blocks.map(block => (
        <BlockItem
          key={block.id}
          block={block}
          contextType={contextType}
          contextCode={contextCode}
          contextTitle={contextTitle}
          isContextualMentorEnabled={isContextualMentorEnabled}
          mentorContext={mentorContext}
          navigate={navigate}
        />
      ))}
    </section>
  )
}

function BlockItem({ block, contextType, contextCode, contextTitle, isContextualMentorEnabled, mentorContext, navigate }) {
  const { type, title, shortDescription, content, source, relatedDecisionCheckCode } = block
  const Icon = TYPE_ICONS[type]

  // KO detay sayfasında kaynak, gösterilen KO'nun kendine işaret ediyorsa
  // (dairesel/self-referential kaynak gösterimi) kaynak linkini gizle.
  const isSelfReferentialSource =
    contextType === 'knowledge_object' &&
    !!contextCode &&
    !!source?.code &&
    source.code === contextCode

  const handleAskMentor = useCallback(() => {
    if (mentorContext?.openMentorWithContext) {
      mentorContext.openMentorWithContext({
        contextType,
        source: 'embedded_practice_block',
        knowledgeObjectCode: contextType === 'knowledge_object' ? contextCode : undefined,
        courseCode: contextType === 'course' ? contextCode : undefined,
        title: contextTitle || title,
        route: window.location.pathname
      })
    }
  }, [mentorContext, contextType, contextCode, contextTitle, title])

  const handlePrimaryAction = useCallback(() => {
    const action = content?.primaryAction
    if (action?.code === 'open_sources' || action?.label?.toLowerCase().includes('kaynak')) {
      const heading = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5')).find(
        el => el.textContent.toLowerCase().includes('kaynak')
      )
      if (heading) {
        heading.scrollIntoView({ behavior: 'smooth' })
        return
      }
    }
    if (relatedDecisionCheckCode) {
      navigate(`/app/decision-checks/${relatedDecisionCheckCode}`)
      return
    }
    navigate('/app/decision-checks')
  }, [content?.primaryAction, relatedDecisionCheckCode, navigate])

  return (
    <article className={styles.block} data-testid={`practice-block-${type}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={`${styles.badge} ${TYPE_BADGE_CLASS[type]}`}>
          <Icon size={12} /> {TYPE_LABELS[type]}
        </span>
      </div>

      {shortDescription && <p className={styles.shortDescription}>{shortDescription}</p>}

      {content.mainContent && content.mainContent !== shortDescription && (
        <p className={styles.mainContent}>{content.mainContent}</p>
      )}

      {type === 'formula' && content.formula && (
        <div className={styles.formulaBox}>
          <div className={styles.formulaLabel}>Hesaplama / Formül</div>
          <code className={styles.formula}>{content.formula}</code>
        </div>
      )}

      {content.example && (
        <div className={styles.exampleBox}>
          <div className={styles.exampleLabel}>Örnek Senaryo</div>
          <p className={styles.example}>{content.example}</p>
        </div>
      )}

      {type === 'common_mistake' && (
        <>
          {content.mistake && (
            <div className={styles.warningBox}>
              <div className={styles.warningTitle}><AlertTriangle size={14} /> Yaygın Hata</div>
              <p className={styles.warningText}>{content.mistake}</p>
            </div>
          )}
          {content.correctApproach && (
            <div className={styles.correctBox}>
              <div className={styles.correctLabel}><CheckSquare size={14} /> Doğru Yaklaşım</div>
              <p className={styles.correctText}>{content.correctApproach}</p>
            </div>
          )}
        </>
      )}

      {type === 'checklist' && content.checklistItems && content.checklistItems.length > 0 && (
        <Checklist items={content.checklistItems} />
      )}

      {type === 'quick_application' && content.quickSteps && content.quickSteps.length > 0 && (
        <ol className={styles.steps}>
          {content.quickSteps.map((step, idx) => (
            <li key={idx} className={styles.step}>{step}</li>
          ))}
        </ol>
      )}

      {content.keyTakeaway && (
        <div className={styles.takeaway}>{content.keyTakeaway}</div>
      )}

      <div className={styles.actions}>
        {source?.code && source.route && !isSelfReferentialSource && (
          <Link to={source.route} className={`${styles.actionLink} ${styles.sourceLink}`}>
            <ExternalLink size={14} /> Kaynak: {source.title}
          </Link>
        )}

        {content?.primaryAction ? (
          <button
            type="button"
            className={`${styles.actionLink} ${styles.toolLink}`}
            onClick={handlePrimaryAction}
          >
            {content.primaryAction.code === 'open_sources' || content.primaryAction.label?.toLowerCase().includes('kaynak') ? (
              <ExternalLink size={14} />
            ) : (
              <ArrowRight size={14} />
            )}
            {' '}{content.primaryAction.label}
          </button>
        ) : relatedDecisionCheckCode ? (
          <button
            type="button"
            className={`${styles.actionLink} ${styles.toolLink}`}
            onClick={() => navigate(`/app/decision-checks/${relatedDecisionCheckCode}`)}
          >
            <ArrowRight size={14} /> İlgili Karar Aracı
          </button>
        ) : null}

        {isContextualMentorEnabled && (
          <button
            type="button"
            className={`${styles.actionLink} ${styles.mentorBtn}`}
            onClick={handleAskMentor}
          >
            <MessageSquare size={14} /> Mentora Sor
          </button>
        )}
      </div>
    </article>
  )
}

function Checklist({ items }) {
  const [checked, setChecked] = useState(() => {
    try {
      const key = `epb-checklist-${items.join('|').slice(0, 64)}`
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const toggle = useCallback((idx) => {
    setChecked(prev => {
      const next = { ...prev, [idx]: !prev[idx] }
      try {
        const key = `epb-checklist-${items.join('|').slice(0, 64)}`
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [items])

  return (
    <ul className={styles.checklist}>
      {items.map((item, idx) => (
        <li key={idx} className={`${styles.checklistItem} ${checked[idx] ? styles.checked : ''}`}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={!!checked[idx]}
            onChange={() => toggle(idx)}
            aria-label={item}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
