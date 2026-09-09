import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Scale } from 'lucide-react'
import { api } from '@/services/api'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatDate } from '@/utils/formatters'
import styles from './KararRaporu.module.css'

/*
 * KARAR RAPORU — hedeflenen ile gerçekleşeni yan yana koyar.
 *
 * 🔴 NEDEN VAR: veri iki yerde YAZILIYOR ama hiçbir yerde OKUNMUYORDU.
 *
 *   1. Karar aracı takipleri: karar bir göreve bağlanıyor, beklenen
 *      sonuç ve sonradan gerçekleşen sonuç kaydın metadata'sına
 *      yazılıyordu. Tek tek kayıt detayında görünüyordu; karşılaştıran
 *      bir yer yoktu.
 *   2. Finansal model kararları (`DecisionJournalEntry`): beklenen ve
 *      gerçekleşen sonuç veritabanına yazılıyordu ama SUNUCUDA OKUMA
 *      UCU BİLE YOKTU. Kullanıcı kararını giriyor, sonucunu giriyor ve
 *      o veriyi bir daha hiçbir yerde göremiyordu.
 *
 * İkisi tek ekranda: kullanıcı için ikisi de "verdiğim karar". Kaynağın
 * hangi tablo olduğu onun sorunu değil; ayrı iki rapor yapmak aynı
 * soruyu iki yerde sordurmak olurdu.
 *
 * ⚠️ SAPMA HESAPLANMIYOR. Beklenen ve gerçekleşen serbest metin;
 * ikisinin farkını sayısal olarak çıkarmak mümkün değil. Kullanıcı
 * kendi yazdıysa gösteriliyor, yazmadıysa yer boş kalıyor — uydurma
 * bir "%12 sapma" raporu değersizleştirirdi.
 */

/* İki farklı kaynağı tek satır biçimine indirger; ekranın geri kalanı
   kaydın nereden geldiğini bilmek zorunda kalmıyor. */
function takipSatiri(record) {
  const takip = record.metadata?.decisionFollowUp || {}
  return {
    id: 'takip-' + record.id,
    kaynak: 'followUp',
    baslik: takip.decisionTitle || record.title,
    gorev: record.title,
    beklenen: takip.expectedOutcome || null,
    gerceklesen: takip.actualOutcome || null,
    ders: takip.lessonLearned || null,
    sapma: null,
    tarih: record.createdAt,
    degerlendirmeTarihi: takip.reviewedAt || null,
    kayitId: record.id
  }
}

function gunlukSatiri(entry) {
  return {
    id: 'gunluk-' + entry.id,
    kaynak: 'journal',
    baslik: entry.decision,
    gorev: entry.modelRun?.model?.name || null,
    beklenen: entry.expectedOutcome || null,
    gerceklesen: entry.actualOutcome || null,
    ders: entry.lessonLearned || null,
    sapma: entry.variance || null,
    tarih: entry.createdAt,
    degerlendirmeTarihi: entry.reviewedAt || null,
    kayitId: null
  }
}

