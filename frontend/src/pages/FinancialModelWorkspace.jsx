import { useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Select, Button, Loading } from '@/components/ui'
import {
  AlertTriangle, ArrowLeft, Bot, CheckCircle2, ChevronRight, FlaskConical,
  History, Info, Play, Save, ShieldCheck
} from 'lucide-react'
import styles from './FinancialModelWorkspace.module.css'
import { MODEL_TO_CALCULATION } from '@/data/calculationCatalog'

const TABS = [
  { id: 'workspace', labelKey: 'models.tabs.workspace' },
  { id: 'inputs', labelKey: 'models.tabs.inputs' },
  { id: 'scenarios', labelKey: 'models.tabs.scenarios' },
  { id: 'outputs', labelKey: 'models.tabs.outputs' },
  { id: 'checks', labelKey: 'models.tabs.checks' },
  { id: 'sources', labelKey: 'models.tabs.sources' },
  { id: 'changes', labelKey: 'models.tabs.changes' },
]
const SCENARIOS = [
  { id: 'base', labelKey: 'models.scenarios.base' },
  { id: 'optimistic', labelKey: 'models.scenarios.optimistic' },
  { id: 'adverse', labelKey: 'models.scenarios.adverse' },
  { id: 'stress', labelKey: 'models.scenarios.stress' },
  { id: 'custom', labelKey: 'models.scenarios.custom' },
]
const CONFIDENCE_LABELS = { low: 'models.confidence.low', medium: 'models.confidence.medium', high: 'models.confidence.high' }

function formatValue(value, t, locale) {
  if (value === null || value === undefined) return t('models.notCalculated')
  if (typeof value === 'number') return value.toLocaleString(locale, { maximumFractionDigits: 4 })
  if (typeof value === 'boolean') return value ? t('models.yes') : t('models.no')
  return String(value)
}

function titleFromKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
}

