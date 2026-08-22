import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Check, MessageCircle, Search, Send, UserPlus, Users, X } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { initials } from './CommunityPage'
import styles from './CommunitySocialPage.module.css'

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
  const [arama, setArama] = useState('')

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return kisiler
    return kisiler.filter(k => k.name.toLocaleLowerCase('tr-TR').includes(q))
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
          placeholder="Kişi ara"
          aria-label="Kişi ara"
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
        {suzulmus.length === 0 && <p className={styles.bos}>Kimse bulunamadı.</p>}
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
        setHata(e.message || 'Mesajlar yüklenemedi.')
      })
  }, [aktif])

  async function iliskiDegistir(kisi, tur) {
    const liste = tur === 'follow' ? takipEdilen : engellenen
    const acikMi = !liste.includes(kisi.id)
    try {
      await (tur === 'follow' ? api.community.follow(kisi.id, acikMi) : api.community.block(kisi.id, acikMi))
      await kisileriYukle(arama)
    } catch (iliskiHatasi) {
      setHata(iliskiHatasi.message || 'İşlem tamamlanamadı.')
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
      setHata(kurmaHatasi.message || 'Sohbet açılamadı.')
    }
  }

  async function davetKarari(thread, karar) {
    try {
      await api.community.davetKarari(thread.id, karar)
      if (aktif?.id === thread.id) setAktif(null)
      await sohbetleriYukle()
    } catch (kararHatasi) {
      setHata(kararHatasi.message || 'İşlem tamamlanamadı.')
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
      setHata(gonderHatasi.message || 'Mesaj gönderilemedi.')
    }
  }

  function sohbetAdi(thread) {
    if (thread.name) return thread.name
    const digerleri = thread.members.filter(m => m.user.id !== user.id).map(m => m.user.name)
    return digerleri.join(', ') || 'Sohbet'
  }

  /* --------------------------- KİŞİLER --------------------------- */
  if (mode === 'people') {
    return (
      <main className={styles.page}>
        <header>
          <h1>Topluluk kişileri</h1>
          <p>Takip ettiklerini ve engellediğin hesapları yönet. Profil kartına tıklayarak profili açabilirsin.</p>
        </header>
        {hata && <p className={styles.error}>{hata}</p>}

        <form
          className={styles.search}
          onSubmit={olay => { olay.preventDefault(); kisileriYukle(arama).catch(e => setHata(e.message)) }}
        >
          <Search size={17} aria-hidden="true" />
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Kişi ara" aria-label="Kişi ara" />
          <Button type="submit">Ara</Button>
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
                  {takipEdilen.includes(kisi.id) ? 'Takibi bırak' : 'Takip et'}
                </button>
                <button type="button" onClick={() => iliskiDegistir(kisi, 'block')}>
                  <Ban size={16} aria-hidden="true" />
                  {engellenen.includes(kisi.id) ? 'Engeli kaldır' : 'Engelle'}
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
          <h1>Sohbetler</h1>
          <p>Birebir konuş veya çalışma grubu oluştur.</p>
        </div>
        <span>
          <Button
            variant="secondary"
            onClick={() => { setYeniSohbet({ grup: false }); setSecilenler([]); kisileriYukle().catch(() => {}) }}
          >
            <MessageCircle size={16} aria-hidden="true" /> Yeni sohbet
          </Button>
          <Button
            onClick={() => { setYeniSohbet({ grup: true }); setSecilenler([]); kisileriYukle().catch(() => {}) }}
          >
            <Users size={16} aria-hidden="true" /> Grup oluştur
          </Button>
        </span>
      </header>

      {hata && <p className={styles.error}>{hata}</p>}

      {yeniSohbet && (
        <form className={styles.yeniSohbet} onSubmit={sohbetiKur}>
          <div className={styles.yeniSohbetBaslik}>
            <strong>{yeniSohbet.grup ? 'Yeni grup' : 'Yeni sohbet'}</strong>
            <button type="button" onClick={() => setYeniSohbet(null)} aria-label="Kapat"><X size={16} /></button>
          </div>

          {yeniSohbet.grup && (
            <input
              className={styles.grupAdi}
              value={grupAdi}
              onChange={e => setGrupAdi(e.target.value)}
              placeholder="Grup adı (isteğe bağlı)"
              maxLength={80}
              aria-label="Grup adı"
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
              Gruba eklediğin kişiler davet alır; katılana kadar mesajları göremezler.
            </p>
          )}

          <div className={styles.yeniSohbetAlt}>
            <Button variant="ghost" onClick={() => setYeniSohbet(null)}>Vazgeç</Button>
            <Button type="submit" disabled={secilenler.length === 0}>
              {yeniSohbet.grup ? 'Grubu oluştur' : 'Sohbeti başlat'}
            </Button>
          </div>
        </form>
      )}

      <div className={styles.chat}>
        <aside>
          {threads.length === 0 && <p className={styles.bos}>Henüz sohbetin yok.</p>}
          {threads.map(thread => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setAktif(thread)}
              className={aktif?.id === thread.id ? styles.active : ''}
            >
              <strong>{sohbetAdi(thread)}</strong>
              {thread.durumum === 'invited'
                ? <small className={styles.davetEtiketi}>Grup daveti</small>
                : <small>{thread.messages?.[0]?.body || 'Henüz mesaj yok'}</small>}
            </button>
          ))}
        </aside>

        <section>
          {!aktif && <p className={styles.bos}>Bir sohbet seç.</p>}

          {aktif && bekleyenDavet && (
            /* Davet ekranı: mesajlar SUNUCUDA da kapalı, burada yalnız
               kullanıcıya ne olduğu anlatılıyor. */
            <div className={styles.davetKutusu}>
              <h2>{sohbetAdi(aktif)}</h2>
              <p>Bu gruba davet edildin. Katılmadan mesajları göremezsin.</p>
              <div>
                <Button onClick={() => davetKarari(aktif, 'accept')}><Check size={16} /> Katıl</Button>
                <Button variant="ghost" onClick={() => davetKarari(aktif, 'decline')}><X size={16} /> Reddet</Button>
              </div>
            </div>
          )}

          {aktif && !bekleyenDavet && (
            <>
              <div className={styles.messages}>
                {mesajlar.length === 0 && <p className={styles.bos}>İlk mesajı sen yaz.</p>}
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
                  placeholder="Mesaj yaz…"
                  maxLength={2000}
                  aria-label="Mesaj"
                />
                <Button type="submit" disabled={!govde.trim()} ariaLabel="Gönder"><Send size={16} /></Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
