import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const drafts = [
  {
    title: 'E-İhracat Eğitim Programı Ankara’da Başladı',
    summary:
      'Ticaret Bakanlığı, TOBB ve TOBB ETÜ iş birliğindeki 64 saatlik hibrit program; hedef pazar, destekler, dijital pazarlama, ödeme, lojistik ve gümrükleme başlıklarını kapsıyor. Ankara programının 6 Haziran 2026’da tamamlanması planlandı; Denizli’de ikinci program hazırlığı duyuruldu.',
    sourceTitle: 'T.C. Ticaret Bakanlığı',
    sourceUrl:
      'https://ticaret.gov.tr/duyurular/e-ihracatin-yeni-uzmanlari-bu-programda-yetisecek',
    sourcePublishedAt: new Date('2026-04-14T09:00:00+03:00'),
  },
  {
    title: 'İhracat Süreçleri ve Devlet Destekleri Eğitimi Düzenlendi',
    summary:
      'Ticaret Bakanlığı 20–22 Mayıs 2026 tarihlerinde ücretsiz çevrim içi eğitim düzenledi. Program sonunda yapılan on soruluk sınavda en az yüzde 50 başarı sağlayan katılımcılar için dijital başarı belgesi öngörüldü. Bu kayıt, tamamlanmış programın bilgi amaçlı özetidir.',
    sourceTitle: 'T.C. Ticaret Bakanlığı',
    sourceUrl:
      'https://ticaret.gov.tr/duyurular/ticaret-bakanligi-ihracat-surecleri-ve-devlet-destekleri-egitim-programi-20-21-22-mayis-2026',
    sourcePublishedAt: new Date('2026-05-06T09:00:00+03:00'),
  },
  {
    title: 'E-Ticareti Güçlendirme Projesi Van Programı',
    summary:
      'Ticaret Bakanlığının TOBB ve MÜSİAD iş birliğiyle yürüttüğü proje kapsamında Van programı 22 Temmuz 2026 için duyuruldu; Hakkari, Ağrı ve Iğdır’dan katılım da planlandı. Etkinlik tarihi geçtiği için ayrıntılar arşiv ve sonraki programları izleme amacıyla resmî kaynaktan kontrol edilmelidir.',
    sourceTitle: 'T.C. Ticaret Bakanlığı',
    sourceUrl:
      'https://ticaret.gov.tr/duyurular/e-ticareti-guclendirme-projesi-van-programi-22-temmuz-2026',
    sourcePublishedAt: new Date('2026-06-29T09:00:00+03:00'),
  },
  {
    title: 'Gelir Vergisi İkinci Taksit Son Tarihi 31 Temmuz 2026',
    summary:
      'Gelir İdaresi Başkanlığının 2025 takvim yılı gelir vergisi duyurusuna göre tahakkuk eden gelir vergisinin ikinci taksiti 31 Temmuz 2026’ya kadar ödenmelidir. Mükelleflerin kendi durumlarını ve güncel takvimi doğrudan GİB kanallarından doğrulaması gerekir.',
    sourceTitle: 'Gelir İdaresi Başkanlığı',
    sourceUrl:
      'https://gib.gov.tr/duyuru-arsivi/guncel/16875_2025_takvim_yili_gelir_vergisi_beyan_donemi_basladi',
    sourcePublishedAt: new Date('2026-03-01T09:00:00+03:00'),
  },
  {
    title: 'KVKK Kurum Kütüphanesi Kaynak Taramasına Açıldı',
    summary:
      'Kişisel Verileri Koruma Kurumu, kütüphanesini akademisyenler, araştırmacılar, öğrenciler, meslek grupları ve konuya ilgi duyanların kullanımına açtığını duyurdu. Web sayfasındaki tarama sistemi kitap adı, yazar, yayınevi ve basım yılı bilgileri üzerinden araştırmayı destekliyor.',
    sourceTitle: 'Kişisel Verileri Koruma Kurumu',
    sourceUrl:
      'https://www.kvkk.gov.tr/Icerik/7674/Kurumumuz-Kutuphanesi-Hakkinda-Duyuru',
    sourcePublishedAt: new Date('2026-07-14T09:00:00+03:00'),
  },
]

async function main(): Promise<void> {
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      draftCount: drafts.length,
      officialSourcesOnly: true,
      autoPublish: false,
    }))
    return
  }
  const actor = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true, email: true },
    orderBy: { id: 'asc' },
  })
  if (!actor) throw new Error('COMMUNITY_PILOT_ADMIN_NOT_FOUND')
  let created = 0
  let skipped = 0
  for (const draft of drafts) {
    const existing = await prisma.communityPost.findFirst({
      where: {
        postType: 'official',
        sourceUrl: draft.sourceUrl,
      },
      select: { id: true },
    })
    if (existing) {
      skipped++
      continue
    }
    await prisma.$transaction(async tx => {
      const post = await tx.communityPost.create({
        data: {
          authorId: actor.id,
          postType: 'official',
          status: 'draft',
          ...draft,
        },
      })
      await tx.auditLog.create({
        data: {
          action: 'official_community_pilot_draft_created',
          entityType: 'community_post',
          entityId: post.id,
          actorId: actor.id,
          actorName: actor.email,
          metadata: JSON.stringify({
            sourceTitle: draft.sourceTitle,
            entityTitle: draft.title,
          }),
        },
      })
    })
    created++
  }
  const stored = await prisma.communityPost.findMany({
    where: {
      sourceUrl: { in: drafts.map(draft => draft.sourceUrl) },
    },
    select: { id: true, status: true, sourceUrl: true },
  })
  const report = {
    requested: drafts.length,
    created,
    skipped,
    stored: stored.length,
    allDraft: stored.every(post => post.status === 'draft'),
    allSourced: stored.every(post => Boolean(post.sourceUrl)),
    autoPublished: false,
    pass: stored.length === drafts.length &&
      stored.every(post => post.status === 'draft'),
  }
  console.log(JSON.stringify(report))
  if (!report.pass) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(JSON.stringify({
      pass: false,
      errorCode: error instanceof Error
        ? error.message
        : 'COMMUNITY_PILOT_FAILED',
    }))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