export default function KararRaporu() {
  const { t } = useTranslation(['workspace', 'common'])
  const { formatLocale } = useLocalization()
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const [takipler, setTakipler] = useState([])
  const [gunluk, setGunluk] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [suzgec, setSuzgec] = useState('hepsi')
  const [analiz, setAnaliz] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      api.workspace.tracker.list(workspaceId, { kararKaynakli: 'true', limit: 100 }),
      /*
       * Karar günlüğü ayrı bir serviste (finansal modeller) duruyor ve
       * o modül hiç kullanılmamış olabilir. Hatası bütün raporu
       * düşürmemeli: karar aracı takipleri yine gösterilmeli.
       */
      api.financialModels.decisionJournal(workspaceId).catch(() => ({ entries: [] })),
      /*
       * Yönetici analizi yalnız sahip/yönetici rollerine açık; diğer
       * roller 403 alıyor. Hata YUTULUYOR ve panel hiç çizilmiyor —
       * "yetkin yok" uyarısı basmak, kullanıcıya erişemeyeceği bir
       * şeyi hatırlatmaktan başka işe yaramaz.
       */
      api.workspace.tracker.analysis(workspaceId).catch(() => null)
    ]).then(([takipVerisi, gunlukVerisi, analizVerisi]) => {
      if (!active) return
      setTakipler(takipVerisi.records || [])
      setGunluk(gunlukVerisi.entries || [])
      setAnaliz(analizVerisi)
    }).catch(err => {
      if (active) setError(err.message || t('workspace:decisionReport.loadError'))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [workspaceId, t])

  const satirlar = useMemo(() => {
    const hepsi = [...takipler.map(takipSatiri), ...gunluk.map(gunlukSatiri)]
    return hepsi.sort((a, b) => new Date(b.tarih) - new Date(a.tarih))
  }, [takipler, gunluk])

  /* Özet SÜZGEÇTEN ÖNCE hesaplanıyor: süzgeç uygulandığında toplam da
     düşseydi "8 karardan 3'ü değerlendirildi" cümlesi yanlış çıkardı. */
  const ozet = useMemo(() => ({
    toplam: satirlar.length,
    degerlendirilen: satirlar.filter(satir => satir.gerceklesen).length,
    bekleyen: satirlar.filter(satir => !satir.gerceklesen).length
  }), [satirlar])

  const gorunen = useMemo(() => {
    if (suzgec === 'bekleyen') return satirlar.filter(satir => !satir.gerceklesen)
    if (suzgec === 'degerlendirilen') return satirlar.filter(satir => satir.gerceklesen)
    return satirlar
  }, [satirlar, suzgec])

  const tarih = value => value ? formatDate(value, { locale: formatLocale, dateStyle: 'medium' }) : '—'

  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h2><Scale size={19} aria-hidden="true" /> {t('workspace:decisionReport.title')}</h2>
          <p>{t('workspace:decisionReport.subtitle')}</p>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.metrics}>
        <span><small>{t('workspace:decisionReport.total')}</small><strong>{loading ? '—' : ozet.toplam}</strong></span>
        <span><small>{t('workspace:decisionReport.reviewed')}</small><strong>{loading ? '—' : ozet.degerlendirilen}</strong></span>
        <span><small>{t('workspace:decisionReport.pending')}</small><strong>{loading ? '—' : ozet.bekleyen}</strong></span>
      </div>

      {/*
        * YÖNETİCİ ANALİZİ.
        *
        * ⚠️ "Karar başarısı" diye bir ORAN YOK ve sunucu da üretmiyor.
        * Beklenen ile gerçekleşen serbest metin; farkını programla
        * ölçmek mümkün değil. Gösterilen şey ölçülebilen: kararın
        * takip edilip edilmediği ve görevin zamanında bitip
        * bitmediği. Başarı hükmünü metinleri okuyan yönetici veriyor;
        * ekranda bunu söyleyen bir not var.
        */}
      {analiz && (
        <section className={styles.analysis}>
          <h3>{t('workspace:decisionReport.analysis.title')}</h3>
          <p className={styles.analysisNote}>{t('workspace:decisionReport.analysis.note')}</p>

          <div className={styles.analysisMetrics}>
            <span><small>{t('workspace:decisionReport.analysis.tracked')}</small><strong>{analiz.kararlar.takipEdilen} / {analiz.kararlar.toplam}</strong></span>
            <span><small>{t('workspace:decisionReport.analysis.unassigned')}</small><strong>{analiz.gorevler.atanmamis}</strong></span>
          </div>

          {analiz.gorevler.kisiler.length === 0
            ? <p className={styles.analysisEmpty}>{t('workspace:decisionReport.analysis.noAssignees')}</p>
            : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t('workspace:decisionReport.analysis.person')}</th>
                    <th scope="col">{t('workspace:decisionReport.analysis.assigned')}</th>
                    <th scope="col">{t('workspace:decisionReport.analysis.completed')}</th>
                    <th scope="col">{t('workspace:decisionReport.analysis.onTime')}</th>
                    <th scope="col">{t('workspace:decisionReport.analysis.overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {analiz.gorevler.kisiler.map(kisi => (
                    <tr key={kisi.userId}>
                      <th scope="row">{kisi.name}</th>
                      <td>{kisi.toplam}</td>
                      <td>{kisi.tamamlanan}</td>
                      <td>{kisi.zamaninda}</td>
                      <td className={kisi.geciken > 0 ? styles.overdue : ''}>{kisi.geciken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>
      )}

      <div className={styles.filters} role="group" aria-label={t('workspace:decisionReport.filterLabel')}>
        {['hepsi', 'bekleyen', 'degerlendirilen'].map(secenek => (
          <button
            key={secenek}
            type="button"
            className={suzgec === secenek ? styles.filterActive : ''}
            aria-pressed={suzgec === secenek}
            onClick={() => setSuzgec(secenek)}
          >
            {t('workspace:decisionReport.filter.' + secenek)}
          </button>
        ))}
      </div>

      {loading ? <p className={styles.state}>{t('workspace:decisionReport.loading')}</p>
        : gorunen.length === 0 ? (
          <p className={styles.state}>
            {satirlar.length === 0
              ? t('workspace:decisionReport.empty')
              : t('workspace:decisionReport.emptyFiltered')}
          </p>
        ) : (
          <div className={styles.list}>
            {gorunen.map(satir => (
              <article key={satir.id} className={styles.card}>
                <div className={styles.cardHead}>
                  <div>
                    <strong>{satir.baslik}</strong>
                    {satir.gorev && satir.gorev !== satir.baslik && <small>{satir.gorev}</small>}
                  </div>
                  <span className={styles.source}>{t('workspace:decisionReport.source.' + satir.kaynak)}</span>
                </div>

                {/*
                  * Hedeflenen ve gerçekleşen YAN YANA. Alt alta iki
                  * paragraf olsaydı karşılaştırma okuyucunun zihninde
                  * kalırdı; raporun bütün işi bu iki metni aynı anda
                  * göstermek.
                  */}
                <div className={styles.compare}>
                  <div>
                    <span>{t('workspace:decisionReport.expected')}</span>
                    <p>{satir.beklenen || '—'}</p>
                  </div>
                  <div className={satir.gerceklesen ? '' : styles.awaiting}>
                    <span>{t('workspace:decisionReport.actual')}</span>
                    <p>{satir.gerceklesen || t('workspace:decisionReport.notYet')}</p>
                  </div>
                </div>

                {/* Kullanıcı yazdıysa gösteriliyor; sapma sunucuda
                    HESAPLANMIYOR (iki metnin farkı sayı değil). */}
                {satir.sapma && (
                  <p className={styles.variance}><span>{t('workspace:decisionReport.variance')}</span> {satir.sapma}</p>
                )}
                {satir.ders && (
                  <p className={styles.lesson}><span>{t('workspace:decisionReport.lesson')}</span> {satir.ders}</p>
                )}

                <footer className={styles.cardFoot}>
                  <small>{t('workspace:decisionReport.decidedAt', { date: tarih(satir.tarih) })}</small>
                  {satir.degerlendirmeTarihi && <small>{t('workspace:decisionReport.reviewedAt', { date: tarih(satir.degerlendirmeTarihi) })}</small>}
                  {/* Kayıt detayı ayrı bir rota DEĞİL, takip listesinin
                      içinde açılan panel; `?record=` onu açıyor. */}
                  {satir.kayitId && (
                    <button type="button" onClick={() => navigate('/app/workspaces/' + workspaceId + '/tracker?record=' + satir.kayitId)}>
                      {t('workspace:decisionReport.openTask')} <ArrowRight size={14} />
                    </button>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
    </section>
  )
}
