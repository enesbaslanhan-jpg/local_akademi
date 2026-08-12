const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

const CARDS = [
  // KO 410: İş Fikri Geliştirme
  {
    code: 'CARD-410-01',
    title: 'Varsayım Risk Skoru',
    type: 'formula',
    shortDescription: 'En riskli varsayımı belirlemek için etki ve belirsizlik katsayısını hesapla.',
    category: 'girisimcilik',
    koId: 410,
    order: 1,
    contentJson: {
      mainContent: 'Fikrindeki her varsayımı 1-5 arası puanla. Risk skoru en yüksek olan varsayım, ilk test etmen gereken belirsizlik alanıdır.',
      formula: 'Risk Skoru = (Yanlış Çıkma Etkisi [1-5]) × (Belirsizlik Düzeyi [1-5])',
      keyTakeaway: 'En yüksek risk skoruna sahip varsayım çürütülürse, fikri değiştirmek (pivot) en az maliyetli andır.',
      primaryAction: { code: 'open_assumption_check', label: 'Varsayım Riskimi Hesapla' }
    }
  },
  {
    code: 'CARD-410-02',
    title: 'Çözümü Övme ve Yönlendirici Soru Sorma',
    type: 'common_mistake',
    shortDescription: 'Görüşmede çözümden bahsedip temenni yanıtı almak araştırmayı bozar.',
    category: 'girisimcilik',
    koId: 410,
    order: 2,
    contentJson: {
      mainContent: 'Görüşmede "Şöyle bir uygulama yapsak kullanır mısınız?" sorusu yalnızca nezaket yanıtı üretir; davranış kanıtı vermez.',
      mistake: 'Görüşmede çözümü övüp yönlendirici ve temenni üreten sorular sormak.',
      correctApproach: 'Yalnızca geçmiş davranışları ve mevcut çözümleri sor: "Bu sorunu en son ne zaman yaşadınız ve nasıl çözdünüz?"',
      keyTakeaway: 'Gelecek vaatleri değil, geçmiş davranışlar ve harcanan kaynaklar gerçek kanıttır.',
      primaryAction: { code: 'open_interview_guide', label: 'Görüşme Kılavuzunu İncele' }
    }
  },
  {
    code: 'CARD-410-03',
    title: 'Varsayım-Kanıt-Deney Kartı',
    type: 'quick_application',
    shortDescription: 'En riskli varsayımını 4 adımda deneye dönüştür.',
    category: 'girisimcilik',
    koId: 410,
    order: 3,
    contentJson: {
      mainContent: 'Deney planı olmadan yapılan görüşmeler veri kirliliği yaratır.',
      quickSteps: [
        'Fikrindeki tüm müşteri, problem ve çözüm varsayımlarını listele',
        'Yanlış çıktığında fikri en çok etkileyecek varsayımı seç (Risk Skoru 1)',
        'Bu varsayım için bir nitel mülakat veya gözlem planı tanımla',
        'Test için tarih ve karar kriteri (koşul) belirle'
      ],
      primaryAction: { code: 'open_experiment_card', label: 'Deney Kartımı Oluştur' }
    }
  },
  {
    code: 'CARD-410-04',
    title: 'Fikir Doğrulama Ön Kontrolü',
    type: 'checklist',
    shortDescription: 'Saha çalışmasına çıkmadan önce araştırmanın temel şartlarını kontrol et.',
    category: 'girisimcilik',
    koId: 410,
    order: 4,
    contentJson: {
      mainContent: 'Doğru kurgulanmayan görüşme, yanlış fikre güven duymaya yol açar.',
      checklistItems: [
        'Çözümünden hiç bahsetmeyeceğin bir görüşme akışı hazırladın mı?',
        'Görüşeceğin kişilerin doğrudan hedef profil davranışına sahip olduğundan emin misin?',
        'Düzenlemeye tabi (lisans, izin, mevzuat) bir sektördeysen ilk mevzuat kısıtlarını kontrol ettin mi?'
      ],
      primaryAction: { code: 'open_sources', label: 'Kaynakları Gör' }
    }
  },

  // KO 414: Müşteri Problemi
  {
    code: 'CARD-414-01',
    title: 'Problem Örüntüsü Skoru',
    type: 'formula',
    shortDescription: 'Görüşme notlarındaki bir problemin gerçek bir örüntü olup olmadığını değerlendir.',
    category: 'girisimcilik',
    koId: 414,
    order: 1,
    contentJson: {
      mainContent: 'Problem örüntüsü, senin çıkardığın yorumla değil; farklı görüşmelerdeki somut müşteri ifadeleri ve gözlenen davranışlarla güçlenir.',
      formula: 'Örüntü Gücü = (Doğrudan Müşteri Sözü + Gözlenen Davranış) − Girişimci Yorumu',
      keyTakeaway: 'Yorumlar kanıt değildir; müşteri sözü ve gözlenen davranış ile örüntü doğrulanır.',
      primaryAction: { code: 'open_pattern_check', label: 'Örüntü Gücünü Ölç' }
    }
  },
  {
    code: 'CARD-414-02',
    title: 'Müşterinin Sözü ile Kendi Yorumunu Karıştırmak',
    type: 'common_mistake',
    shortDescription: 'Müşterinin anlatısından kendi varsayımını doğrulayacak sonuç çıkarmak.',
    category: 'girisimcilik',
    koId: 414,
    order: 2,
    contentJson: {
      mainContent: 'Görüşme notlarını analiz ederken girişimcinin kendi yorumunu kanıt sanması en sık yapılan müşteri araştırması hatasıdır.',
      mistake: 'Müşterinin "Yazılım karmaşık geliyor" sözünden "Müşteri dijital araç kullanmıyor" genellemesi yapmak.',
      correctApproach: 'İfadeleri 3 kategoriye ayır: Müşterinin doğrudan sözü, gözlenen davranış ve kendi yorumun. Yorumları doğrudan kanıt sayma.',
      keyTakeaway: 'Kendi yorumunu kanıt kabul edersen gerçek dışı bir problem tanımlarsın.',
      primaryAction: { code: 'open_interpretation_check', label: 'Notlarımı Ayrıştır' }
    }
  },
  {
    code: 'CARD-414-03',
    title: 'Problem Örüntüsü Analiz Kartı',
    type: 'quick_application',
    shortDescription: 'Görüşme notlarından tek bir doğrulanmış problem cümlesi çıkar.',
    category: 'girisimcilik',
    koId: 414,
    order: 3,
    contentJson: {
      mainContent: 'Not yığını karar verdirmez; kümelenmiş problem cümlesi karar verdirir.',
      quickSteps: [
        'Tüm görüşme notlarındaki müşteri ifadelerini ve gözlenen davranışları listeleyin',
        'İfadeleri zaman kaybı, hata/veri kaybı, gelir kaybı gibi türlere kümeleyin',
        'Farklı müşterilerde tekrarlayan ortak problem türünü tespit edin',
        '"[Segment], [belirli durumda], [mevcut yöntem nedeniyle] [sonucu] yaşıyor" cümlesini oluşturun'
      ],
      primaryAction: { code: 'open_problem_statement', label: 'Problem Cümlemi Yaz' }
    }
  },
  {
    code: 'CARD-414-04',
    title: 'Görüşme Notu Analiz Kontrolü',
    type: 'checklist',
    shortDescription: 'Görüşme bulgularını değerlendirirken tarafsızlık kontrolü yap.',
    category: 'girisimcilik',
    koId: 414,
    order: 4,
    contentJson: {
      mainContent: 'Tarafsız analiz yapılmayan müşteri görüşmeleri yanlış ürün kararlarına sebep olur.',
      checklistItems: [
        'İfadeleri Müşteri Sözü, Gözlenen Davranış ve Benim Yorumum olarak 3 kategoriye ayırdın mı?',
        'Ortak problem türünü en az birkaç farklı bağımsız anlatıda doğruladın mı?',
        'Problemi çürüten veya farklı sonuç veren görüşme notlarını ayrıca kayıt altına aldın mı?'
      ],
      primaryAction: { code: 'open_sources', label: 'Kaynakları Gör' }
    }
  },

  // KO 418: Hedef Kitle
  {
    code: 'CARD-418-01',
    title: 'Segment Önceliklendirme Skoru',
    type: 'formula',
    shortDescription: 'Hangi segmentten başlayacağını belirlemek için 3 kriteri ağırlıklandır.',
    category: 'girisimcilik',
    koId: 418,
    order: 1,
    contentJson: {
      mainContent: 'Başlangıç segmenti seçerken pazarın büyüklüğünden çok problemin aciliyeti ve müşteriye ulaşma kolaylığı belirleyicidir.',
      formula: 'Segment Skoru = (Problem Yoğunluğu × 3) + (Kaynak Ayırma Eğilimi × 2) + (Erişim Kolaylığı × 1)',
      keyTakeaway: 'En yüksek nedensel acıya ve erişilebilirliğe sahip niş segmentle başlamak kaynağı korur.',
      primaryAction: { code: 'open_segment_score', label: 'Segmentimi Skorla' }
    }
  },
  {
    code: 'CARD-418-02',
    title: '"Herkese Satarım" Yanılsaması ve Yanlış Demografi',
    type: 'common_mistake',
    shortDescription: 'B2B/işletme çözümünde yaş/şehir gibi demografik bilgilere odaklanmak veya hedef kitleyi aşırı geniş tutmak.',
    category: 'girisimcilik',
    koId: 418,
    order: 2,
    contentJson: {
      mainContent: 'B2B ve KOBİ çözümlerinde demografi değil; operasyonel davranış ve problemin görüldüğü durum hedef kitleyi belirler.',
      mistake: 'Hedef kitleyi "28-45 yaş arası tüm işletmeler" gibi B2B için ikincil kalan demografik kıstaslarla tanımlamak.',
      correctApproach: 'İşletme türü, faaliyet biçimi, işlem sıklığı ve mevcut çözüm alışkanlığı gibi davranışsal boyutlarla segmentasyon yap.',
      keyTakeaway: 'Dar ve davranışsal tanımlanmış bir niş segment, pazarlama ve satış maliyetini düşürür.',
      primaryAction: { code: 'open_segment_guide', label: 'Segment Rehberini Oku' }
    }
  },
  {
    code: 'CARD-418-03',
    title: 'İlk Müşteri Segment Kartı',
    type: 'quick_application',
    shortDescription: 'Başlangıç segmentini kanıta dayalı olarak tanımla ve netleştir.',
    category: 'girisimcilik',
    koId: 418,
    order: 3,
    contentJson: {
      mainContent: 'Kurgusal persona yerine görüşme verisine dayanan İlk Müşteri Segment Kartı ile hareket et.',
      quickSteps: [
        'İşletme türü ve faaliyet biçimini belirle',
        'Problemin yaşandığı somut durumu ve mevcut geçici çözümü yaz',
        'Bu segmente ulaşacağın kanalı ve karar vericiyi tanımla',
        'Kartın dayandığı görüşme verilerini ve henüz bilinmeyenleri kaydet'
      ],
      primaryAction: { code: 'open_segment_card', label: 'Segment Kartımı Doldur' }
    }
  },
  {
    code: 'CARD-418-04',
    title: 'Başlangıç Segmenti Ön Kontrolü',
    type: 'checklist',
    shortDescription: 'Segment seçimini kilitlemeden önce yapılması gereken kontroller.',
    category: 'girisimcilik',
    koId: 418,
    order: 4,
    contentJson: {
      mainContent: 'Kanıssız segment seçimi pazarlama bütçesinin boşa gitmesine yol açar.',
      checklistItems: [
        'Seçilen segmentteki karar verici ile doğrudan görüşme yapıldı mı?',
        'Meslek adına bakarak otomatik vergi/hukuki statü varsayımında bulunmaktan kaçınıldı mı?',
        'Segment kartındaki henüz bilinmeyen alanlar bir sonraki araştırma turuna eklendi mi?'
      ],
      primaryAction: { code: 'open_sources', label: 'Kaynakları Gör' }
    }
  }
];

