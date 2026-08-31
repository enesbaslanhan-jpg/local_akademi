import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import styles from './BillingProfileForm.module.css'

/*
 * FATURA KİMLİK FORMU — ödeme panelindeki adım.
 *
 * 🔴 ÖLÇÜLEN EKSİK: ödeme çalışıyordu ama fatura kesilebilecek hiçbir
 * bilgi toplanmıyordu. PayTR token'ına `user_address` ve `user_phone`
 * olarak "Belirtilmedi" gidiyordu.
 *
 * Ürün sahibi kararları (31.08.2026):
 *   - Form ödeme panelinin İÇİNDE, karttan önceki adım. Bilgi bir kez
 *     alınıp saklanıyor; ikinci ödemede tekrar sorulmuyor.
 *   - Bireysel alıcıda TCKN İSTEĞE BAĞLI.
 *
 * 🔴 DOĞRULAMANIN OTORİTESİ SUNUCU.
 *
 * Buradaki tek istemci kontrolü, hangi alanların dolu olması
 * gerektiği (düğmeyi açmak için). TCKN/VKN sağlaması burada
 * TEKRARLANMIYOR: aynı kuralı iki dilde iki kez yazmak, ikisinin
 * sessizce ayrışması demek. Sunucu 422 dönerse hatalar alan alan
 * kutuların altına yazılıyor.
 *
 * ⚠️ Kullanıcının yazdığı kimlik numarası HİÇBİR YERE loglanmıyor ve
 * hata mesajında yankılanmıyor.
 */

const BOS = {
  tip: 'INDIVIDUAL',
  unvan: '',
  tckn: '',
  vkn: '',
  vergiDairesi: '',
  telefon: '',
  adres: '',
  il: '',
  ilce: '',
}

/** Kaydetmeye izin verecek asgari doluluk — sağlama DEĞİL. */
export function formDoldu(d) {
  const ortak = d.unvan.trim() && d.adres.trim() && d.il.trim() && d.ilce.trim() && d.telefon.trim()
  if (!ortak) return false
  if (d.tip === 'CORPORATE') return Boolean(d.vkn.trim() && d.vergiDairesi.trim())
  return true
}

function Alan({ ad, etiket, deger, onDegis, hata, ipucu, ...kalan }) {
  const hataId = hata ? `${ad}-hata` : undefined
  return (
    <label className={styles.alan}>
      <span className={styles.etiket}>{etiket}</span>
      <input
        name={ad}
        value={deger}
        onChange={e => onDegis(ad, e.target.value)}
        aria-invalid={hata ? 'true' : undefined}
        aria-describedby={hataId}
        className={hata ? styles.girdiHatali : styles.girdi}
        {...kalan}
      />
      {/* Hata alanın ALTINDA ve o alana bağlı: tek bir "form hatalı"
          mesajı hangi kutunun düzeltileceğini söylemez. */}
      {hata && <span id={hataId} className={styles.hata}>{hata}</span>}
      {!hata && ipucu && <span className={styles.ipucu}>{ipucu}</span>}
    </label>
  )
}

