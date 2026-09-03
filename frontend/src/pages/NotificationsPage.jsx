import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Bell, CreditCard, Heart, MessageCircle,
  MessagesSquare, Quote, UserPlus,
} from 'lucide-react'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import { initials, timeAgo } from './CommunityPage'
import styles from './CommunityPage.module.css'

/*
 * BİLDİRİMLER.
 *
 * Bu sayfa olmadan sosyal katman GÖRÜNMEZDİ: kimse takip edildiğini,
 * mesaj geldiğini ya da gönderisine yanıt yazıldığını öğrenmiyordu.
 *
 * Sunucu kimliği JETONDAN okuyor, adresten değil — adresten alınsaydı
 * bir kullanıcı diğerinin bildirimlerini, yani kimin kime yazdığını
 * görürdü.
 *
 * 🔴 İKİ KAYNAK var ve ayrı bölümler hâlinde çiziliyor:
 *   1. HESAP (üyelik, ödeme) — üstte, çünkü para ve süre ile ilgili
 *   2. TOPLULUK (takip, yanıt, beğeni)
 * Tek listede karıştırmak, "üyeliğin doluyor" uyarısını beğeni
 * bildirimlerinin arasında kaybederdi.
 */

const TURLER = {
  follow: { ikon: UserPlus, metinKey: 'notifications.types.follow' },
  like: { ikon: Heart, metinKey: 'notifications.types.like' },
  reply: { ikon: MessageCircle, metinKey: 'notifications.types.reply' },
  quote: { ikon: Quote, metinKey: 'notifications.types.quote' },
  message: { ikon: MessagesSquare, metinKey: 'notifications.types.message' },
  thread_invite: { ikon: MessagesSquare, metinKey: 'notifications.types.threadInvite' },
}

/* Hesap bildirimi ikonları. Uyarı tonundakiler ayrı ikon alıyor;
   hepsine kart ikonu koymak "ödeme başarısız" ile "ödeme alındı"yı
   görsel olarak eşitlerdi. */
const HESAP_IKONLARI = {
  trial_ending: AlertTriangle,
  trial_ended: AlertTriangle,
  payment_failed: AlertTriangle,
  payment_succeeded: CreditCard,
  renewal_upcoming: CreditCard,
  membership_cancelled: CreditCard,
}

