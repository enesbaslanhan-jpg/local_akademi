import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, HelpCircle, History, Bell, X, Edit, Trash2, Loader2, Check, X as XIcon } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/context/ToastContext'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useTranslation } from 'react-i18next'
import styles from './KayitDetay.module.css'

/*
 * KAYIT DETAYI.
 *
 * 🔴 NEDEN VAR: takip listesindeki her satırın sonunda bir ok (>)
 * duruyordu ama tıklayınca HİÇBİR ŞEY olmuyordu -- detay görünümü
 * planlanmış, hiç yazılmamıştı. Ürün sahibinin tespiti: "kayıt tamam
 * ama üstüne basınca ne olduğunu göstermiyor".
 *
 * Bu ekranın cevaplaması gereken soru şu: "bu kayıt nereden geldi ve
 * neye dayanıyor?" e-Faturadan gelen bir kayıtta cevap faturanın
 * kendisidir; bu yüzden bağlı belge ve içinden OKUNAN alanlar burada
 * gösteriliyor. Kullanıcı rakama körlemesine güvenmek zorunda kalmıyor.
 */

const typeKeys = {
  payment: 'payment', receivable: 'receivable', promissory_note: 'promissoryNote',
  purchase: 'purchase', shipment: 'shipment', task: 'task', deferred: 'deferred', other: 'other'
}

const statusKeys = {
  open: 'open', in_progress: 'inProgress', completed: 'completed', cancelled: 'cancelled', deferred: 'deferred'
}

const directionKeys = {
  payable: 'payable',
  receivable: 'receivable',
  /* Kısa tutuluyor: ayrıntılı açıklama yukarıdaki uyarı kutusunda;
     aynı cümleyi iki yerde tekrarlamak ekranı şişiriyordu. */
  neutral: 'neutral'
}

/* `analysis` sunucudan METİN olarak geliyor; burada çözülüyor. */
function analiziCoz(ham) {
  if (!ham) return {}
  if (typeof ham === 'object') return ham
  try { return JSON.parse(ham) } catch { return {} }
}

