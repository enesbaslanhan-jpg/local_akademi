/*
 * SATICI KİMLİĞİ — tek kaynak.
 *
 * Aynı bilgiler alt bilgide, ön bilgilendirme formunda, mesafeli
 * sözleşmede ve aydınlatma metninde geçiyor. Dört yerde ayrı ayrı
 * yazılsaydı biri güncellenip diğerleri unutulurdu; satıcı kimliğinin
 * belgeden belgeye farklı görünmesi ticari bir beyan hatasıdır.
 *
 * 🔴 `null` ALANLAR HENÜZ BİLİNMİYOR ve UYDURULMAYACAK.
 *
 * Temsili bir adres ya da örnek bir vergi numarası yazmak, gerçek
 * sanılacağı için yanlış beyandır. Değer gelene kadar alan `null`
 * kalır ve arayüz o satırı HİÇ ÇİZMEZ — eksik bilgiyi göstermek
 * yerine göstermemek.
 *
 * ⚠️ Önceki sürüm bu alanları `TODO_URUN_SAHIBI: açık posta adresi`
 * gibi yer tutucu METİNLERLE dolduruyordu ve o metinler gerçek
 * ziyaretçiye görünüyordu. Ölçüldü: `/fiyatlar` sayfasının altında
 * yayında duruyordu.
 *
 * 🔴 EKSİK KİMLİKLE ÜCRETLENDİRME AÇILAMAZ.
 * `tests/seller-identity.test.ts` şunu koruyor: `BILLING_STARTS_AT`
 * doluysa aşağıdaki üç alan da dolu olmalı. Mesafeli Sözleşmeler
 * Yönetmeliği satıcının açık adresini ve iletişim bilgisini zorunlu
 * kılıyor; "başvuru geçti, adresi koymayı unuttuk" durumu bu testle
 * imkânsız hâle geliyor.
 *
 * ⚠️ Yayımlanan adres arama motorlarınca indekslenir ve pratikte geri
 * alınamaz. Ürün sahibi bunu bilerek onayladı (27.08.2026); şirket
 * kurulduğunda kimlik tüzel kişiye döner ve bu dosya güncellenir.
 */

export const SATICI = {
  /** Gerçek kişi satıcı. Şirket kurulunca unvana döner. */
  ad: 'Enes Buğra Aslanhan',

  /*
   * Açık posta adresi — mesafeli satış için ZORUNLU.
   *
   * ⚠️ Bu adres aynı zamanda TEBLİGAT adresidir: tüketici hakem heyeti
   * kararı, vergi yazısı ve dava tebligatı buraya gelir. Ulaşılabilir
   * olmayan bir adres yazmak, görmediğin tebligatların süresinde
   * işlemeye başlaması demektir.
   *
   * ⚠️ Ürün sahibi kararı (29.08.2026): ev adresi yayımlanıyor.
   * Alternatif olarak sanal ofis önerildi ve gerekçesi anlatıldı
   * (yayımlanan adres arama motorlarınca indekslenir, arşivlenir ve
   * pratikte geri alınamaz; ürün topluluk/moderasyon/iade gibi çatışma
   * üreten yüzeyler taşıyor). Karar bilerek verildi.
   */
  adres: 'Yukarı Yahyalar Mahallesi, 934. Sokak No: 5 Daire: 6, 06170 Yenimahalle / Ankara',

  /*
   * Telefon — ön bilgilendirme formunda ZORUNLU.
   *
   * 0850 hizmet numarası; kişisel cep numarası değil. Mevzuat
   * "tüketicinin hızlıca ulaşabileceği telefon numarası" diyor,
   * hattın türünü şart koşmuyor.
   */
  telefon: '0850 241 19 40',

  /*
   * 🔴 YAYIMLANMIYOR — bilerek.
   *
   * Mesafeli Sözleşmeler Yönetmeliği satıcıdan "adı veya unvanı, varsa
   * MERSİS numarası, açık adresi, telefon numarası" istiyor. TC kimlik
   * numarası bu listede YOK; e-ticaret mevzuatı da MERSİS/işletme
   * bilgisi arıyor, TCKN değil.
   *
   * Gerçek kişinin TCKN'si aynı zamanda vergi kimlik numarasıdır ve
   * ödeme kuruluşuna başvuruda, fatura düzenlerken ya da resmî
   * yazışmada gerekir — ama bunların hiçbiri onu HERKESE AÇIK bir
   * sayfaya koymayı gerektirmez. Yayımlanan kimlik numarası geri
   * alınamaz ve kimlik avı için doğrudan kullanılabilir bir veridir.
   *
   * Alan burada duruyor çünkü fatura düzenleme tarafında lazım olacak;
   * `saticiSatirlari()` onu DIŞARIDA bırakıyor.
   */
  kimlikNo: null,

  /*
   * KVKK başvuru adresi. Test edilmiş ve çalışıyor.
   *
   * ⚠️ Bu adres YALNIZ KVKK başvuruları için. Satış, iptal, iade ve
   * destek yazışmaları buraya düşerse KVKK'nın otuz günlük yasal cevap
   * süresi sıradan destek postasıyla aynı kutuda karışır.
   */
  kvkkEposta: 'kvkk@localkarar.com',

  /*
   * Satış, destek, iptal ve iade adresi.
   *
   * 🔴 `null` OLDUĞU SÜRECE kvkk adresi kullanılıyor (aşağıdaki
   * `iletisimEpostasi`). Açılmamış bir adresi yayımlamak, tek kutuda
   * karışmasından daha kötü: kullanıcı yazar, posta hiçbir yere gitmez
   * ve o kişi cevap beklemeye devam eder.
   *
   * Alias açılıp bir test postası düştüğünde burayı doldur; alt bilgi,
   * dört ticari belge ve destek sayfası aynı anda güncellenir.
   */
  destekEposta: null,

  /** Adresin açık hâli gelene kadar metinlerde geçen coğrafi kapsam. */
  bolge: 'Yenimahalle, Ankara',
}

/**
 * Satış, destek, iptal ve iade için gösterilecek adres.
 *
 * Ayrı destek adresi açılana kadar KVKK adresine düşüyor — çalışmayan
 * bir adres yayımlamaktansa tek kutuda karışması yeğ.
 */
export function iletisimEpostasi() {
  return SATICI.destekEposta || SATICI.kvkkEposta
}

/** KVKK başvuruları için ayrılmış adres. */
export function kvkkEpostasi() {
  return SATICI.kvkkEposta
}

/**
 * Yayımlanan kimlik, ticari satış için yeterli mi.
 *
 * ⚠️ `kimlikNo` ARANMIYOR: yayımlanması gerekmiyor (yukarıdaki
 * gerekçe). Mevzuatın sitede aradığı asgari küme ad + açık adres +
 * telefon + iletişim adresi.
 */
export function saticiKimligiTam() {
  return Boolean(SATICI.adres && SATICI.telefon)
}

/**
 * Alt bilgi ve belgelerde basılacak satırlar.
 *
 * Bilinmeyen alanlar listeye HİÇ girmiyor; `kimlikNo` ise bilinse bile
 * girmiyor — herkese açık bir sayfada kimlik numarası yayımlanmıyor.
 */
export function saticiSatirlari() {
  return [
    { anahtar: 'ad', deger: SATICI.ad },
    { anahtar: 'adres', deger: SATICI.adres },
    { anahtar: 'telefon', deger: SATICI.telefon },
    { anahtar: 'eposta', deger: iletisimEpostasi() },
  ].filter(satir => Boolean(satir.deger))
}
