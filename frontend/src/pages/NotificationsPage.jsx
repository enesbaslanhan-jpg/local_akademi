import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, MessageCircle, MessagesSquare, Quote, UserPlus } from 'lucide-react'
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
 */

const TURLER = {
  follow: { ikon: UserPlus, metin: 'seni takip etmeye başladı' },
  like: { ikon: Heart, metin: 'paylaşımını beğendi' },
  reply: { ikon: MessageCircle, metin: 'paylaşımına yanıt yazdı' },
  quote: { ikon: Quote, metin: 'paylaşımını alıntıladı' },
  message: { ikon: MessagesSquare, metin: 'sana mesaj gönderdi' },
  thread_invite: { ikon: MessagesSquare, metin: 'seni bir gruba davet etti' },
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    try {
      const sonuc = await api.community.bildirimler()
      setItems(sonuc.items || [])
      setUnread(sonuc.unread || 0)
      /* Ust bardaki rozet bu olayla haberdar oluyor; yoksa okunmus
         bildirimleri gostermeye devam ediyordu. */
      window.dispatchEvent(new CustomEvent('lk:bildirim-degisti'))
    } catch (yuklemeHatasi) {
      setHata(yuklemeHatasi.message || 'Bildirimler yüklenemedi.')
    } finally {
      setYukleniyor(false)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  async function hepsiniOkundu() {
    try {
      await api.community.bildirimleriOkundu()
      /* Yeniden yüklüyorum: okunma zamanı sunucuda yazılıyor ve
         listedeki her satırın `readAt` alanı da güncellenmeli. */
      await yukle()
    } catch (okumaHatasi) {
      setHata(okumaHatasi.message || 'İşlem tamamlanamadı.')
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

  return (
    <main className={`${styles.page} ${styles.communityPage}`}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.kicker}>TOPLULUK</span>
          <h1>Bildirimler</h1>
          <p>Takipler, beğeniler, yanıtlar ve mesajlar.</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" onClick={hepsiniOkundu}>Tümünü okundu işaretle</Button>
        )}
      </header>

      {hata && <div className={styles.error}>{hata}</div>}

      <section className={styles.feed} aria-live="polite">
        {yukleniyor && <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div>}

        {!yukleniyor && items.length === 0 && (
          <div className={styles.empty}>
            <Bell size={34} aria-hidden="true" />
            <p>Henüz bildirim yok. Biri seni takip edince ya da paylaşımına yanıt yazınca burada görünecek.</p>
          </div>
        )}

        <div className={styles.bildirimListesi}>
          {items.map(bildirim => {
            const tur = TURLER[bildirim.type] || { ikon: Bell, metin: 'bir işlem yaptı' }
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
                  <strong>{bildirim.actor?.name || 'Bir üye'}</strong> {tur.metin}
                  {bildirim.post?.ozet && <small>{bildirim.post.ozet}</small>}
                </span>
                <time>{timeAgo(bildirim.createdAt)}</time>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