function KayitForm({ kayit, onClose, onSave }) {
  const { t } = useTranslation('workspace')
  const [form, setForm] = useState({
    type: kayit.type,
    title: kayit.title,
    description: kayit.description || '',
    direction: kayit.direction,
    amount: kayit.amount === null ? '' : String(kayit.amount),
    currency: kayit.currency,
    priority: 'normal',
    dueAt: kayit.dueAt ? new Date(kayit.dueAt).toISOString().slice(0, 16) : '',
    recurrenceRule: kayit.recurrenceRule || '',
    status: kayit.status
  })
  const [kaydediyor, setKaydediyor] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setKaydediyor(true)
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description || null,
        direction: form.direction,
        amount: form.amount === '' ? null : Number(form.amount),
        currency: form.currency,
        priority: form.priority,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
        recurrenceRule: form.recurrenceRule || null,
        status: form.status
      }
      await onSave(payload)
      toast.success(t('detail.updated'))
    } catch (error) {
      toast.error(error.message || t('detail.updateFailed'))
    } finally {
      setKaydediyor(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.grid}>
        <label>{t('form.type')}
          <select
            value={form.type}
            onChange={e => setForm(current => ({ ...current, type: e.target.value }))}
            aria-label={t('form.type')}
          >
            {Object.entries(typeKeys).map(([value, key]) => (
              <option key={value} value={value}>{t(`type.${key}`)}</option>
            ))}
          </select>
        </label>
        <label>{t('form.direction')}
          <select
            value={form.direction}
            onChange={e => setForm(current => ({ ...current, direction: e.target.value }))}
            aria-label={t('form.direction')}
          >
            <option value="payable">{t('form.payable')}</option>
            <option value="receivable">{t('form.receivable')}</option>
            <option value="neutral">{t('form.notFinancial')}</option>
          </select>
        </label>
      </div>
      <label>{t('form.title')}
        <input
          required
          maxLength={240}
          value={form.title}
          onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
          placeholder={t('form.titlePlaceholder')}
        />
      </label>
      <label>{t('form.description')}
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setForm(current => ({ ...current, description: e.target.value }))}
        />
      </label>
      <div className={styles.grid}>
        <label>{t('form.amount')}
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setForm(current => ({ ...current, amount: e.target.value }))}
          />
        </label>
        <label>{t('form.dueDate')}
          <input
            type="datetime-local"
            value={form.dueAt}
            onChange={e => setForm(current => ({ ...current, dueAt: e.target.value }))}
          />
        </label>
      </div>
      <div className={styles.grid}>
        <label>{t('form.recurrence')}
          <select
            value={form.recurrenceRule}
            onChange={e => setForm(current => ({ ...current, recurrenceRule: e.target.value }))}
            aria-label={t('form.recurrence')}
          >
            <option value="">{t('form.none')}</option>
            <option value="weekly">{t('form.weekly')}</option>
            <option value="monthly">{t('form.monthly')}</option>
            <option value="quarterly">{t('form.quarterly')}</option>
            <option value="yearly">{t('form.yearly')}</option>
          </select>
        </label>
        <label>{t('form.status')}
          <select
            value={form.status}
            onChange={e => setForm(current => ({ ...current, status: e.target.value }))}
            aria-label={t('form.status')}
          >
            {Object.entries(statusKeys).map(([value, key]) => (
              <option key={value} value={value}>{t(`status.${key}`)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onClose}>{t('common:buttons.cancel')}</button>
        <button type="submit" className={styles.primary} disabled={kaydediyor}>
          {kaydediyor ? <Loader2 size={16} className={styles.spin} /> : t('common:buttons.save')}
        </button>
      </div>
    </form>
  )
}

function SilmeOnay({ onConfirm, onCancel }) {
  const { t } = useTranslation('workspace')
  return (
    <div className={styles.onayKutusu} role="alertdialog" aria-modal="true" aria-labelledby="silmeBaslik">
      <h3 id="silmeBaslik" className={styles.onayBaslik}>{t('detail.deleteTitle')}</h3>
      <p className={styles.onayMetin}>
        {t('detail.deleteConfirm')}
      </p>
      <div className={styles.onayButonlar}>
        <button type="button" className={styles.secondary} onClick={onCancel}>{t('common:buttons.cancel')}</button>
        <button type="button" className={`${styles.primary} ${styles.danger}`} onClick={onConfirm}>
          <Trash2 size={16} /> {t('detail.yesDelete')}
        </button>
      </div>
    </div>
  )
}

export default function KayitDetay({ workspaceId, recordId, onClose }) {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const [kayit, setKayit] = useState(null)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)
  const [duzenlemeModu, setDuzenlemeModu] = useState(false)
  const [silmeOnay, setSilmeOnay] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let iptal = false
    setYukleniyor(true)
    setHata('')
    api.workspace.tracker.get(workspaceId, recordId)
      .then(sonuc => { if (!iptal) setKayit(sonuc) })
      .catch(e => { if (!iptal) setHata(e.message || t('detail.loadError')) })
      .finally(() => { if (!iptal) setYukleniyor(false) })
    return () => { iptal = true }
  }, [workspaceId, recordId, t])

  /* Düzenleme kaydedildikten sonra panelin taze veriye geçmesi için:
     kaydı yeniden GET'ler, yükleme iskeletini tekrar göstermez. */
  const kayitYenile = async () => {
    try {
      setKayit(await api.workspace.tracker.get(workspaceId, recordId))
    } catch (e) {
      setHata(e.message || t('detail.loadError'))
    }
  }

  useEffect(() => {
    const tus = e => { if (e.key === 'Escape') { if (duzenlemeModu) setDuzenlemeModu(false); else if (silmeOnay) setSilmeOnay(false); else onClose?.() } }
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [onClose, duzenlemeModu, silmeOnay])

  const handleGuncelle = async (payload) => {
    await api.workspace.tracker.update(workspaceId, recordId, payload)
    await kayitYenile()
    setDuzenlemeModu(false)
  }

  const handleSil = async () => {
    setSiliniyor(true)
    try {
      await api.workspace.tracker.archive(workspaceId, recordId)
      toast.success(t('detail.deleted'))
      onClose()
    } catch (error) {
      toast.error(error.message || t('detail.deleteFailed'))
    } finally {
      setSiliniyor(false)
    }
  }

  const belgeler = kayit?.documents || []
  const tarih = (deger, saatli = false) => formatDate(deger, { locale: formatLocale, ...(saatli ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) })
  const para = (deger, birim = 'TRY') => formatCurrency(deger, { locale: formatLocale, currency: birim })

  return (
    <div className={styles.ortu} onClick={e => { if (e.target === e.currentTarget) { if (duzenlemeModu) setDuzenlemeModu(false); else if (silmeOnay) setSilmeOnay(false); else onClose?.() } }}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={t('detail.dialogAria')}>
        <header className={styles.baslik}>
          <div>
            <span className={styles.ustEtiket}>{t('detail.recordLabel')}</span>
            <h2>{kayit?.title || (yukleniyor ? t('detail.loading') : t('detail.record'))}</h2>
          </div>
          <div className={styles.baslikActions}>
            {!duzenlemeModu && !silmeOnay && kayit && (
              <>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setDuzenlemeModu(true)}
                  aria-label={t('detail.editRecord')}
                >
                  <Edit size={18} />
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.danger}`}
                  onClick={() => setSilmeOnay(true)}
                  aria-label={t('detail.deleteRecord')}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button type="button" onClick={() => { if (duzenlemeModu) setDuzenlemeModu(false); else if (silmeOnay) setSilmeOnay(false); else onClose?.() }} aria-label={t('common:buttons.close')}><X size={20} /></button>
          </div>
        </header>

        <div className={styles.govde}>
          {hata && <div className={styles.hata}>{hata}</div>}
          {yukleniyor && <p className={styles.sessiz}>{t('detail.fetching')}</p>}

          {duzenlemeModu && kayit && (
            <KayitForm kayit={kayit} onClose={() => setDuzenlemeModu(false)} onSave={handleGuncelle} />
          )}

          {silmeOnay && (
            <SilmeOnay onConfirm={handleSil} onCancel={() => setSilmeOnay(false)} />
          )}

          {!duzenlemeModu && !silmeOnay && kayit && (
            <>
              {/*
                * Geçmiş vade uyarısı. e-Fatura yüklenince kayıt faturanın
                * KENDİ vadesini alıyor; eski bir fatura yüklenirse kayıt
                * geçmişe düşüyor ve takvimde bu ayın sayfasında hiç
                * görünmüyor. Sessiz kalmak yerine burada söyleniyor.
                */}
              {/* OLGULAR ÖNCE: kullanıcı kaydı "ne olduğunu görmek"
                  için açıyor. Uyarılar üstte olduğunda tutar ve vade
                  ekranın dışında kalıyordu. */}
              <dl className={styles.alanlar}>
                <div><dt>{t('detail.field.amount')}</dt><dd className={styles.tutar}>{para(kayit.amount, kayit.currency)}</dd></div>
                <div><dt>{t('detail.field.direction')}</dt><dd>{directionKeys[kayit.direction] ? t(`detail.direction.${directionKeys[kayit.direction]}`) : kayit.direction}</dd></div>
                <div><dt>{t('detail.field.type')}</dt><dd>{typeKeys[kayit.type] ? t(`type.${typeKeys[kayit.type]}`) : kayit.type}</dd></div>
                <div><dt>{t('detail.field.status')}</dt><dd>{statusKeys[kayit.status] ? t(`status.${statusKeys[kayit.status]}`) : kayit.status}</dd></div>
                <div><dt>{t('detail.field.dueDate')}</dt><dd>{tarih(kayit.dueAt)}</dd></div>
                <div><dt>{t('detail.field.created')}</dt><dd>{tarih(kayit.createdAt)}</dd></div>
                {kayit.contact?.name && <div><dt>{t('detail.field.contact')}</dt><dd>{kayit.contact.name}</dd></div>}
                {kayit.assignedTo?.name && <div><dt>{t('detail.field.responsible')}</dt><dd>{kayit.assignedTo.name}</dd></div>}
              </dl>

              {/*
                * Uyarılar TEK SATIR.
                *
                * Önce başlık + paragraf biçimindeydi; ikisi birlikte 183
                * piksel tutuyordu ve panelin üstünü kaplayıp asıl bilgiyi
                * (tutar, vade, dayanak) ekranın dışına itiyordu -- ürün
                * sahibi "kayıt açılınca sığmıyor" dedi.
                *
                * Ayrıntılı açıklama zaten aşağıdaki "Açıklama" bölümünde;
                * burada tekrar edilmiyor.
                */}
              {kayit.overdue && (
                <p className={styles.uyari}>
                  <AlertTriangle size={15} aria-hidden="true" />
                  <span><strong>{t('detail.overdue')}</strong> — {tarih(kayit.dueAt)}. {t('detail.overdueHint')}</span>
                </p>
              )}

              {kayit.direction === 'neutral' && kayit.amount !== null && (
                <p className={styles.uyari}>
                  <HelpCircle size={15} aria-hidden="true" />
                  <span><strong>{t('detail.directionUnknown')}</strong> — {t('detail.directionUnknownHint')}</span>
                </p>
              )}


              {kayit.description && (
                <section className={styles.bolum}>
                  <h3>{t('detail.description')}</h3>
                  <p className={styles.aciklama}>{kayit.description}</p>
                </section>
              )}

              {/*
                * DAYANAK. "Bu rakam nereden geldi" sorusunun cevabı.
                * e-Faturadan gelen kayıtta faturanın kendi alanları
                * gösteriliyor -- kullanıcı rakama körlemesine güvenmek
                * zorunda kalmasın.
                */}
              {belgeler.length > 0 && (
                <section className={styles.bolum}>
                  <h3>{t('detail.sourceDocument')}</h3>
                  {belgeler.map(bag => {
                    const belge = bag.document || {}
                    const fatura = analiziCoz(belge.analysis).eFatura
                    return (
                      <div className={styles.belge} key={bag.id}>
                        <div className={styles.belgeBasligi}>
                          <FileText size={16} aria-hidden="true" />
                          <span>{belge.originalName}</span>
                          <small>{Math.round((belge.sizeBytes || 0) / 1024)} KB</small>
                        </div>

                        {fatura ? (
                          <>
                            <p className={styles.rozet}>{t('detail.invoiceRead')}</p>
                            <dl className={styles.faturaAlanlari}>
                              <div><dt>{t('detail.invoice.number')}</dt><dd>{fatura.id}</dd></div>
                              <div><dt>{t('detail.invoice.issueDate')}</dt><dd>{tarih(fatura.duzenlemeTarihi)}</dd></div>
                              <div><dt>{t('detail.invoice.dueDate')}</dt><dd>{fatura.vadeTarihi ? tarih(fatura.vadeTarihi) : t('detail.invoice.notOnInvoice')}</dd></div>
                              <div><dt>{t('detail.invoice.amount')}</dt><dd>{para(fatura.odenecekTutar, fatura.paraBirimi)}</dd></div>
                              <div>
                                <dt>{t('detail.invoice.seller')}</dt>
                                <dd>{fatura.satici?.unvan || '—'}
                                  {fatura.satici?.kimlik && <small> · {fatura.satici.kimlikTuru} {fatura.satici.kimlik}</small>}
                                </dd>
                              </div>
                              <div>
                                <dt>{t('detail.invoice.buyer')}</dt>
                                <dd>{fatura.alici?.unvan || '—'}
                                  {fatura.alici?.kimlik && <small> · {fatura.alici.kimlikTuru} {fatura.alici.kimlik}</small>}
                                </dd>
                              </div>
                            </dl>
                          </>
                        ) : (
                          <p className={styles.sessiz}>
                            {t('detail.invoiceParseFailed')}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </section>
              )}

              {kayit.reminders?.length > 0 && (
                <section className={styles.bolum}>
                  <h3><Bell size={14} aria-hidden="true" /> {t('detail.reminders')}</h3>
                  <ul className={styles.liste}>
                    {kayit.reminders.slice(0, 2).map(h => (
                      <li key={h.id}>
                        {tarih(h.scheduledAt, true)}
                        <span className={styles.durumEtiketi}>{h.status === 'sent' ? t('detail.reminder.sent') : h.status === 'pending' ? t('detail.reminder.pending') : h.status}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {kayit.history?.length > 0 && (
                <section className={styles.bolum}>
                  <h3><History size={14} aria-hidden="true" /> {t('detail.history')}</h3>
                  <ul className={styles.liste}>
                    {kayit.history.slice(0, 2).map(g => (
                      <li key={g.id}>
                        {tarih(g.createdAt, true)}
                        <span className={styles.durumEtiketi}>{g.action}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