export default function FinancialModelWorkspace() {
  const { t, i18n } = useTranslation(['tools', 'common'])
  const formatLocale = i18n.resolvedLanguage || i18n.language
  const { modelCode } = useParams()
  const [searchParams] = useSearchParams()
  const sourceDocumentId = searchParams.get('documentId') || ''
  const navigate = useNavigate()
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('workspace')
  const [inputs, setInputs] = useState({})
  /*
   * Pazaryeri hesaplama ipucu — gerçek satış fiyatı ve komisyon.
   * Bağlı mağaza yoksa `available: false` döner ve panel çizilmez.
   */
  const [ipucu, setIpucu] = useState(null)
  const [metadata, setMetadata] = useState({})
  const [scenario, setScenario] = useState('base')
  const [runs, setRuns] = useState([])
  const [currentRun, setCurrentRun] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [decisionOpen, setDecisionOpen] = useState(false)
  const [decision, setDecision] = useState({ decision: '', expectedOutcome: '' })
  const [decisionSaved, setDecisionSaved] = useState(false)
  const [sourceDocumentName, setSourceDocumentName] = useState('')

  /*
   * HANGİ MODELE HANGİ ALAN.
   *
   * Bilerek DAR: yalnız pazaryeri verisinin birebir karşıladığı
   * alanlar. `avgUnitPrice` bir ÜRÜN birim fiyatıdır; onu sipariş
   * geliri ya da dönem cirosu diye yazmak, farklı büyüklükleri aynı
   * sayıyla doldurmak olurdu — sessizce yanlış bir hesap üretirdi.
   */
  const ipucuAlanlari = useMemo(() => {
    if (!model || !ipucu?.available) return null
    if (model.code !== 'PRODUCT_PROFITABILITY') return null
    const alanlar = { netPrice: ipucu.avgUnitPrice }
    /* Kanal kesintisi ancak komisyon ORANI biliniyorsa hesaplanabilir;
       bilinmiyorsa o alan elle bırakılıyor, sıfır yazılmıyor. */
    if (ipucu.avgCommissionPercent !== null && ipucu.avgCommissionPercent !== undefined) {
      alanlar.channelCost = Math.round(ipucu.avgUnitPrice * ipucu.avgCommissionPercent) / 100
    }
    return alanlar
  }, [model, ipucu])

  function ipucundanDoldur() {
    if (!ipucuAlanlari) return
    setInputs(current => ({
      ...current,
      ...Object.fromEntries(Object.entries(ipucuAlanlari).map(([k, v]) => [k, String(v)]))
    }))
    /* Kaynak işaretleniyor: kullanıcı bu rakamı kendisinin mi yoksa
       pazaryeri verisinin mi koyduğunu sonradan görebilmeli. */
    setMetadata(current => {
      const yeni = { ...current }
      for (const alan of Object.keys(ipucuAlanlari)) {
        yeni[alan] = {
          ...(current[alan] || {}),
          sourceType: 'marketplace',
          sourceReference: t('tools:models.hintReference', { source: ipucu.source || t('tools:models.marketplaceSource'), sampleSize: ipucu.sampleSize }),
          effectiveDate: new Date().toISOString().slice(0, 10)
        }
      }
      return yeni
    })
  }

  useEffect(() => {
    if (!activeWorkspaceId) return
    api.marketplace.calculationHints(activeWorkspaceId).then(setIpucu).catch(() => setIpucu(null))
  }, [activeWorkspaceId])

  useEffect(() => {
    Promise.all([
      api.financialModels.get(modelCode),
      activeWorkspaceId ? api.financialModels.runs(activeWorkspaceId, modelCode).catch(() => ({ runs: [] })) : Promise.resolve({ runs: [] }),
      activeWorkspaceId && sourceDocumentId
        ? api.workspace.documents.financialModelSuggestions(activeWorkspaceId, sourceDocumentId).catch(() => null)
        : Promise.resolve(null),
    ]).then(([modelData, runData, documentMapping]) => {
      setModel(modelData)
      setRuns(runData.runs || [])
      const mappedModel = documentMapping?.models?.find(item => item.code === modelData.code)
      setInputs(Object.fromEntries((modelData.inputs || []).map(input => [input.key, mappedModel?.mappedInputs?.[input.key] ?? ''])))
      setMetadata(Object.fromEntries((modelData.inputs || []).map(input => [input.key, {
        sourceType: mappedModel?.mappedInputs?.[input.key] !== undefined ? 'document' : 'user',
        sourceReference: mappedModel?.mappedInputs?.[input.key] !== undefined ? documentMapping.documentName : '',
        effectiveDate: new Date().toISOString().slice(0, 10),
        userVerified: false,
      }])))
      setSourceDocumentName(mappedModel ? documentMapping.documentName : '')
    }).catch(err => setError(err.message || t('tools:models.errors.load'))).finally(() => setLoading(false))
  }, [modelCode, activeWorkspaceId, sourceDocumentId, t, formatLocale])

  const outputDefinitions = useMemo(() => Object.fromEntries((model?.outputs || []).map(item => [item.key, item])), [model])
  const latestRun = currentRun || runs[0] || null
  const latestMetrics = useMemo(() => Object.entries(latestRun?.outputs || {}).filter(([, value]) => typeof value !== 'object'), [latestRun])
  const calculation = MODEL_TO_CALCULATION[modelCode]

  async function runModel() {
    if (!activeWorkspaceId) {
      navigate('/app/workspaces')
      return
    }
    setRunning(true)
    setError('')
    setDecisionSaved(false)
    try {
      const payloadInputs = Object.fromEntries(model.inputs.map(input => {
        if (input.type === 'number_array') {
          return [input.key, String(inputs[input.key] || '').split(/[;,\n]/).map(value => Number(value.trim())).filter(Number.isFinite)]
        }
        return [input.key, inputs[input.key] === '' ? undefined : Number(inputs[input.key])]
      }))
      const assumptions = model.inputs
        .filter(input => inputs[input.key] !== '')
        .map(input => ({
          key: input.key,
          value: payloadInputs[input.key],
          unit: input.unit,
          sourceType: metadata[input.key]?.sourceType || 'user',
          sourceReference: metadata[input.key]?.sourceReference || undefined,
          effectiveDate: metadata[input.key]?.effectiveDate ? new Date(`${metadata[input.key].effectiveDate}T00:00:00.000Z`).toISOString() : undefined,
          userVerified: Boolean(metadata[input.key]?.userVerified),
        }))
      const result = await api.financialModels.run(activeWorkspaceId, model.code, {
        inputs: payloadInputs,
        assumptions,
        scenarioName: scenario,
        ...(sourceDocumentName && sourceDocumentId ? { sourceDocumentId } : {}),
      })
      setCurrentRun(result)
      setRuns(current => [{ id: result.id, scenarioName: result.scenarioName, createdAt: result.createdAt, outputs: result.outputs, model: { code: model.code, name: model.name } }, ...current])
      setTab('outputs')
    } catch (err) {
      setError(err.message || t('tools:models.errors.run'))
    } finally {
      setRunning(false)
    }
  }

  async function saveDecision() {
    if (!currentRun?.id || !decision.decision.trim() || !decision.expectedOutcome.trim()) return
    try {
      await api.financialModels.saveDecision(activeWorkspaceId, {
        modelRunId: currentRun.id,
        decision: decision.decision.trim(),
        expectedOutcome: decision.expectedOutcome.trim(),
      })
      setDecisionSaved(true)
      setDecisionOpen(false)
    } catch (err) {
      setError(err.message || t('tools:models.errors.decisionSave'))
    }
  }

  function askMentor() {
    const prompt = currentRun
      ? t('tools:models.mentorPromptExplain', { model: model.name, runId: currentRun.id })
      : t('tools:models.mentorPromptWhen', { model: model.name })
    navigate(`/app/mentor?prompt=${encodeURIComponent(prompt)}`)
  }

  if (loading) return <Loading text={t('tools:models.loading')} />
  if (!model) return <div className={styles.errorPage}>{error || t('tools:models.errors.notFound')}</div>

  return (
    <main className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/app/calculations')}><ArrowLeft size={17} /> {t('tools:calculations.title')}</button>

      {calculation?.simple && <div className={styles.modeSwitch} role="tablist" aria-label={t('tools:calculations.modeAria')}><button type="button" role="tab" aria-selected="false" onClick={() => navigate(`/app/calculations?tool=${calculation.simple.formulaId}`)}>{t('tools:calculations.simpleMode')}</button><button type="button" role="tab" aria-selected="true">{t('tools:calculations.detailedMode')}</button></div>}

      <header className={styles.header}>
        <div>
          <span>{model.category.replaceAll('_', ' ')} · v{model.engineVersion}</span>
          <h1>{model.name}</h1>
          <p>{model.purpose}</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={askMentor}><Bot size={17} /> {t('tools:models.askMentor')}</button>
          <Button variant="primary" onClick={runModel} disabled={running}>
            <Play size={16} /> {running ? t('tools:models.runningCalculating') : t('tools:models.runModel')}
          </Button>
        </div>
      </header>

      <div className={styles.businessContext}>
        <ShieldCheck size={17} />
        {activeWorkspace
          ? <><strong>{activeWorkspace.name}</strong><span>{t('tools:models.contextSavedNote')}</span></>
          : <><strong>{t('tools:models.noBusinessSelected')}</strong><span>{t('tools:models.createOrSelectBusiness')}</span></>}
      </div>
      {sourceDocumentName && (
        <div className={styles.documentNotice}>
          <AlertTriangle size={17} />
          <span><Trans ns="tools" i18nKey="models.documentNotice" values={{ name: sourceDocumentName }} components={[<strong key="name" />]} /></span>
        </div>
      )}

      <nav className={styles.tabs}>
        {TABS.map(item => <button key={item.id} className={tab === item.id ? styles.activeTab : ''} onClick={() => setTab(item.id)}>{t(`tools:${item.labelKey}`)}</button>)}
      </nav>

      {error && <div className={styles.error}><AlertTriangle size={18} />{error}</div>}

      {tab === 'workspace' && (
        <section className={styles.workbench}>
          <aside className={styles.parameterRail}>
            <div className={styles.railHeading}>
              <div><span className={styles.eyebrow}>{t('tools:models.eyebrow.parameters')}</span><h2>{t('tools:models.modelInputsHeading')}</h2></div>
              <span>{model.inputs.length}</span>
            </div>
            {/*
              PAZARYERİ VERİSİNDEN DOLDURMA.

              🔴 Uç (`/marketplace/calculation-hints`) ve istemci yöntemi
              yazılmıştı ama HİÇBİR bileşen çağırmıyordu — yani gerçek
              satış fiyatı ve komisyon verisi veritabanında duruyor,
              kullanıcı ise aynı rakamları elle giriyordu.

              ⚠️ Yalnız verinin GERÇEKTEN karşıladığı alanlar
              dolduruluyor. `avgUnitPrice` ürün birim fiyatıdır; onu
              sipariş geliri olarak yazmak farklı bir büyüklüğü aynı
              sayıyla doldurmak olurdu.
            */}
            {ipucu?.available && ipucuAlanlari && (
              <div className={styles.pazaryeriIpucu}>
                <p>
                  <Trans ns="tools" i18nKey="models.hintLead" values={{ sampleSize: ipucu.sampleSize, price: ipucu.avgUnitPrice, currency: ipucu.currency }} components={[<strong key="count" />, <strong key="price" />]} />
                  {ipucu.avgCommissionPercent !== null
                    ? <Trans ns="tools" i18nKey="models.hintCommission" values={{ commissionPercent: ipucu.avgCommissionPercent }} components={[<strong key="commission" />]} />
                    : t('tools:models.hintNoCommission')}
                </p>
                <button type="button" onClick={ipucundanDoldur}>
                  {t('tools:models.fillWithTheseValues')}
                </button>
              </div>
            )}

            <div className={styles.quickInputs}>
              {model.inputs.map(input => (
                <label key={input.key}>
                  <span>{input.label}</span>
                  {input.type === 'number_array'
                    ? <textarea value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder={t('tools:models.arrayPlaceholder')} />
                    : <div><input type="number" step="any" value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder="0" /><small>{input.unit}</small></div>}
                </label>
              ))}
            </div>
            <button type="button" className={styles.detailLink} onClick={() => setTab('inputs')}>{t('tools:models.editSourcesVerification')} <ChevronRight size={15} /></button>
          </aside>

          <div className={styles.modelCanvas}>
            <div className={styles.canvasHeading}>
              <div><span className={styles.eyebrow}>{t('tools:models.eyebrow.modelFlow')}</span><h2>{model.name}</h2></div>
              <span className={latestRun ? styles.currentState : styles.waitingState}>{latestRun ? t('tools:models.stateCurrent') : t('tools:models.stateReady')}</span>
            </div>
            <p className={styles.canvasPurpose}>{model.purpose}</p>
            <div className={styles.flowMap}>
              <div className={styles.flowColumn}>
                {(model.inputs || []).slice(0, 4).map(input => (
                  <article key={input.key}><small>{t('tools:models.inputLabel')}</small><strong>{input.label}</strong><span>{inputs[input.key] === '' || inputs[input.key] === undefined ? t('tools:models.awaitingValue') : `${formatValue(inputs[input.key], t, formatLocale)} ${input.unit || ''}`}</span></article>
                ))}
              </div>
              <div className={styles.flowConnector} aria-hidden="true"><span>→</span><i /></div>
              <div className={styles.flowColumn}>
                {(model.outputs || []).slice(0, 4).map(output => {
                  const value = latestRun?.outputs?.[output.key]
                  return <article key={output.key}><small>{t('tools:models.outputLabel')}</small><strong>{output.label}</strong><span>{value === undefined ? t('tools:models.computedOnRun') : `${formatValue(value, t, formatLocale)} ${output.unit || ''}`}</span></article>
                })}
              </div>
            </div>
            <div className={styles.formulaStrip}><span>{t('tools:models.calculationLogic')}</span><code>{model.formula}</code></div>
          </div>

          <aside className={styles.outputRail}>
            <div className={styles.railHeading}><div><span className={styles.eyebrow}>{t('tools:models.eyebrow.output')}</span><h2>{t('tools:models.lastRunHeading')}</h2></div></div>
            {latestRun ? (
              <>
                <div className={styles.primaryOutput}>
                  <span>{outputDefinitions[latestMetrics[0]?.[0]]?.label || titleFromKey(latestMetrics[0]?.[0] || t('tools:models.fallbackMetric'))}</span>
                  <strong>{formatValue(latestMetrics[0]?.[1], t, formatLocale)}</strong>
                  <small>{outputDefinitions[latestMetrics[0]?.[0]]?.unit || (SCENARIOS.find(item => item.id === latestRun.scenarioName)?.labelKey ? t(`tools:${SCENARIOS.find(item => item.id === latestRun.scenarioName).labelKey}`) : latestRun.scenarioName)}</small>
                </div>
                <div className={styles.outputList}>
                  {latestMetrics.slice(1, 4).map(([key, value]) => <div key={key}><span>{outputDefinitions[key]?.label || titleFromKey(key)}</span><strong>{formatValue(value, t, formatLocale)}</strong></div>)}
                </div>
                <button type="button" className={styles.detailLink} onClick={() => { setCurrentRun(latestRun); setTab('outputs') }}>{t('tools:models.inspectAllOutputs')} <ChevronRight size={15} /></button>
              </>
            ) : <div className={styles.noOutput}><FlaskConical size={28} /><strong>{t('tools:models.noRunsYet')}</strong><span>{t('tools:models.noRunsHint')}</span></div>}
            <div className={styles.runHistory}>
              <h3>{t('tools:models.versionHistory')}</h3>
              {runs.slice(0, 3).map((run, index) => <button type="button" key={run.id} onClick={() => { setCurrentRun(run); setTab('outputs') }}><span>{run.scenarioName || t('tools:models.scenarios.base')} · {index === 0 ? t('tools:models.latestShort') : `${index + 1}.`}</span><small>{new Date(run.createdAt).toLocaleDateString(formatLocale)}</small><ChevronRight size={14} /></button>)}
              {!runs.length && (model.versions || []).slice(0, 3).map(version => <div key={version.id}><span>v{version.version}</span><small>{new Date(version.createdAt).toLocaleDateString(formatLocale)}</small></div>)}
            </div>
          </aside>
        </section>
      )}

      {tab === 'overview' && (
        <section className={styles.twoColumns}>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>{t('tools:models.overview.whatFor')}</span>
            <h2>{model.description}</h2>
            <p>{model.purpose}</p>
            <div className={styles.formula}><small>{t('tools:models.formulaDecisionLogic')}</small><code>{model.formula}</code></div>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>{t('tools:models.overview.workflow')}</span>
            <ol className={styles.flow}>
              {['enterData', 'verifyInputs', 'runDeterministic', 'reviewChecks', 'saveDecisionStep'].map(item => <li key={item}><ChevronRight size={15} />{t(`tools:models.flowSteps.${item}`)}</li>)}
            </ol>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>{t('tools:models.overview.limitations')}</span>
            <ul>{model.limitations.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>{t('tools:models.overview.linkedLearning')}</span>
            {model.linkedCourses?.filter(course => course.published).length
              ? model.linkedCourses.filter(course => course.published).map(course => <button className={styles.courseLink} key={course.id} onClick={() => navigate(`/app/courses/${course.id}/learn`)}>{course.title}<ChevronRight size={16} /></button>)
              : <p>{t('tools:models.coursePackagePending')}</p>}
          </article>
        </section>
      )}

      {tab === 'inputs' && (
        <section className={styles.inputPanel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>INPUTS / SOURCE DATA</span><h2>{t('tools:models.inputsAndVerification')}</h2></div><span>{t('tools:models.requiredFieldsCount', { count: model.inputs.length })}</span></div>
          <div className={styles.inputGrid}>
            {model.inputs.map(input => (
              <article key={input.key} className={styles.inputCard}>
                <label>
                  <strong>{input.label}</strong>
                  <small>{input.description}</small>
                  {input.type === 'number_array'
                    ? <textarea value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder="-100000, 30000, 45000, 60000" />
                    : <div className={styles.numberInput}><input type="number" step="any" value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder="0" /><span>{input.unit}</span></div>}
                </label>
                <div className={styles.sourceFields}>
                  <Select aria-label={t('tools:models.sourceTypeAria')} options={[{ value: 'user', label: t('tools:models.sourceTypes.user') }, { value: 'document', label: t('tools:models.sourceTypes.document') }, { value: 'business_record', label: t('tools:models.sourceTypes.businessRecord') }, { value: 'approved_dataset', label: t('tools:models.sourceTypes.approvedDataset') }, { value: 'market_data', label: t('tools:models.sourceTypes.marketData') }, { value: 'case', label: t('tools:models.sourceTypes.caseStudy') }]} value={metadata[input.key]?.sourceType || 'user'} onChange={v => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], sourceType: v } }))} />
                  <input value={metadata[input.key]?.sourceReference || ''} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], sourceReference: event.target.value } }))} placeholder={t('tools:models.sourceReferencePlaceholder')} />
                  <input type="date" value={metadata[input.key]?.effectiveDate || ''} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], effectiveDate: event.target.value } }))} />
                </div>
                <label className={styles.verify}><input type="checkbox" checked={Boolean(metadata[input.key]?.userVerified)} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], userVerified: event.target.checked } }))} /> {t('tools:models.verifiedCheckbox')}</label>
              </article>
            ))}
          </div>
          <div className={styles.runBar}><span>{t('tools:models.runBarNote')}</span><Button variant="cta" onClick={runModel} disabled={running}><Play size={16} /> {running ? t('tools:models.runningStarting') : t('tools:models.runModel')}</Button></div>
        </section>
      )}

      {tab === 'scenarios' && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MODEL LAB</span><h2>{t('tools:models.scenarioLab')}</h2></div></div>
          <p>{t('tools:models.scenarioLabIntro')}</p>
          <div className={styles.scenarios}>
            {SCENARIOS.map(item => <button key={item.id} className={scenario === item.id ? styles.activeScenario : ''} onClick={() => setScenario(item.id)}><FlaskConical size={18} /><strong>{t(`tools:${item.labelKey}`)}</strong><small>{t('tools:models.recordCount', { count: runs.filter(run => run.scenarioName === item.id).length })}</small></button>)}
          </div>
          <div className={styles.comparison}>
            {runs.slice(0, 5).map(run => (
              <article key={run.id}>
                <span>{SCENARIOS.find(item => item.id === run.scenarioName)?.labelKey ? t(`tools:${SCENARIOS.find(item => item.id === run.scenarioName).labelKey}`) : run.scenarioName}</span>
                <strong>{new Date(run.createdAt).toLocaleString(formatLocale)}</strong>
                <small>{Object.entries(run.outputs || {}).filter(([, value]) => typeof value !== 'object').slice(0, 2).map(([key, value]) => `${titleFromKey(key)}: ${formatValue(value, t, formatLocale)}`).join(' · ')}</small>
              </article>
            ))}
            {!runs.length && <div className={styles.empty}>{t('tools:models.noRunsForComparison')}</div>}
          </div>
          <Button variant="primary" onClick={() => setTab('inputs')}>{t('tools:models.prepareScenarioInputs')}</Button>
        </section>
      )}

      {tab === 'outputs' && (
        currentRun ? (
          <section className={styles.outputDashboard}>
            <div className={styles.outputHeader}>
              <div><span className={styles.eyebrow}>OUTPUT DASHBOARD</span><h2>{t('tools:models.resultTitle', { model: model.name })}</h2><p>{t('tools:models.outputMeta', { scenario: SCENARIOS.find(item => item.id === currentRun.scenarioName)?.labelKey ? t(`tools:${SCENARIOS.find(item => item.id === currentRun.scenarioName).labelKey}`) : currentRun.scenarioName, date: new Date(currentRun.createdAt).toLocaleString(formatLocale) })}</p></div>
              <div className={`${styles.confidenceBadge} ${styles[currentRun.confidence?.label]}`}><strong>{currentRun.confidence?.score}</strong><span>{CONFIDENCE_LABELS[currentRun.confidence?.label] ? t(`tools:${CONFIDENCE_LABELS[currentRun.confidence.label]}`) : currentRun.confidence?.label}</span></div>
            </div>
            <div className={styles.metrics}>
              {Object.entries(currentRun.outputs || {}).filter(([, value]) => typeof value !== 'object').map(([key, value]) => (
                <article key={key}><span>{outputDefinitions[key]?.label || titleFromKey(key)}</span><strong>{formatValue(value, t, formatLocale)}</strong><small>{outputDefinitions[key]?.unit || ''}</small></article>
              ))}
            </div>
            {currentRun.outputs?.sensitivity && (
              <div className={styles.sensitivity}>
                <h3>{t('tools:models.sensitivityView')}</h3>
                <div>{Object.entries(currentRun.outputs.sensitivity).map(([name, values]) => <article key={name}><span>{name}</span>{Object.entries(values).map(([key, value]) => <p key={key}><small>{titleFromKey(key)}</small><strong>{formatValue(value, t, formatLocale)}</strong></p>)}</article>)}</div>
              </div>
            )}
            <div className={styles.outputActions}>
              <button onClick={askMentor}><Bot size={18} /> {t('tools:models.interpretWithMentor')}</button>
              <button onClick={() => setDecisionOpen(true)}><Save size={18} /> {t('tools:models.saveDecision')}</button>
              <button onClick={() => setTab('checks')}><CheckCircle2 size={18} /> {t('tools:models.inspectTrace')}</button>
            </div>
            {decisionSaved && <p className={styles.successMessage}>{t('tools:models.decisionSaved')}</p>}
            {decisionOpen && (
              <div className={styles.decisionBox}>
                <h3>{t('tools:models.decisionPrompt')}</h3>
                <textarea value={decision.decision} onChange={event => setDecision(current => ({ ...current, decision: event.target.value }))} placeholder={t('tools:models.decisionPlaceholder')} />
                <textarea value={decision.expectedOutcome} onChange={event => setDecision(current => ({ ...current, expectedOutcome: event.target.value }))} placeholder={t('tools:models.expectedOutcomePlaceholder')} />
                <div><button onClick={() => setDecisionOpen(false)}>{t('common:buttons.cancel')}</button><Button variant="primary" onClick={saveDecision}>{t('tools:models.saveDecision')}</Button></div>
              </div>
            )}
          </section>
        ) : <div className={styles.empty}><FlaskConical size={42} /><h2>{t('tools:models.noResultYet')}</h2><p>{t('tools:models.noResultHint')}</p><Button variant="primary" onClick={() => setTab('inputs')}>{t('tools:models.goToInputs')}</Button></div>
      )}

      {tab === 'checks' && (
        currentRun ? (
          <section className={styles.checksLayout}>
            <article className={styles.panel}>
              <h2>{t('tools:models.checksHeading')}</h2>
              {[...(currentRun.checks || []), ...(currentRun.ethics || [])].map((check, index) => (
                <div key={`${check.code}-${index}`} className={`${styles.check} ${check.passed ? styles.checkPassed : styles.checkFailed}`}>
                  {check.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span><strong>{check.label}</strong><small>{check.detail}</small></span>
                </div>
              ))}
            </article>
            <article className={styles.panel}>
              <h2>{t('tools:models.traceHeading')}</h2>
              {(currentRun.trace || []).map((step, index) => <div className={styles.trace} key={step.key}><span>{index + 1}</span><div><strong>{step.label}</strong><code>{step.formula}</code><small>{t('tools:models.traceResult', { value: formatValue(step.result, t, formatLocale), rounding: step.rounding })}</small></div></div>)}
            </article>
            <article className={styles.panel}>
              <h2>{t('tools:models.confidenceComponents')}</h2>
              {(currentRun.confidence?.components || []).map(component => <div className={styles.component} key={component.key}><div><strong>{component.label}</strong><span>{component.score}/100</span></div><div><i style={{ width: `${component.score}%` }} /></div><small>{component.reason}</small></div>)}
              <p className={styles.disclaimer}><Info size={16} />{currentRun.confidence?.disclaimer}</p>
            </article>
            <article className={styles.panel}>
              <h2>{t('tools:models.warningsLimitations')}</h2>
              <ul>{[...(currentRun.warnings || []), ...model.limitations].map((item, index) => <li key={index}>{item}</li>)}</ul>
            </article>
          </section>
        ) : <div className={styles.empty}>{t('tools:models.runToSeeChecks')}</div>
      )}

      {tab === 'sources' && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>SOURCES</span><h2>{t('tools:models.sourcesHeading')}</h2></div></div>
          <div className={styles.sources}>{model.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority}</span><strong>{source.title}</strong><p>{source.usage}</p></a>)}</div>
          <p className={styles.disclaimer}><Info size={16} />{t('tools:models.sourcesDisclaimer')}</p>
        </section>
      )}

      {tab === 'changes' && (
        <section className={styles.panel}>
          <h2>{t('tools:models.changelogHeading')}</h2>
          {(model.versions || []).map(version => <div className={styles.version} key={version.id}><History size={18} /><div><strong>v{version.version}</strong><p>{version.changeSummary}</p><small>{new Date(version.createdAt).toLocaleString(formatLocale)}</small></div></div>)}
        </section>
      )}
    </main>
  )
}
