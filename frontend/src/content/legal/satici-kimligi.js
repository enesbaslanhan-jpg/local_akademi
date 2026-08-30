import { SATICI, saticiSatirlari } from '@/config/seller'

/*
 * Satıcı kimliği — belgelerde gösterilen hâli.
 *
 * Değerler `config/seller.js`ten, ETİKETLER burada. Sebep: değerler
 * yapılandırma, etiketler içerik. Ön bilgilendirme formu, mesafeli
 * sözleşme ve teslimat koşulları aynı bloğu basıyor; üç yerde ayrı
 * yazılsaydı biri güncellenip diğerleri unutulurdu ve satıcı kimliği
 * belgeden belgeye farklı görünürdü.
 *
 * ⚠️ Doldurulmamış alanlar listeye HİÇ girmez (`saticiSatirlari`
 * süzüyor). Belgede "TODO" ya da boş bir satır görünmez.
 */

/* ⚠️ `kimlikNo` YOK: kimlik numarası herkese açık sayfada
   yayımlanmıyor, gerekçesi `config/seller.js` içinde yazılı. */
const ETIKETLER = {
  ad: 'Satıcı',
  adres: 'Açık adres',
  telefon: 'Telefon',
  eposta: 'E-posta',
}

/** `tanimlar` biçiminde satıcı kimlik bloğu. */
export function saticiTanimlari() {
  const satirlar = saticiSatirlari().map(({ anahtar, deger }) => [ETIKETLER[anahtar], deger])

  /* Açık adres henüz yoksa hiç bilgi vermemek yerine coğrafi kapsam
     yazılıyor — bu ölçülmüş bir gerçek, uydurma değil. Adres gelince
     `config/seller.js` dolduruluyor ve bu satır kendiliğinden düşüyor. */
  if (!SATICI.adres) {
    satirlar.push(['Faaliyet yeri', SATICI.bolge])
  }

  return satirlar
}
