// Batch 1 — update the 4 lessons that already exist in the DB (Ders 2, 3, 4, 17)
// Only ADDS: a real markdown link (CTA) before "## Kaynaklar", plus structured
// metadata (decisionToolLinks / modelLabLinks / financeToolLinks / embeddedPracticeBlocks).
// Lesson body text is NOT rewritten.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const TARGETS = [
  {
    koId: 1036, code: 'CUR-123-02', label: 'Ders 2 — Sahada Stok ve Sayım Düzenini Kur',
    insertBefore: '## Kaynaklar',
    ctaBlock:
`> Fark oranı hesabını **[Stok Artırmalı mıyım?](/app/decision-checks/DC-STOCK-011)** karar aracıyla kendi rakamlarınla test et — sistem yeniden sipariş noktasını ve önerilen sipariş miktarını hesaplar.
>
> Hızlı stok devir hızı kontrolü için **[Finans Merkezi'nde Stok Devir Hızı](/app/tools?tool=stok_devir)** aracını kullan; sayım periyodunu hangi ürün grubunda sıklaştırman gerektiğini gösterir.
>
> Farklı sayım sıklığı senaryolarını (haftalık/aylık/iki-üç aylık) karşılaştırmak için Model Laboratuvarı'ndaki **[Stokta Kalma Süresi (DIO)](/app/finance/models/DIO)** modelini kullanabilirsin.

`,
    decisionToolLinks: [{ code: 'DC-STOCK-011', label: 'Stok Artırmalı mıyım?' }],
    modelLabLinks: [{ code: 'DIO', label: 'Stokta Kalma Süresi (DIO)' }],
    financeToolLinks: [{ id: 'stok_devir', label: 'Stok Devir Hızı' }],
    embeddedPracticeBlocks: [
      {
        type: 'formula', label: 'Stok Fark Oranı Hesabı',
        formulas: ['Fark Oranı (%) = (Sistem Stoğu − Fiilî Stok) ÷ Ortalama Stok Değeri × 100'],
        inputs: [
          { key: 'SISTEM', label: 'Sistem Stok Değeri', unit: 'TL' },
          { key: 'FIILI', label: 'Fiilî (Sayılan) Stok Değeri', unit: 'TL' },
          { key: 'ORT', label: 'Ortalama Stok Değeri', unit: 'TL' }
        ],
        outputs: [{ key: 'ORAN', label: 'Fark Oranı', unit: '%' }]
      },
      {
        type: 'checklist', label: 'ABC Sınıflandırma ve Sayım Sıklığı Kontrolü',
        items: [
          'A grubu (yüksek değer/risk) ürünler haftalık veya iki haftada bir sayılıyor mu?',
          'C grubu ürünler sırf ucuz oldukları için tamamen kontrol dışı bırakılmıyor mu?',
          'İrsaliye/teslimat kabulünde miktar ve ürün kodu (koli adedi değil) doğrulanıyor mu?',
          'Sayım farkının nedeni tahmin değil, kayıtlı araştırmayla mı belirleniyor?'
        ],
        warningIfIncomplete: 'Kontrol tamamlanmadan sayım sıklığı belirlenirse yüksek riskli ürünlerde stok açığı geç fark edilir.'
      }
    ]
  },
  {
    koId: 1037, code: 'CUR-123-03', label: 'Ders 3 — Personel Vardiyasını ve Kasa Güvenini Yönet',
    insertBefore: '## Kaynaklar',
    ctaBlock:
`> Ek yarı zamanlı personelin tam maliyetini karşılayıp karşılamadığını **[Yeni Personel Alabilir miyim?](/app/decision-checks/DC-HIRE-006)** karar aracıyla hesapla — bu ders yalnızca vardiya ve kasa disiplinini kapsar, işe alım maliyet kararını içermez.
>
> Gün sonu kasa mutabakatı için **[Finans Merkezi'nde Kasa Kapanışı](/app/tools?tool=kasa_kapanis)** aracını kullanabilirsin.

`,
    decisionToolLinks: [{ code: 'DC-HIRE-006', label: 'Yeni Personel Alabilir miyim?' }],
    modelLabLinks: [],
    financeToolLinks: [{ id: 'kasa_kapanis', label: 'Kasa Kapanışı' }],
    embeddedPracticeBlocks: [
      {
        type: 'common_mistake', label: 'Kasa Farkında Doğrudan Çalışanı Suçlamak',
        mistake: 'Kasa 150 TL açık çıktı, bu çalışanın hatası, ücretinden kesilsin.',
        correction: 'Önce yanlış para üstü, yanlış ödeme türü, iptal/iade hatası, eksik ara nakit alım kaydı ve sistem hatası araştırılmalı; ücret kesintisi kararı İş Kanunu ve iş sözleşmesi hükümlerine göre ayrıca değerlendirilmelidir.',
        consequence: 'Araştırmadan yapılan otomatik kesinti hem hukuki risk oluşturur hem de gerçek nedeni (ör. sistem hatası) gizler; fark tekrarlanmaya devam eder.'
      },
      {
        type: 'checklist', label: 'Vardiya ve Kasa Devir Kontrolü',
        items: [
          'Son 8-12 haftanın saatlik işlem/ciro/kuyruk verisi incelendi mi?',
          'Yoğun saatlerde kasa, satış alanı ve depo desteği görevleri net ayrıldı mı?',
          'Kasa devrinde çekmecedeki nakit, sistem bakiyesi ve POS toplamı karşılaştırıldı mı?',
          'Teslim eden ve teslim alan çalışan devir tutanağında kayıt altına alındı mı?'
        ],
        warningIfIncomplete: 'Devir tutanağı olmadan kasa farkının hangi vardiyada oluştuğu belirlenemez.'
      }
    ]
  },
  {
    koId: 1038, code: 'CUR-123-04', label: 'Ders 4 — Mağaza Genişletme veya Taşıma Kararını Ver',
    replaceExact:
`> Bu kararı **Yeni Şube Açmaya Hazır mıyım?** karar aracıyla da doğrulayın — aynı başabaş ve geri dönüş süresi mantığını, kendi rakamlarınızla otomatik hesaplar.`,
    replaceWith:
`> Bu kararı **[Yeni Şube Açmaya Hazır mıyım?](/app/decision-checks/DC-BRANCH-009)** karar aracıyla da doğrulayın — aynı başabaş ve geri dönüş süresi mantığını, kendi rakamlarınızla otomatik hesaplar.
>
> Düşük/beklenen/güçlü senaryoları ve yatırım geri dönüşünü daha ileri seviyede karşılaştırmak için Model Laboratuvarı'ndaki **[Net Bugünkü Değer (NPV)](/app/finance/models/NPV)** modelini kullanabilirsin.
>
> Hızlı başabaş ciro kontrolü için **[Finans Merkezi'nde Başabaş Noktası](/app/tools?tool=basabas_noktasi)** aracı da kullanılabilir.`,
    decisionToolLinks: [{ code: 'DC-BRANCH-009', label: 'Yeni Şube Açmaya Hazır mıyım?' }],
    modelLabLinks: [{ code: 'NPV', label: 'Net Bugünkü Değer (NPV)' }],
    financeToolLinks: [{ id: 'basabas_noktasi', label: 'Başabaş Noktası' }],
    embeddedPracticeBlocks: [
      {
        type: 'comparison', label: 'Taşınma vs İkinci Şube Karşılaştırması',
        axes: [
          { name: 'Başlangıç Yatırımı', key: 'investment', unit: 'TL' },
          { name: 'Aylık Sabit Gider', key: 'fixedCost', unit: 'TL' },
          { name: 'Beklenen Aylık Ciro', key: 'revenue', unit: 'TL' },
          { name: 'Aylık Faaliyet Katkısı', key: 'contribution', unit: 'TL' },
          { name: 'Geri Dönüş Süresi', key: 'payback', unit: 'ay' }
        ]
      },
      {
        type: 'formula', label: 'Yamyamlaşma Oranı Hesabı',
        formulas: ['Yamyamlaşma Oranı (%) = Yeni Şubeye Kayan Eski Şube Satışı ÷ Yeni Şubenin Toplam Satışı × 100'],
        inputs: [
          { key: 'KAYAN', label: 'Yeni Şubeye Kayan Eski Şube Satışı', unit: 'TL' },
          { key: 'TOPLAM', label: 'Yeni Şubenin Toplam Satışı', unit: 'TL' }
        ],
        outputs: [{ key: 'ORAN', label: 'Yamyamlaşma Oranı', unit: '%' }]
      }
    ]
  },
  {
    koId: 1032, code: 'CUR-122-01', label: 'Ders 17 — İş Kurma mı, Var Olanı Devralmak mı?',
    insertBefore: '## Kaynaklar',
    ctaBlock:
`> Düşük/beklenen/güçlü senaryoların yatırım değerini karşılaştırmak için Model Laboratuvarı'ndaki **[Net Bugünkü Değer (NPV)](/app/finance/models/NPV)** ve **[İç Verim Oranı (IRR)](/app/finance/models/IRR)** modellerini kullanabilirsin.
>
> Hızlı kontrol için **[Finans Merkezi'nde ROI](/app/tools?tool=roi)** ve **[Nakit Pozisyonu](/app/tools?tool=nakit_pozisyonu)** araçlarını kullan. Bu ders için mevcut bir Karar Aracı bulunmuyor; seçim çok kriterli ve büyük ölçüde hukuki nitelikte olduğu için tek hesaplamalı bir karar aracına indirgenmemiştir.

`,
    decisionToolLinks: [],
    modelLabLinks: [{ code: 'NPV', label: 'Net Bugünkü Değer (NPV)' }, { code: 'IRR', label: 'İç Verim Oranı (IRR)' }],
    financeToolLinks: [{ id: 'roi', label: 'ROI' }, { id: 'nakit_pozisyonu', label: 'Nakit Pozisyonu' }],
    embeddedPracticeBlocks: [
      {
        type: 'comparison', label: 'Kurma vs Devralma Toplam Nakit İhtiyacı',
        axes: [
          { name: 'Kurulum / Devir Bedeli', key: 'baseCost', unit: 'TL' },
          { name: 'Stok', key: 'stock', unit: 'TL' },
          { name: 'İzin / İnceleme Gideri', key: 'permits', unit: 'TL' },
          { name: 'Çalışma Sermayesi', key: 'workingCapital', unit: 'TL' },
          { name: 'Toplam Nakit İhtiyacı', key: 'total', unit: 'TL' }
        ]
      },
      {
        type: 'checklist', label: 'Devralma Karar Kuralı Kontrolü',
        items: [
          'Geçmiş satış ve kâr kayıtları belge ile doğrulanabiliyor mu?',
          'Kira ilişkisinin devri (varsa) ev sahibi onayıyla sürdürülebiliyor mu?',
          'Stok ve demirbaşlar gerçek (ikinci el) değerinden mi alınıyor?',
          'Hukuki ve mali riskler fiyata yansıtılmış mı (fiyattan düşülmüş mü)?'
        ],
        warningIfIncomplete: 'Bu kontroller yapılmadan verilen devir teklifi, gerçekte sıfırdan kuruluştan daha pahalıya gelebilir.'
      }
    ]
  }
];

