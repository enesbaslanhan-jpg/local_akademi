import { useEffect, useState } from 'react'
import { AlertTriangle, FileText, HelpCircle, History, Bell, X } from 'lucide-react'
import { api } from '@/services/api'
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

const turEtiketleri = {
  payment: 'Ödeme', receivable: 'Tahsilat', promissory_note: 'Senet',
  purchase: 'Alım', shipment: 'Sevkiyat', task: 'Görev',
  deferred: 'Ertelenmiş', other: 'Diğer'
}

const durumEtiketleri = {
  open: 'Açık', in_progress: 'Devam ediyor', completed: 'Tamamlandı',
  cancelled: 'İptal', deferred: 'Ertelendi'
}

const yonEtiketleri = {
  payable: 'Ödenecek (borç)',
  receivable: 'Tahsil edilecek (alacak)',
  /* Kısa tutuluyor: ayrıntılı açıklama yukarıdaki uyarı kutusunda;
     aynı cümleyi iki yerde tekrarlamak ekranı şişiriyordu. */
  neutral: 'Belirsiz'
}

function tarih(deger, saatli = false) {
  if (!deger) return '—'
  return new Intl.DateTimeFormat('tr-TR', saatli
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(deger))
}

function para(deger, birim = 'TRY') {
  if (deger === null || deger === undefined) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: birim }).format(Number(deger))
}

/* `analysis` sunucudan METİN olarak geliyor; burada çözülüyor. */
function analiziCoz(ham) {
  if (!ham) return {}
  if (typeof ham === 'object') return ham
  try { return JSON.parse(ham) } catch { return {} }
}

export default function KayitDetay({ workspaceId, recordId, onClose }) {
  const [kayit, setKayit] = useState(null)
  const [hata, setHata] = useState('')
  const [yukleniyor, setYukleniyor] = useState(true)

  useEffect(() => {
    let iptal = false
    setYukleniyor(true)
    setHata('')
    api.workspace.tracker.get(workspaceId, recordId)
      .then(sonuc => { if (!iptal) setKayit(sonuc) })
      .catch(e => { if (!iptal) setHata(e.message || 'Kayıt yüklenemedi') })
      .finally(() => { if (!iptal) setYukleniyor(false) })
    return () => { iptal = true }
  }, [workspaceId, recordId])

  useEffect(() => {
    const tus = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [onClose])

  const belgeler = kayit?.documents || []

  return (
    <div className={styles.ortu} onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Kayıt detayı">
        <header className={styles.baslik}>
          <div>
            <span className={styles.ustEtiket}>İŞLETME KAYDI</span>
            <h2>{kayit?.title || (yukleniyor ? 'Yükleniyor…' : 'Kayıt')}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Kapat"><X size={20} /></button>
        </header>

        <div className={styles.govde}>
          {hata && <div className={styles.hata}>{hata}</div>}
          {yukleniyor && <p className={styles.sessiz}>Kayıt getiriliyor…</p>}

          {kayit && (
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
                <div><dt>Tutar</dt><dd className={styles.tutar}>{para(kayit.amount, kayit.currency)}</dd></div>
                <div><dt>Yön</dt><dd>{yonEtiketleri[kayit.direction] || kayit.direction}</dd></div>
                <div><dt>Tür</dt><dd>{turEtiketleri[kayit.type] || kayit.type}</dd></div>
                <div><dt>Durum</dt><dd>{durumEtiketleri[kayit.status] || kayit.status}</dd></div>
                <div><dt>Vade</dt><dd>{tarih(kayit.dueAt)}</dd></div>
                <div><dt>Oluşturma</dt><dd>{tarih(kayit.createdAt)}</dd></div>
                {kayit.contact?.name && <div><dt>Cari</dt><dd>{kayit.contact.name}</dd></div>}
                {kayit.assignedTo?.name && <div><dt>Sorumlu</dt><dd>{kayit.assignedTo.name}</dd></div>}
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
                  <span><strong>Vadesi geçmiş</strong> — {tarih(kayit.dueAt)}. Takvimde o ayda görünür.</span>
                </p>
              )}

              {kayit.direction === 'neutral' && kayit.amount !== null && (
                <p className={styles.uyari}>
                  <HelpCircle size={15} aria-hidden="true" />
                  <span><strong>Yön belirlenemedi</strong> — borç ve alacak toplamlarına dahil edilmiyor.</span>
                </p>
              )}


              {kayit.description && (
                <section className={styles.bolum}>
                  <h3>Açıklama</h3>
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
                  <h3>Dayanak belge</h3>
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
                            <p className={styles.rozet}>e-Fatura olarak okundu — alanlar tahmin edilmedi</p>
                            <dl className={styles.faturaAlanlari}>
                              <div><dt>Fatura no</dt><dd>{fatura.id}</dd></div>
                              <div><dt>Düzenleme</dt><dd>{tarih(fatura.duzenlemeTarihi)}</dd></div>
                              <div><dt>Vade</dt><dd>{fatura.vadeTarihi ? tarih(fatura.vadeTarihi) : 'Faturada yok'}</dd></div>
                              <div><dt>Tutar</dt><dd>{para(fatura.odenecekTutar, fatura.paraBirimi)}</dd></div>
                              <div>
                                <dt>Satıcı</dt>
                                <dd>{fatura.satici?.unvan || '—'}
                                  {fatura.satici?.kimlik && <small> · {fatura.satici.kimlikTuru} {fatura.satici.kimlik}</small>}
                                </dd>
                              </div>
                              <div>
                                <dt>Alıcı</dt>
                                <dd>{fatura.alici?.unvan || '—'}
                                  {fatura.alici?.kimlik && <small> · {fatura.alici.kimlikTuru} {fatura.alici.kimlik}</small>}
                                </dd>
                              </div>
                            </dl>
                          </>
                        ) : (
                          <p className={styles.sessiz}>
                            Bu belge e-Fatura olarak okunamadı; kayıt metinden çıkarılan
                            bilgilere dayanıyor.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </section>
              )}

              {kayit.reminders?.length > 0 && (
                <section className={styles.bolum}>
                  <h3><Bell size={14} aria-hidden="true" /> Hatırlatmalar</h3>
                  <ul className={styles.liste}>
                    {kayit.reminders.slice(0, 2).map(h => (
                      <li key={h.id}>
                        {tarih(h.scheduledAt, true)}
                        <span className={styles.durumEtiketi}>{h.status === 'sent' ? 'gönderildi' : h.status === 'pending' ? 'bekliyor' : h.status}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {kayit.history?.length > 0 && (
                <section className={styles.bolum}>
                  <h3><History size={14} aria-hidden="true" /> Geçmiş</h3>
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