export default function NotificationsPage() {
  const { t } = useTranslation('community')
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [hesapItems, setHesapItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    try {
      /* `allSettled`: hesap bildirimleri düşerse topluluk yine
         görünsün. Biri yüzünden ikisini birden kaybetmek, sayfayı
         gereksizce kırılgan yapardı. */
      const [topluluk, hesap] = await Promise.allSettled([
        api.community.bildirimler(),
        api.hesap.bildirimler(),
      ])

      if (topluluk.status === 'rejected' && hesap.status === 'rejected') {
        throw topluluk.reason
      }

      const toplulukSonuc = topluluk.status === 'fulfilled' ? topluluk.value : { items: [], unread: 0 }
      const hesapSonuc = hesap.status === 'fulfilled' ? hesap.value : { items: [], unread: 0 }

      setItems(toplulukSonuc.items || [])
      setHesapItems(hesapSonuc.items || [])
      setUnread((toplulukSonuc.unread || 0) + (hesapSonuc.unread || 0))
      /* Ust bardaki rozet bu olayla haberdar oluyor; yoksa okunmus
         bildirimleri gostermeye devam ediyordu. */
      window.dispatchEvent(new CustomEvent('lk:bildirim-degisti'))
    } catch (yuklemeHatasi) {
      setHata(yuklemeHatasi.message || t('notifications.loadFailed'))
    } finally {
      setYukleniyor(false)
    }
  }, [t])

  useEffect(() => { yukle() }, [yukle])

  async function hepsiniOkundu() {
    try {
      /* İkisi birden: düğme "tümünü okundu işaretle" diyor. Yalnız
         topluluğu işaretlemek, sayacın sıfırlanmamasına ve düğmenin
         çalışmıyor görünmesine yol açardı. */
      await Promise.all([
        api.community.bildirimleriOkundu(),
        api.hesap.bildirimleriOkundu(),
      ])
      /* Yeniden yüklüyorum: okunma zamanı sunucuda yazılıyor ve
         listedeki her satırın `readAt` alanı da güncellenmeli. */
      await yukle()
    } catch (okumaHatasi) {
      setHata(okumaHatasi.message || t('notifications.actionFailed'))
    }
  }

  /*
   * Bildirime tıklayınca nereye gidilecek.
   *
   * Takip bildiriminde gönderi yok, kişiye gidiliyor; mesajda sohbete;
   * diğerlerinde gönderiye. Hedefi olmayan bir bildirime tıklamak
   * hiçbir şey yapmamalı — kullanıcıyı boş bir sayfaya götürmek,
   * tıklanamaz olmasından kötüdür.
   */
  function git(bildirim) {
    if (bildirim.postId) { navigate(`/app/community/gonderi/${bildirim.postId}`); return }
    if (bildirim.threadId) { navigate('/app/community/sohbetler'); return }
    if (bildirim.actor?.id) navigate(`/app/profil/${bildirim.actor.id}`)
  }

  const bosMu = !yukleniyor && items.length === 0 && hesapItems.length === 0

  return (
    <main className={`${styles.page} ${styles.communityPage}`}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.kicker}>{t('notifications.kicker')}</span>
          <h1>{t('notifications.title')}</h1>
          <p>{t('notifications.subtitle')}</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" onClick={hepsiniOkundu}>{t('notifications.markAllRead')}</Button>
        )}
      </header>

      {hata && <div className={styles.error}>{hata}</div>}

      <section className={styles.feed} aria-live="polite">
        {yukleniyor && <div className={styles.skeleton} aria-label={t('feed.contentLoading')}><span /><span /><span /></div>}

        {bosMu && (
          <div className={styles.empty}>
            <Bell size={34} aria-hidden="true" />
            <p>{t('notifications.empty')}</p>
          </div>
        )}

        {/* ---------- Hesap: üyelik ve ödeme ---------- */}
        {hesapItems.length > 0 && (
          <>
            <h2 className={styles.bildirimBolumBaslik}>{t('notifications.accountSection')}</h2>
            <div className={`${styles.bildirimListesi} ${styles.bildirimListesiHesap}`}>
              {hesapItems.map(bildirim => {
                const Ikon = HESAP_IKONLARI[bildirim.type] || Bell
                return (
                  <button
                    key={bildirim.id}
                    type="button"
                    className={bildirim.readAt ? undefined : styles.bildirimOkunmamis}
                    onClick={() => bildirim.linkTo && navigate(bildirim.linkTo)}
                  >
                    <span className={styles.bildirimIkon}><Ikon size={15} aria-hidden="true" /></span>
                    <span className={styles.bildirimGovde}>
                      {/* ⚠️ Başlık ve gövde SUNUCUDAN geliyor ve Türkçe.
                          `BusinessNotification` ve e-posta şablonları da
                          böyle; üçünü birden i18n'e taşımak ayrı bir iş.
                          Burada anahtar üretip çevirmek, diğer iki kanalın
                          Türkçe kalmasıyla tutarsızlık yaratırdı. */}
                      <strong>{bildirim.title}</strong>
                      <small>{bildirim.body}</small>
                    </span>
                    <time>{timeAgo(bildirim.createdAt, t)}</time>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ---------- Topluluk ---------- */}
        {items.length > 0 && (
          <>
            {hesapItems.length > 0 && (
              <h2 className={styles.bildirimBolumBaslik}>{t('notifications.communitySection')}</h2>
            )}
            <div className={styles.bildirimListesi}>
              {items.map(bildirim => {
                const tur = TURLER[bildirim.type] || { ikon: Bell, metinKey: 'notifications.types.default' }
                return (
                  <button
                    key={bildirim.id}
                    type="button"
                    /* Okunmamış olanlar yalnız renkle değil, sol kenardaki
                       şeritle de ayrılıyor — renk körü kullanıcı için renk
                       tek başına yetmez. */
                    className={bildirim.readAt ? undefined : styles.bildirimOkunmamis}
                    onClick={() => git(bildirim)}
                  >
                    <span className={styles.bildirimIkon}><tur.ikon size={15} aria-hidden="true" /></span>
                    <span className={styles.authorAvatar}>
                      {bildirim.actor?.avatarUrl
                        ? <img src={bildirim.actor.avatarUrl} alt="" />
                        : initials(bildirim.actor?.name)}
                    </span>
                    <span className={styles.bildirimGovde}>
                      <strong>{bildirim.actor?.name || t('notifications.defaultMember')}</strong> {t(tur.metinKey)}
                      {bildirim.post?.ozet && <small>{bildirim.post.ozet}</small>}
                    </span>
                    <time>{timeAgo(bildirim.createdAt, t)}</time>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