async function main() {
  console.log(`Batch 1 — updating ${TARGETS.length} existing lessons ${apply ? '(APPLY)' : '(DRY RUN)'}\n`);
  for (const t of TARGETS) {
    const ko = await prisma.knowledgeObject.findUnique({ where: { id: t.koId } });
    if (!ko) { console.log(`✗ KO ${t.koId} not found, skipping`); continue; }
    if (ko.code !== t.code) throw new Error(`KO ${t.koId} code mismatch: expected ${t.code}, got ${ko.code}`);

    let newContent;
    if (t.replaceExact) {
      if (!ko.content.includes(t.replaceExact)) throw new Error(`KO ${t.koId}: exact text to replace not found`);
      newContent = ko.content.replace(t.replaceExact, t.replaceWith);
    } else {
      if (!ko.content.includes(t.insertBefore)) throw new Error(`KO ${t.koId}: insertion anchor "${t.insertBefore}" not found`);
      newContent = ko.content.replace(t.insertBefore, t.ctaBlock + t.insertBefore);
    }

    const meta = JSON.parse(ko.metadata || '{}');
    const updatedMeta = {
      ...meta,
      decisionToolLinks: t.decisionToolLinks,
      modelLabLinks: t.modelLabLinks,
      financeToolLinks: t.financeToolLinks,
      embeddedPracticeBlocks: t.embeddedPracticeBlocks
    };

    console.log(`${t.label}`);
    console.log(`  KO ${t.koId} [${t.code}] content ${ko.content.length} -> ${newContent.length} chars`);
    console.log(`  decisionToolLinks: ${JSON.stringify(t.decisionToolLinks)}`);
    console.log(`  modelLabLinks: ${JSON.stringify(t.modelLabLinks)}`);
    console.log(`  financeToolLinks: ${JSON.stringify(t.financeToolLinks)}`);
    console.log(`  embeddedPracticeBlocks: ${t.embeddedPracticeBlocks.length} block(s)`);

    if (apply) {
      await prisma.knowledgeObject.update({
        where: { id: t.koId },
        data: { content: newContent, metadata: JSON.stringify(updatedMeta) }
      });
      console.log('  ✓ applied\n');
    } else {
      console.log('  (dry run — not written)\n');
    }
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
