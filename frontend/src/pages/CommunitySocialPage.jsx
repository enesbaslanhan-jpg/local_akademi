import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Ban, Check, MessageCircle, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { initials } from './CommunityPage'
import styles from './CommunitySocialPage.module.css'
import { getFormatLocale } from '@/utils/formatters'

/*
 * TOPLULUK SOSYAL EKRANLARI — kişiler ve sohbetler.
 *
 * 🔴 `window.prompt` KALDIRILDI.
 *
 * Önceki sürüm sohbet açmak için karşı tarafın TAM ADINI yazdırıp
 * ada göre eşleştiriyordu. Ürün sahibinin tespiti: "uygulamadan
 * bağımsız gibi duruyor". Haklıydı — bir adı yanlış yazmak ya da
 * iki kişinin aynı ada sahip olması akışı çıkmaza sokuyordu.
 *
 * Yerine aranabilir, çoklu seçimli bir kişi seçici geldi.
 */

/* Kişi seçici. Sohbet açarken de gruba eklerken de aynı panel. */
function KisiSecici({ kisiler, secili, onDegis, coklu }) {
  const { t } = useTranslation('community')
  const [arama, setArama] = useState('')

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase(getFormatLocale())
    if (!q) return kisiler
    return kisiler.filter(k => k.name.toLocaleLowerCase(getFormatLocale()).includes(q))
  }, [kisiler, arama])

  function degistir(kisi) {
    if (secili.some(s => s.id === kisi.id)) {
      onDegis(secili.filter(s => s.id !== kisi.id))
      return
    }
    /* Birebir sohbette tek kişi: ikinci seçim öncekini değiştiriyor,
       yoksa kullanıcı "neden grup oldu" diye şaşırırdı. */
    onDegis(coklu ? [...secili, kisi] : [kisi])
  }

  return (
    <div className={styles.secici}>
      <label className={styles.seciciArama}>
        <Search size={16} aria-hidden="true" />
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder={t('people.searchPlaceholder')}
          aria-label={t('people.searchPlaceholder')}
        />
      </label>

      {secili.length > 0 && (
        <div className={styles.secilenler}>
          {secili.map(kisi => (
            <button key={kisi.id} type="button" onClick={() => degistir(kisi)}>
              {kisi.name} <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className={styles.seciciListe} role="listbox" aria-multiselectable={coklu}>
        {suzulmus.length === 0 && <p className={styles.bos}>{t('people.noneFound')}</p>}
        {suzulmus.map(kisi => {
          const isaretli = secili.some(s => s.id === kisi.id)
          return (
            <button
              key={kisi.id}
              type="button"
              role="option"
              aria-selected={isaretli}
              className={isaretli ? styles.seciliSatir : undefined}
              onClick={() => degistir(kisi)}
            >
              <span className={styles.kucukAvatar}>{initials(kisi.name)}</span>
              <span>{kisi.name}</span>
              {isaretli && <Check size={15} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CommunitySocialPage({ mode }) {
  const { t } = useTranslation('community')
  const { user } = useAuth()
  const navigate = useNavigate()

  const [kisiler, setKisiler] = useState([])
  const [takipEdilen, setTakipEdilen] = useState([])
  const [engellenen, setEngellenen] = useState([])
  const [threads, setThreads] = useState([])
  const [aktif, setAktif] = useState(null)
  const [mesajlar, setMesajlar] = useState([])
  const [govde, setGovde] = useState('')
  const [hata, setHata] = useState('')
  const [arama, setArama] = useState('')

  /* Yeni sohbet paneli: null = kapalı, {grup:boolean} = açık. */
  const [yeniSohbet, setYeniSohbet] = useState(null)
  const [secilenler, setSecilenler] = useState([])
  const [grupAdi, setGrupAdi] = useState('')

  const kisileriYukle = useCallback(async (q = '') => {
    const sonuc = await api.community.people(q)
    setKisiler(sonuc.people || [])
    setTakipEdilen(sonuc.followingIds || [])
    setEngellenen(sonuc.blockedIds || [])
  }, [])

  const sohbetleriYukle = useCallback(async () => {
    const sonuc = await api.community.threads()
    setThreads(sonuc.threads || [])
  }, [])

  useEffect(() => {
    (mode === 'people' ? kisileriYukle() : sohbetleriYukle()).catch(e => setHata(e.message))
  }, [mode, kisileriYukle, sohbetleriYukle])

  useEffect(() => {
    if (!aktif) return
    api.community.messages(aktif.id)
      .then(r => setMesajlar(r.messages || []))
      .catch(e => {
        /* Kabul edilmemiş grup daveti: mesajlar bilerek kapalı. */
        setMesajlar([])
        setHata(e.message || t('people.chat.messagesLoadFailed'))
      })
  }, [aktif])

  async function iliskiDegistir(kisi, tur) {
    const liste = tur === 'follow' ? takipEdilen : engellenen
    const acikMi = !liste.includes(kisi.id)
    try {
      await (tur === 'follow' ? api.community.follow(kisi.id, acikMi) : api.community.block(kisi.id, acikMi))
      await kisileriYukle(arama)
    } catch (iliskiHatasi) {
      setHata(iliskiHatasi.message || t('feed.actionFailed'))
    }
  }

  async function sohbetiKur(olay) {
    olay.preventDefault()
    if (secilenler.length === 0) return
    setHata('')
    try {
      const sonuc = await api.community.createThread({
        ...(yeniSohbet.grup && grupAdi.trim() ? { name: grupAdi.trim() } : {}),
        memberIds: secilenler.map(k => k.id),
      })
      setYeniSohbet(null)
      setSecilenler([])
      setGrupAdi('')
      await sohbetleriYukle()
      setAktif(sonuc.thread)
    } catch (kurmaHatasi) {
      setHata(kurmaHatasi.message || t('people.chat.createFailed'))
    }
  }

  async function davetKarari(thread, karar) {
    try {
      await api.community.davetKarari(thread.id, karar)
      if (aktif?.id === thread.id) setAktif(null)
      await sohbetleriYukle()
    } catch (kararHatasi) {
      setHata(kararHatasi.message || t('feed.actionFailed'))
    }
  }

  async function gonder(olay) {
    olay.preventDefault()
    if (!govde.trim()) return
    try {
      await api.community.sendMessage(aktif.id, govde)
      setGovde('')
      const sonuc = await api.community.messages(aktif.id)
      setMesajlar(sonuc.messages || [])
      await sohbetleriYukle()
    } catch (gonderHatasi) {
      setHata(gonderHatasi.message || t('people.chat.sendFailed'))
    }
  }

  function sohbetAdi(thread) {
    if (thread.name) return thread.name
    const digerleri = thread.members.filter(m => m.user.id !== user.id).map(m => m.user.name)
    return digerleri.join(', ') || t('people.chat.defaultThreadName')
  }

  /* --------------------------- KİŞİLER --------------------------- */
  if (mode === 'people') {
    return (
      <main className={styles.page}>
        <header>
          <h1>{t('people.title')}</h1>
          <p>{t('people.subtitle')}</p>
        </header>
        {hata && <p className={styles.error}>{hata}</p>}

        <form
          className={styles.search}
          onSubmit={olay => { olay.preventDefault(); kisileriYukle(arama).catch(e => setHata(e.message)) }}
        >
          <Search size={17} aria-hidden="true" />
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder={t('people.searchPlaceholder')} aria-label={t('people.searchPlaceholder')} />
          <Button type="submit">{t('people.searchAction')}</Button>
        </form>

        <div className={styles.people}>
          {kisiler.map(kisi => (
            <article key={kisi.id}>
              {/* Ada tıklamak profili açıyor: kişiyi bulup profiline
                  gidememek en sık yaşanan tıkanma noktasıydı. */}
              <button type="button" className={styles.kisiAdi} onClick={() => navigate(`/app/profil/${kisi.id}`)}>
                <span className={styles.kucukAvatar}>{initials(kisi.name)}</span>
                <span>{kisi.name}</span>
              </button>
              <div>
                <button type="button" onClick={() => iliskiDegistir(kisi, 'follow')} disabled={engellenen.includes(kisi.id)}>
                  <UserPlus size={16} aria-hidden="true" />
                  {takipEdilen.includes(kisi.id) ? t('people.unfollow') : t('people.follow')}
                </button>
                <button type="button" onClick={() => iliskiDegistir(kisi, 'block')}>
                  <Ban size={16} aria-hidden="true" />
                  {engellenen.includes(kisi.id) ? t('people.unblock') : t('people.block')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    )
  }

  /* -------------------------- SOHBETLER -------------------------- */
  const bekleyenDavet = aktif && threads.find(t => t.id === aktif.id)?.durumum === 'invited'

  return (
    <main className={styles.page}>
      <header>
        <div>
          <h1>{t('people.chat.title')}</h1>
          <p>{t('people.chat.subtitle')}</p>
        </div>
        <span>
          <Button
            variant="secondary"
            onClick={() => { setYeniSohbet({ grup: false }); setSecilenler([]); kisileriYukle().catch(() => {}) }}
          >
            <MessageCircle size={16} aria-hidden="true" /> {t('people.chat.newChat')}
          </Button>
          <Button
            onClick={() => { setYeniSohbet({ grup: true }); setSecilenler([]); kisileriYukle().catch(() => {}) }}
          >
            <Users size={16} aria-hidden="true" /> {t('people.chat.newGroup')}
          </Button>
        </span>
      </header>

      {hata && <p className={styles.error}>{hata}</p>}

      {yeniSohbet && (
        <form className={styles.yeniSohbet} onSubmit={sohbetiKur}>
          <div className={styles.yeniSohbetBaslik}>
            <strong>{yeniSohbet.grup ? t('people.chat.newGroup') : t('people.chat.newChat')}</strong>
            <button type="button" onClick={() => setYeniSohbet(null)} aria-label={t('people.chat.close')}><X size={16} /></button>
          </div>

          {yeniSohbet.grup && (
            <input
              className={styles.grupAdi}
              value={grupAdi}
              onChange={e => setGrupAdi(e.target.value)}
              placeholder={t('people.chat.groupNamePlaceholder')}
              maxLength={80}
              aria-label={t('people.chat.groupNameAria')}
            />
          )}

          <KisiSecici
            kisiler={kisiler.filter(k => !engellenen.includes(k.id))}
            secili={secilenler}
            onDegis={setSecilenler}
            coklu={yeniSohbet.grup}
          />

          {yeniSohbet.grup && (
            <p className={styles.ipucu}>
              {t('people.chat.groupInviteHint')}
            </p>
          )}

          <div className={styles.yeniSohbetAlt}>
            <Button variant="ghost" onClick={() => setYeniSohbet(null)}>{t('common:buttons.cancel')}</Button>
            <Button type="submit" disabled={secilenler.length === 0}>
              {yeniSohbet.grup ? t('people.chat.createGroup') : t('people.chat.startChat')}
            </Button>
          </div>
        </form>
      )}

      <div className={styles.chat}>
        <aside>
          {threads.length === 0 && <p className={styles.bos}>{t('people.chat.empty')}</p>}
          {threads.map(thread => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setAktif(thread)}
              className={aktif?.id === thread.id ? styles.active : ''}
            >
              <strong>{sohbetAdi(thread)}</strong>
              {thread.durumum === 'invited'
                ? <small className={styles.davetEtiketi}>{t('people.chat.groupInviteBadge')}</small>
                : <small>{thread.messages?.[0]?.body || t('people.chat.noMessages')}</small>}
            </button>
          ))}
        </aside>

        <section>
          {!aktif && <p className={styles.bos}>{t('people.chat.selectOne')}</p>}

          {aktif && bekleyenDavet && (
            /* Davet ekranı: mesajlar SUNUCUDA da kapalı, burada yalnız
               kullanıcıya ne olduğu anlatılıyor. */
            <div className={styles.davetKutusu}>
              <h2>{sohbetAdi(aktif)}</h2>
              <p>{t('people.chat.invitedText')}</p>
              <div>
                <Button onClick={() => davetKarari(aktif, 'accept')}><Check size={16} /> {t('people.chat.join')}</Button>
                <Button variant="ghost" onClick={() => davetKarari(aktif, 'decline')}><X size={16} /> {t('people.chat.decline')}</Button>
              </div>
            </div>
          )}

          {aktif && !bekleyenDavet && (
            <>
              <div className={styles.messages}>
                {mesajlar.length === 0 && <p className={styles.bos}>{t('people.chat.writeFirst')}</p>}
                {mesajlar.map(mesaj => (
                  <div key={mesaj.id} className={mesaj.senderId === user.id ? styles.mine : ''}>
                    <strong>{mesaj.sender?.name}</strong>
                    <p>{mesaj.body}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={gonder}>
                <input
                  value={govde}
                  onChange={e => setGovde(e.target.value)}
                  placeholder={t('people.chat.messagePlaceholder')}
                  maxLength={2000}
                  aria-label={t('people.chat.messageAria')}
                />
                <Button type="submit" disabled={!govde.trim()} ariaLabel={t('people.chat.send')}><Send size={16} /></Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