export default function BillingProfileForm({ baslangic, onKaydedildi, onVazgec }) {
  const { t } = useTranslation('common')
  const [d, setD] = useState(() => ({ ...BOS, ...(baslangic ?? {}) }))
  const [hatalar, setHatalar] = useState({})
  const [genelHata, setGenelHata] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const kurumsal = d.tip === 'CORPORATE'

  function degis(ad, deger) {
    setD(o => ({ ...o, [ad]: deger }))
    /* Kullanıcı yazmaya başlayınca o alanın hatası kalkıyor; duran
       kırmızı yazı "hâlâ yanlış" diye okunuyor. */
    setHatalar(o => (o[ad] ? { ...o, [ad]: undefined } : o))
  }

  async function kaydet(e) {
    e.preventDefault()
    setKaydediliyor(true)
    setGenelHata(null)
    try {
      await api.payments.faturaKimligiYaz(d)
      setHatalar({})
      onKaydedildi?.(d)
    } catch (hata) {
      const alanHatalari = hata?.data?.hatalar
      if (alanHatalari && typeof alanHatalari === 'object') {
        /* Sunucu anahtar gönderiyor ("zorunlu", "gecersiz"); çeviri
           burada yapılıyor ki metin json'da kalsın. */
        const cevrili = {}
        for (const [alan, anahtar] of Object.entries(alanHatalari)) {
          cevrili[alan] = t(`billing.fatura.hata.${anahtar}`)
        }
        setHatalar(cevrili)
      } else {
        setGenelHata(hata?.apiMessage || t('billing.fatura.kaydedilemedi'))
      }
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={kaydet} noValidate>
      <p className={styles.giris}>{t('billing.fatura.aciklama')}</p>

      <fieldset className={styles.tipSecim}>
        <legend className={styles.etiket}>{t('billing.fatura.tip')}</legend>
        {['INDIVIDUAL', 'CORPORATE'].map(tip => (
          <label key={tip} className={d.tip === tip ? styles.tipSecili : styles.tipSecenek}>
            <input
              type="radio"
              name="tip"
              value={tip}
              checked={d.tip === tip}
              onChange={() => degis('tip', tip)}
            />
            {t(`billing.fatura.tipler.${tip}`)}
          </label>
        ))}
      </fieldset>

      <Alan
        ad="unvan"
        etiket={kurumsal ? t('billing.fatura.unvanKurumsal') : t('billing.fatura.unvanBireysel')}
        deger={d.unvan}
        onDegis={degis}
        hata={hatalar.unvan}
        autoComplete={kurumsal ? 'organization' : 'name'}
        maxLength={140}
      />

      {kurumsal ? (
        <div className={styles.ikili}>
          <Alan
            ad="vkn"
            etiket={t('billing.fatura.vkn')}
            deger={d.vkn}
            onDegis={degis}
            hata={hatalar.vkn}
            inputMode="numeric"
            maxLength={10}
          />
          <Alan
            ad="vergiDairesi"
            etiket={t('billing.fatura.vergiDairesi')}
            deger={d.vergiDairesi}
            onDegis={degis}
            hata={hatalar.vergiDairesi}
            maxLength={80}
          />
        </div>
      ) : (
        <Alan
          ad="tckn"
          etiket={t('billing.fatura.tckn')}
          deger={d.tckn}
          onDegis={degis}
          hata={hatalar.tckn}
          /* İsteğe bağlı olduğu ALANIN ALTINDA yazılı. Yıldızsız
             bırakıp susmak, kullanıcıya zorunlu sandırırdı. */
          ipucu={t('billing.fatura.tcknIpucu')}
          inputMode="numeric"
          maxLength={11}
        />
      )}

      <Alan
        ad="telefon"
        etiket={t('billing.fatura.telefon')}
        deger={d.telefon}
        onDegis={degis}
        hata={hatalar.telefon}
        type="tel"
        autoComplete="tel"
        placeholder="05XX XXX XX XX"
      />

      <Alan
        ad="adres"
        etiket={t('billing.fatura.adres')}
        deger={d.adres}
        onDegis={degis}
        hata={hatalar.adres}
        autoComplete="street-address"
        maxLength={400}
      />

      <div className={styles.ikili}>
        <Alan
          ad="il"
          etiket={t('billing.fatura.il')}
          deger={d.il}
          onDegis={degis}
          hata={hatalar.il}
          autoComplete="address-level1"
          maxLength={80}
        />
        <Alan
          ad="ilce"
          etiket={t('billing.fatura.ilce')}
          deger={d.ilce}
          onDegis={degis}
          hata={hatalar.ilce}
          autoComplete="address-level2"
          maxLength={80}
        />
      </div>

      {genelHata && <p className={styles.genelHata} role="alert">{genelHata}</p>}

      <div className={styles.eylemler}>
        {onVazgec && (
          <button type="button" className={styles.ikincil} onClick={onVazgec}>
            {t('billing.fatura.vazgec')}
          </button>
        )}
        <button type="submit" className={styles.birincil} disabled={!formDoldu(d) || kaydediliyor}>
          {kaydediliyor ? t('billing.fatura.kaydediliyor') : t('billing.fatura.kaydetVeDevam')}
        </button>
      </div>

      <p className={styles.kvkk}>{t('billing.fatura.kvkkNotu')}</p>
    </form>
  )
}
