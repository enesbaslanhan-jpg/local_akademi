type ExpansionRule = {
  signals: RegExp[]
  terms: string
}

// A small, deterministic Turkish KOBİ vocabulary bridge. It maps everyday
// wording to curriculum terminology without calling an AI model or changing
// the original query.
const RULES: ExpansionRule[] = [
  { signals: [/satış/, /kasa|nakit/, /boş|kal/], terms: 'kâr nakit arasındaki fark' },
  { signals: [/para/, /giriş|çıkış/, /faaliyet|tür/], terms: 'nakit akışlarını sınıflandırma' },
  { signals: [/bir ay|dört hafta|önümüzdeki/, /tahmin|projeksiyon/, /kasa|nakit/], terms: 'dört haftalık nakit projeksiyonu' },
  { signals: [/geç tahsil|tahsilat/, /erken ödeme|tedarikçi/], terms: 'tahsilat ödeme döngüsü' },
  { signals: [/kasa|nakit/, /açık/, /müdahale|önlem/], terms: 'nakit açığı müdahale planı' },
  { signals: [/toplam satış/, /gelir/], terms: 'ciro' },
  { signals: [/doğrudan maliyet/, /kalan|kazanç/], terms: 'brüt kâr' },
  { signals: [/tüm .*gider|işletme gider/, /kalan|kazanç/], terms: 'net kâr' },
  { signals: [/kazanç|kâr/, /satış/, /oran/], terms: 'kârlılık oranı' },
  { signals: [/müşteri/, /borç|alacak/, /hız|süre/], terms: 'tahsilat süresi' },
  { signals: [/gelir/, /gider/, /plan|aylık/], terms: 'işletme bütçesi' },
  { signals: [/beklenmeyen|acil/, /masraf|gider/, /kenar|tut/], terms: 'acil durum rezervi' },
  { signals: [/birden fazla borç|borç/, /sıra|önce|kapat/], terms: 'borç ödeme stratejisi' },
  { signals: [/üretim/, /değişmese|sabit/, /masraf|gider/], terms: 'sabit giderler' },
  { signals: [/üretim/, /arttıkça|değişken/, /masraf|gider/], terms: 'değişken giderler' },
  { signals: [/vazgeç|alternatif/, /kazanç|seçenek/], terms: 'fırsat maliyeti' },
  { signals: [/zarar etme|zararsız/, /ne kadar satış/], terms: 'başabaş noktası' },
  { signals: [/gizli kalem|bütün .*maliyet/, /ürün|birim/], terms: 'gerçek birim maliyet' },
  { signals: [/çalışan|emek/, /ürün başına|maliyet/], terms: 'işçilik maliyeti' },
  { signals: [/pazar ?yer/, /kesinti|komisyon/], terms: 'pazar yeri komisyonu' },
  { signals: [/iade/, /toplam yük|maliyet/], terms: 'iade maliyeti' },
  { signals: [/satış fiyat|ürün/, /kârlı|rekabetçi/, /fiyat/], terms: 'fiyat belirleme' },
  { signals: [/kampanya|indirim/, /zarar|fiyat/], terms: 'kampanya fiyatlandırma' },
  { signals: [/uygun|hangi/, /pazar ?yer/, /seç/], terms: 'pazar yeri seçimi' },
  { signals: [/aynı anda|birden fazla/, /mağaza|site|pazar ?yer/, /satış/], terms: 'çoklu kanal satış' },
  { signals: [/ürün sayfa|ürün/, /hangi bilgi|liste/], terms: 'ürün listeleme' },
  { signals: [/stok/, /fazla|eksik|tut/], terms: 'stok yönetimi' },
  { signals: [/sipariş/, /nerede|bildir|takip/], terms: 'sipariş takibi' },
  { signals: [/ürün iade|iadeler/, /süreç|yönet/], terms: 'iade yönetimi' },
  { signals: [/hacimsel ağırlık|desi/, /kargo|paket/], terms: 'desi hesaplama' },
  { signals: [/satış/, /belge düzen|fatura/], terms: 'fatura kesme' },
  { signals: [/ürün iade|iade/, /hangi fatura|fatura/], terms: 'iade faturası' },
  { signals: [/internet|çevrim içi|mesafeli/, /cayma|satış/], terms: 'mesafeli satış' },
  { signals: [/kişisel veri|gizlilik/, /metin|mağaza/], terms: 'gizlilik politikası' },
  { signals: [/yeni çalışan|çalışan/, /ekibe kat|işe al/], terms: 'çalışan işe alma' },
  { signals: [/müşteri/, /dert|problem/, /girişim|fikir/], terms: 'müşteri problemi' },
  { signals: [/ilk küçük|test edilebilir|minimum/, /ürün|sürüm/], terms: 'MVP oluşturma' },
  { signals: [/rakip/, /güçlü|zayıf|karşılaştır/], terms: 'rekabet analizi' },
  { signals: [/yatırımcı/, /sunum|bölüm/], terms: 'pitch deck' },
  { signals: [/sosyal ağ|sosyal medya/, /paylaşım|marka/, /plan|strateji/], terms: 'sosyal medya stratejisi' },
  { signals: [/reklam/, /getiri|dönüş|harcad/], terms: 'ROAS hesaplama' },
  { signals: [/müşteri kazan|edin/, /ne kadar|maliyet|harca/], terms: 'müşteri edinme maliyeti' },
  { signals: [/müşteri/, /ilişki boyunca|toplam değer|yaşam boyu/], terms: 'müşteri yaşam boyu değeri' },
  { signals: [/süreç|üretim/, /gecik|tıkan/, /aşama/], terms: 'darboğaz analizi' },
  { signals: [/hata/, /asıl sebep|kök neden|tekrar et/], terms: 'kök neden analizi' },
  { signals: [/iş yer|işyeri|isg/, /tehlike/, /risk/], terms: 'İSG risk değerlendirmesi' },
  { signals: [/satış potansiyel|müşteri adayı/, /ölçüt|ele/], terms: 'müşteri adayı nitelendirme' },
  { signals: [/gümrük kod|gtip/, /ürün|yurt dış/], terms: 'GTİP sınıflandırması' },
  { signals: [/tek tedarikçi/, /bağımlı|risk|azalt/], terms: 'tek kaynak riski' },
  { signals: [/ikinci doğrulama|iki aşama|parolaya ek/, /hesap|güven/], terms: 'çok faktörlü kimlik doğrulama' },
]

export function expandDomainQuery(text: string): string {
  const normalized = text.toLocaleLowerCase('tr-TR')
  const additions = RULES
    .filter(rule => rule.signals.every(signal => signal.test(normalized)))
    .map(rule => rule.terms)
  return additions.length === 0
    ? text
    : `${text} ${Array.from(new Set(additions)).join(' ')}`
}