async function main() {
  console.log('Seeding 12 Practical Cards for KO 410, 414, 418...');
  for (const cDef of CARDS) {
    let card = await prisma.practicalCard.findFirst({ where: { code: cDef.code } });
    if (!card) {
      card = await prisma.practicalCard.create({
        data: {
          id: randomUUID(),
          code: cDef.code,
          title: cDef.title,
          type: cDef.type,
          shortDescription: cDef.shortDescription,
          category: cDef.category,
          published: true
        }
      });
      console.log('Created card:', cDef.code);
    } else {
      await prisma.practicalCard.update({
        where: { id: card.id },
        data: {
          title: cDef.title,
          type: cDef.type,
          shortDescription: cDef.shortDescription,
          category: cDef.category,
          published: true
        }
      });
      console.log('Updated card:', cDef.code);
    }

    const existingVersion = await prisma.practicalCardVersion.findFirst({
      where: { practicalCardId: card.id, version: 1 }
    });

    if (!existingVersion) {
      await prisma.practicalCardVersion.create({
        data: {
          id: randomUUID(),
          practicalCardId: card.id,
          version: 1,
          status: 'published',
          contentJson: cDef.contentJson
        }
      });
    } else {
      await prisma.practicalCardVersion.update({
        where: { id: existingVersion.id },
        data: {
          status: 'published',
          contentJson: cDef.contentJson
        }
      });
    }

    const existingLink = await prisma.practicalCardKnowledgeObject.findFirst({
      where: {
        practicalCardId: card.id,
        knowledgeObjectId: cDef.koId
      }
    });

    if (!existingLink) {
      await prisma.practicalCardKnowledgeObject.create({
        data: {
          practicalCardId: card.id,
          knowledgeObjectId: cDef.koId,
          order: cDef.order
        }
      });
      console.log('Linked', cDef.code, 'to KO', cDef.koId);
    } else {
      await prisma.practicalCardKnowledgeObject.update({
        where: {
          practicalCardId_knowledgeObjectId: {
            practicalCardId: card.id,
            knowledgeObjectId: cDef.koId
          }
        },
        data: { order: cDef.order }
      });
    }
  }
  console.log('All 12 PracticalCards processed successfully!');
}

main().catch(console.error);
