import { useEffect, useMemo, useState } from 'react'
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

const TABS = ['Çalışma Alanı', 'Girdiler', 'Senaryolar', 'Çıktılar', 'Kontroller', 'Kaynaklar', 'Değişiklikler']
const SCENARIOS = [
  { id: 'base', label: 'Baz' },
  { id: 'optimistic', label: 'İyimser' },
  { id: 'adverse', label: 'Olumsuz' },
  { id: 'stress', label: 'Stres' },
  { id: 'custom', label: 'Özel' },
]
const CONFIDENCE_LABELS = { low: 'Düşük veri güveni', medium: 'Orta veri güveni', high: 'Yüksek veri güveni' }

function formatValue(value) {
  if (value === null || value === undefined) return 'Hesaplanmadı'
  if (typeof value === 'number') return value.toLocaleString('tr-TR', { maximumFractionDigits: 4 })
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  return String(value)
}

function titleFromKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase())
}

export default function FinancialModelWorkspace() {
  const { modelCode } = useParams()
  const [searchParams] = useSearchParams()
  const sourceDocumentId = searchParams.get('documentId') || ''
  const navigate = useNavigate()
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const [model, setModel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Çalışma Alanı')
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
          sourceReference: `${ipucu.source || 'Pazaryeri'} — son 90 gün, ${ipucu.sampleSize} satış`,
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
    }).catch(err => setError(err.message || 'Model yüklenemedi.')).finally(() => setLoading(false))
  }, [modelCode, activeWorkspaceId, sourceDocumentId])

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
      setTab('Çıktılar')
    } catch (err) {
      setError(err.message || 'Model çalıştırılamadı.')
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
      setError(err.message || 'Karar kaydedilemedi.')
    }
  }

  function askMentor() {
    const prompt = currentRun
      ? `${model.name} model çalışmamı açıkla. Çalışma kimliği: ${currentRun.id}. Sonuçların risklerini, sınırlamalarını ve sonraki işletme adımını belirt.`
      : `${model.name} modelini işletmem için ne zaman kullanmalıyım ve hangi verileri hazırlamalıyım?`
    navigate(`/app/mentor?prompt=${encodeURIComponent(prompt)}`)
  }

  if (loading) return <Loading text="Model çalışma alanı yükleniyor..." />
  if (!model) return <div className={styles.errorPage}>{error || 'Model bulunamadı.'}</div>

  return (
    <main className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/app/calculations')}><ArrowLeft size={17} /> Hesaplamalar</button>

      {calculation?.simple && <div className={styles.modeSwitch} role="tablist" aria-label="Hesaplama modu"><button type="button" role="tab" aria-selected="false" onClick={() => navigate(`/app/calculations?tool=${calculation.simple.formulaId}`)}>Basit</button><button type="button" role="tab" aria-selected="true">Detaylı</button></div>}

      <header className={styles.header}>
        <div>
          <span>{model.category.replaceAll('_', ' ')} · v{model.engineVersion}</span>
          <h1>{model.name}</h1>
          <p>{model.purpose}</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={askMentor}><Bot size={17} /> Mentora sor</button>
          <Button variant="primary" onClick={runModel} disabled={running}>
            <Play size={16} /> {running ? 'Hesaplanıyor...' : 'Modeli çalıştır'}
          </Button>
        </div>
      </header>

      <div className={styles.businessContext}>
        <ShieldCheck size={17} />
        {activeWorkspace
          ? <><strong>{activeWorkspace.name}</strong><span>Sonuç bu işletmenin yetki alanına kaydedilir.</span></>
          : <><strong>İşletme seçilmedi</strong><span>Modeli çalıştırmak için işletme oluşturun veya seçin.</span></>}
      </div>
      {sourceDocumentName && (
        <div className={styles.documentNotice}>
          <AlertTriangle size={17} />
          <span><strong>{sourceDocumentName}</strong> belgesinden eşleşen alanlar forma taşındı. Her alanı belgeyle karşılaştırıp “kontrol ettim” kutusunu işaretlemeden çalıştırmayın.</span>
        </div>
      )}

      <nav className={styles.tabs}>
        {TABS.map(item => <button key={item} className={tab === item ? styles.activeTab : ''} onClick={() => setTab(item)}>{item}</button>)}
      </nav>

      {error && <div className={styles.error}><AlertTriangle size={18} />{error}</div>}

      {tab === 'Çalışma Alanı' && (
        <section className={styles.workbench}>
          <aside className={styles.parameterRail}>
            <div className={styles.railHeading}>
              <div><span className={styles.eyebrow}>PARAMETRELER</span><h2>Model girdileri</h2></div>
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
                  Son 90 günde <strong>{ipucu.sampleSize}</strong> pazaryeri satışından:
                  ortalama fiyat <strong>{ipucu.avgUnitPrice} {ipucu.currency}</strong>
                  {ipucu.avgCommissionPercent !== null
                    ? <> · ortalama komisyon <strong>%{ipucu.avgCommissionPercent}</strong></>
                    : <> · komisyon oranı bu bağlantıda sağlanmadı</>}
                </p>
                <button type="button" onClick={ipucundanDoldur}>
                  Bu değerlerle doldur
                </button>
              </div>
            )}

            <div className={styles.quickInputs}>
              {model.inputs.map(input => (
                <label key={input.key}>
                  <span>{input.label}</span>
                  {input.type === 'number_array'
                    ? <textarea value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder="Değerleri virgülle ayırın" />
                    : <div><input type="number" step="any" value={inputs[input.key] || ''} onChange={event => setInputs(current => ({ ...current, [input.key]: event.target.value }))} placeholder="0" /><small>{input.unit}</small></div>}
                </label>
              ))}
            </div>
            <button type="button" className={styles.detailLink} onClick={() => setTab('Girdiler')}>Kaynak ve doğrulamaları düzenle <ChevronRight size={15} /></button>
          </aside>

          <div className={styles.modelCanvas}>
            <div className={styles.canvasHeading}>
              <div><span className={styles.eyebrow}>MODEL AKIŞI</span><h2>{model.name}</h2></div>
              <span className={latestRun ? styles.currentState : styles.waitingState}>{latestRun ? 'Güncel' : 'Hazır'}</span>
            </div>
            <p className={styles.canvasPurpose}>{model.purpose}</p>
            <div className={styles.flowMap}>
              <div className={styles.flowColumn}>
                {(model.inputs || []).slice(0, 4).map(input => (
                  <article key={input.key}><small>Girdi</small><strong>{input.label}</strong><span>{inputs[input.key] === '' || inputs[input.key] === undefined ? 'Değer bekleniyor' : `${formatValue(inputs[input.key])} ${input.unit || ''}`}</span></article>
                ))}
              </div>
              <div className={styles.flowConnector} aria-hidden="true"><span>→</span><i /></div>
              <div className={styles.flowColumn}>
                {(model.outputs || []).slice(0, 4).map(output => {
                  const value = latestRun?.outputs?.[output.key]
                  return <article key={output.key}><small>Çıktı</small><strong>{output.label}</strong><span>{value === undefined ? 'Model çalışınca hesaplanır' : `${formatValue(value)} ${output.unit || ''}`}</span></article>
                })}
              </div>
            </div>
            <div className={styles.formulaStrip}><span>Hesap mantığı</span><code>{model.formula}</code></div>
          </div>

          <aside className={styles.outputRail}>
            <div className={styles.railHeading}><div><span className={styles.eyebrow}>ÇIKTI</span><h2>Son çalışma</h2></div></div>
            {latestRun ? (
              <>
                <div className={styles.primaryOutput}>
                  <span>{outputDefinitions[latestMetrics[0]?.[0]]?.label || titleFromKey(latestMetrics[0]?.[0] || 'sonuç')}</span>
                  <strong>{formatValue(latestMetrics[0]?.[1])}</strong>
                  <small>{outputDefinitions[latestMetrics[0]?.[0]]?.unit || SCENARIOS.find(item => item.id === latestRun.scenarioName)?.label || latestRun.scenarioName}</small>
                </div>
                <div className={styles.outputList}>
                  {latestMetrics.slice(1, 4).map(([key, value]) => <div key={key}><span>{outputDefinitions[key]?.label || titleFromKey(key)}</span><strong>{formatValue(value)}</strong></div>)}
                </div>
                <button type="button" className={styles.detailLink} onClick={() => { setCurrentRun(latestRun); setTab('Çıktılar') }}>Tüm çıktıları incele <ChevronRight size={15} /></button>
              </>
            ) : <div className={styles.noOutput}><FlaskConical size={28} /><strong>Henüz çalışma yok</strong><span>Parametreleri girip modeli çalıştırın.</span></div>}
            <div className={styles.runHistory}>
              <h3>Sürüm geçmişi</h3>
              {runs.slice(0, 3).map((run, index) => <button type="button" key={run.id} onClick={() => { setCurrentRun(run); setTab('Çıktılar') }}><span>{run.scenarioName || 'Baz'} · {index === 0 ? 'son' : `${index + 1}.`}</span><small>{new Date(run.createdAt).toLocaleDateString('tr-TR')}</small><ChevronRight size={14} /></button>)}
              {!runs.length && (model.versions || []).slice(0, 3).map(version => <div key={version.id}><span>v{version.version}</span><small>{new Date(version.createdAt).toLocaleDateString('tr-TR')}</small></div>)}
            </div>
          </aside>
        </section>
      )}

      {tab === 'Genel Bakış' && (
        <section className={styles.twoColumns}>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>NE İÇİN KULLANILIR?</span>
            <h2>{model.description}</h2>
            <p>{model.purpose}</p>
            <div className={styles.formula}><small>Formül / karar mantığı</small><code>{model.formula}</code></div>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>ÇALIŞMA AKIŞI</span>
            <ol className={styles.flow}>
              {['Veriyi gir ve kaynağını belirt', 'Girdileri kullanıcı olarak doğrula', 'Deterministik hesabı çalıştır', 'Kontrol ve güven bileşenlerini incele', 'Kararı kaydet ve sonucu daha sonra karşılaştır'].map(item => <li key={item}><ChevronRight size={15} />{item}</li>)}
            </ol>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>YORUM SINIRLARI</span>
            <ul>{model.limitations.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.panel}>
            <span className={styles.eyebrow}>BAĞLANTILI ÖĞRENME</span>
            {model.linkedCourses?.filter(course => course.published).length
              ? model.linkedCourses.filter(course => course.published).map(course => <button className={styles.courseLink} key={course.id} onClick={() => navigate(`/app/courses/${course.id}/learn`)}>{course.title}<ChevronRight size={16} /></button>)
              : <p>Bu modelin Phase 6 uygulamalı kurs paketi hazırlanıyor.</p>}
          </article>
        </section>
      )}

      {tab === 'Girdiler' && (
        <section className={styles.inputPanel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>INPUTS / SOURCE DATA</span><h2>Girdiler ve doğrulama</h2></div><span>{model.inputs.length} zorunlu alan</span></div>
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
                  <Select aria-label="Kaynak türü" options={[{ value: 'user', label: 'Kullanıcı girişi' }, { value: 'document', label: 'Belge' }, { value: 'business_record', label: 'İşletme kaydı' }, { value: 'approved_dataset', label: 'Onaylı veri seti' }, { value: 'market_data', label: 'Doğrulanmış piyasa verisi' }, { value: 'case', label: 'Eğitim vakası' }]} value={metadata[input.key]?.sourceType || 'user'} onChange={v => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], sourceType: v } }))} />
                  <input value={metadata[input.key]?.sourceReference || ''} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], sourceReference: event.target.value } }))} placeholder="Kaynak / belge adı" />
                  <input type="date" value={metadata[input.key]?.effectiveDate || ''} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], effectiveDate: event.target.value } }))} />
                </div>
                <label className={styles.verify}><input type="checkbox" checked={Boolean(metadata[input.key]?.userVerified)} onChange={event => setMetadata(current => ({ ...current, [input.key]: { ...current[input.key], userVerified: event.target.checked } }))} /> Bu girdiyi kaynağıyla kontrol ettim</label>
              </article>
            ))}
          </div>
          <div className={styles.runBar}><span>Hesaplama yalnız girdi ve varsayımlarınızdan üretilir.</span><Button variant="cta" onClick={runModel} disabled={running}><Play size={16} /> {running ? 'Çalıştırılıyor...' : 'Modeli çalıştır'}</Button></div>
        </section>
      )}

      {tab === 'Senaryolar' && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MODEL LAB</span><h2>Senaryo laboratuvarı</h2></div></div>
          <p>Aynı modelin farklı varsayımlarını ayrı çalışma olarak kaydedin. Her senaryo kendi hesap izi ve güven bileşenlerini korur.</p>
          <div className={styles.scenarios}>
            {SCENARIOS.map(item => <button key={item.id} className={scenario === item.id ? styles.activeScenario : ''} onClick={() => setScenario(item.id)}><FlaskConical size={18} /><strong>{item.label}</strong><small>{runs.filter(run => run.scenarioName === item.id).length} kayıt</small></button>)}
          </div>
          <div className={styles.comparison}>
            {runs.slice(0, 5).map(run => (
              <article key={run.id}>
                <span>{SCENARIOS.find(item => item.id === run.scenarioName)?.label || run.scenarioName}</span>
                <strong>{new Date(run.createdAt).toLocaleString('tr-TR')}</strong>
                <small>{Object.entries(run.outputs || {}).filter(([, value]) => typeof value !== 'object').slice(0, 2).map(([key, value]) => `${titleFromKey(key)}: ${formatValue(value)}`).join(' · ')}</small>
              </article>
            ))}
            {!runs.length && <div className={styles.empty}>Karşılaştırma için henüz çalışma yok.</div>}
          </div>
          <Button variant="primary" onClick={() => setTab('Girdiler')}>Seçili senaryo girdilerini hazırla</Button>
        </section>
      )}

      {tab === 'Çıktılar' && (
        currentRun ? (
          <section className={styles.outputDashboard}>
            <div className={styles.outputHeader}>
              <div><span className={styles.eyebrow}>OUTPUT DASHBOARD</span><h2>{model.name} sonucu</h2><p>{SCENARIOS.find(item => item.id === currentRun.scenarioName)?.label || currentRun.scenarioName} senaryo · {new Date(currentRun.createdAt).toLocaleString('tr-TR')}</p></div>
              <div className={`${styles.confidenceBadge} ${styles[currentRun.confidence?.label]}`}><strong>{currentRun.confidence?.score}</strong><span>{CONFIDENCE_LABELS[currentRun.confidence?.label]}</span></div>
            </div>
            <div className={styles.metrics}>
              {Object.entries(currentRun.outputs || {}).filter(([, value]) => typeof value !== 'object').map(([key, value]) => (
                <article key={key}><span>{outputDefinitions[key]?.label || titleFromKey(key)}</span><strong>{formatValue(value)}</strong><small>{outputDefinitions[key]?.unit || ''}</small></article>
              ))}
            </div>
            {currentRun.outputs?.sensitivity && (
              <div className={styles.sensitivity}>
                <h3>Hassasiyet görünümü</h3>
                <div>{Object.entries(currentRun.outputs.sensitivity).map(([name, values]) => <article key={name}><span>{name}</span>{Object.entries(values).map(([key, value]) => <p key={key}><small>{titleFromKey(key)}</small><strong>{formatValue(value)}</strong></p>)}</article>)}</div>
              </div>
            )}
            <div className={styles.outputActions}>
              <button onClick={askMentor}><Bot size={18} /> AI Mentor ile yorumla</button>
              <button onClick={() => setDecisionOpen(true)}><Save size={18} /> Kararı kaydet</button>
              <button onClick={() => setTab('Kontroller')}><CheckCircle2 size={18} /> Hesap izini incele</button>
            </div>
            {decisionSaved && <p className={styles.successMessage}>Karar günlüğüne kaydedildi.</p>}
            {decisionOpen && (
              <div className={styles.decisionBox}>
                <h3>Bu sonuçtan sonra hangi kararı alıyorsunuz?</h3>
                <textarea value={decision.decision} onChange={event => setDecision(current => ({ ...current, decision: event.target.value }))} placeholder="Alınan karar..." />
                <textarea value={decision.expectedOutcome} onChange={event => setDecision(current => ({ ...current, expectedOutcome: event.target.value }))} placeholder="Beklenen ölçülebilir sonuç..." />
                <div><button onClick={() => setDecisionOpen(false)}>Vazgeç</button><Button variant="primary" onClick={saveDecision}>Kararı kaydet</Button></div>
              </div>
            )}
          </section>
        ) : <div className={styles.empty}><FlaskConical size={42} /><h2>Henüz sonuç yok</h2><p>Girdileri hazırlayıp modeli çalıştırın.</p><Button variant="primary" onClick={() => setTab('Girdiler')}>Girdilere git</Button></div>
      )}

      {tab === 'Kontroller' && (
        currentRun ? (
          <section className={styles.checksLayout}>
            <article className={styles.panel}>
              <h2>Doğrulama ve etik kontrolleri</h2>
              {[...(currentRun.checks || []), ...(currentRun.ethics || [])].map((check, index) => (
                <div key={`${check.code}-${index}`} className={`${styles.check} ${check.passed ? styles.checkPassed : styles.checkFailed}`}>
                  {check.passed ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  <span><strong>{check.label}</strong><small>{check.detail}</small></span>
                </div>
              ))}
            </article>
            <article className={styles.panel}>
              <h2>Hesap izi</h2>
              {(currentRun.trace || []).map((step, index) => <div className={styles.trace} key={step.key}><span>{index + 1}</span><div><strong>{step.label}</strong><code>{step.formula}</code><small>Sonuç: {formatValue(step.result)} · {step.rounding}</small></div></div>)}
            </article>
            <article className={styles.panel}>
              <h2>Veri güven bileşenleri</h2>
              {(currentRun.confidence?.components || []).map(component => <div className={styles.component} key={component.key}><div><strong>{component.label}</strong><span>{component.score}/100</span></div><div><i style={{ width: `${component.score}%` }} /></div><small>{component.reason}</small></div>)}
              <p className={styles.disclaimer}><Info size={16} />{currentRun.confidence?.disclaimer}</p>
            </article>
            <article className={styles.panel}>
              <h2>Uyarılar ve sınırlamalar</h2>
              <ul>{[...(currentRun.warnings || []), ...model.limitations].map((item, index) => <li key={index}>{item}</li>)}</ul>
            </article>
          </section>
        ) : <div className={styles.empty}>Kontrolleri görmek için modeli çalıştırın.</div>
      )}

      {tab === 'Kaynaklar' && (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>SOURCES</span><h2>Metodolojik kaynaklar</h2></div></div>
          <div className={styles.sources}>{model.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.authority}</span><strong>{source.title}</strong><p>{source.usage}</p></a>)}</div>
          <p className={styles.disclaimer}><Info size={16} />Kaynaklar yöntem içindir. LocalKarar kaynak metinlerini, ücretli şablonları veya telifli soruları kopyalamaz.</p>
        </section>
      )}

      {tab === 'Değişiklikler' && (
        <section className={styles.panel}>
          <h2>Model değişiklik günlüğü</h2>
          {(model.versions || []).map(version => <div className={styles.version} key={version.id}><History size={18} /><div><strong>v{version.version}</strong><p>{version.changeSummary}</p><small>{new Date(version.createdAt).toLocaleString('tr-TR')}</small></div></div>)}
        </section>
      )}
    </main>
  )
}
