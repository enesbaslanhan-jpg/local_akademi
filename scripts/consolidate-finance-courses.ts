/*
 * 24 finansal içeriği 7 gerçek kursta birleştirir.
 *
 * Kaynak: KURS_KATEGORI_ESLEME.md · Bölüm B
 *
 * Yöntem — HİÇBİR KAYIT SİLİNMEZ:
 *   1) Grubun İLK kursu "kapsayıcı" olur; id'si, kayıtları ve ilerlemesi korunur.
 *      Sadece başlığı/açıklaması/kategorisi güncellenir.
 *   2) Diğer kursların dersleri kapsayıcıya taşınır, order yeniden numaralanır.
 *      LessonProgress ders id'sine bağlı olduğu için ilerleme kaybolmaz.
 *   3) Boşalan kurslar SİLİNMEZ, yalnızca published=false yapılır.
 *   4) Boşalan kursların kayıtları (Enrollment) kapsayıcıya taşınır.
 *      Kullanıcı zaten kapsayıcıya kayıtlıysa yeni kayıt oluşturulmaz;
 *      eski kayıt olduğu yerde bırakılır (unique [userId, courseId] ihlali olmaz).
 *
 * Kullanım:
 *   npm run courses:consolidate              → ne olacağını gösterir (dry-run)
 *   npm run courses:consolidate -- --apply   → uygular
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

type Group = {
  title: string
  description: string
  category: string
  /** Ders sırası. İlk başlık kapsayıcı kurs olur. */
  lessons: string[]
}

const GROUPS: Group[] = [
  {
    title: 'Finansal Tabloları Oku ve Yorumla',
    description: 'Gelir tablosu, bilanço ve nakit akışını birlikte okuyup işletmenin gerçek durumunu görürsün.',
    category: 'Finans ve Nakit',
    lessons: [
      'Üç Finansal Tabloyu Birlikte Okumak',
      'Mali Oranlarla İşletme Sağlığı',
      'DuPont ile Karlılığın Kaynağı',
      'Finansal Veri Kalitesi ve Model Girdileri'
    ]
  },
  {
    title: 'Nakit Döngüsünü Yönet',
    description: 'Paranın işletmene girip çıkma hızını ölçer, nakit sıkışıklığını önceden görürsün.',
    category: 'Finans ve Nakit',
    lessons: [
      'İşletme Sermayesi Yönetimi',
      'Nakit Dönüşüm Döngüsü',
      'Stok ve Alacak Verimliliği',
      'Nakit Krizi Erken Uyarıları'
    ]
  },
  {
    title: 'Bütçe, Tahmin ve Senaryo',
    description: 'Gelecek dönemi tahmin eder, sapmayı ölçer ve kötü senaryoya hazırlanırsın.',
    category: 'Finans ve Nakit',
    lessons: [
      'Sürücü Tabanlı Finansal Tahmin',
      'Bütçe ve Sapma Analizi',
      'Senaryo, Duyarlılık ve Stres Testi'
    ]
  },
  {
    title: 'Maliyet Yapısını Çöz',
    description: 'Maliyetlerini doğru ayırır, başabaş noktanı bulur ve fiyat kararını sayıya dayandırırsın.',
    category: 'Maliyet ve Fiyatlama',
    lessons: [
      'Sabit ve Değişken Maliyet',
      'Başa Baş ve Güvenlik Marjı',
      'Ürün Bazlı Karlılık',
      'Fiyatlandırma ve Marj Simülasyonu'
    ]
  },
  {
    title: 'Müşteri Ekonomisini Ölç',
    description: 'Bir müşteriyi kazanmanın maliyetini ve ömür boyu değerini hesaplar, büyümenin kârlı olup olmadığını görürsün.',
    category: 'Satış ve Pazarlama',
    lessons: [
      'CAC ve Müşteri Edinme Ekonomisi',
      'LTV, Churn ve Retention',
      'Cohort Analizi',
      'E-Ticarette Gerçek Sipariş Karlılığı'
    ]
  },
  {
    title: 'Yatırım Kararını Değerlendir',
    description: 'Bir yatırımın veya işletmenin bugünkü değerini hesaplar, paranın maliyetini işin içine katarsın.',
    category: 'Girişimcilik ve Yatırım',
    lessons: [
      'NPV ve IRR ile Yatırım Kararı',
      'DCF ile Şirket ve Proje Değerleme',
      'CAPM, WACC ve Sermaye Maliyeti'
    ]
  },
  {
    title: 'Girişim Finansmanı',
    description: 'Nakit yakma hızını, ne kadar ömrün kaldığını ve yatırım aldığında payının ne olacağını hesaplarsın.',
    category: 'Girişimcilik ve Yatırım',
    lessons: [
      'Burn Rate ve Runway',
      'Fonlama İhtiyacı ve Seyrelme'
    ]
  }
]

async function main() {
  const allTitles = GROUPS.flatMap(group => group.lessons)
  const courses = await prisma.course.findMany({
    where: { title: { in: allTitles } },
    include: { lessons: { orderBy: { order: 'asc' } }, enrollments: true }
  })

  const byTitle = new Map(courses.map(course => [course.title, course]))

  // Eksik kurs varsa DURDUR — yarım birleştirme en kötü sonuç.
  const missing = allTitles.filter(title => !byTitle.has(title))
  if (missing.length) {
    console.error('Veritabanında bulunamayan kurslar:')
    missing.forEach(title => console.error(`  - ${title}`))
    console.error('\nBaşlıklar değişmiş olabilir. Devam edilmedi.')
    process.exitCode = 1
    return
  }

  console.log(`${allTitles.length} kurs bulundu → ${GROUPS.length} kursta birleşecek\n`)

  type Plan = {
    group: Group
    containerId: number
    lessonMoves: Array<{ lessonId: number; fromCourse: string; newOrder: number }>
    absorbedCourseIds: number[]
    enrollmentMoves: Array<{ enrollmentId: number; userId: number; fromCourse: string }>
    enrollmentSkipped: number
  }

  const plans: Plan[] = []

  for (const group of GROUPS) {
    const container = byTitle.get(group.lessons[0])!
    const containerUserIds = new Set(container.enrollments.map(e => e.userId))

    const lessonMoves: Plan['lessonMoves'] = []
    const absorbedCourseIds: number[] = []
    const enrollmentMoves: Plan['enrollmentMoves'] = []
    let enrollmentSkipped = 0
    let order = 1

    for (const title of group.lessons) {
      const source = byTitle.get(title)!
      for (const lesson of source.lessons) {
        lessonMoves.push({ lessonId: lesson.id, fromCourse: title, newOrder: order++ })
      }
      if (source.id === container.id) continue

      absorbedCourseIds.push(source.id)
      for (const enrollment of source.enrollments) {
        if (containerUserIds.has(enrollment.userId)) { enrollmentSkipped++; continue }
        containerUserIds.add(enrollment.userId)
        enrollmentMoves.push({ enrollmentId: enrollment.id, userId: enrollment.userId, fromCourse: title })
      }
    }

    plans.push({ group, containerId: container.id, lessonMoves, absorbedCourseIds, enrollmentMoves, enrollmentSkipped })

    console.log(`## ${group.title}  (${group.category})`)
    console.log(`   kapsayıcı kurs: [${container.id}] ${container.title}`)
    console.log(`   ders sayısı: ${lessonMoves.length}`)
    lessonMoves.forEach(move => console.log(`     ${String(move.newOrder).padStart(2)}. ${move.fromCourse}`))
    console.log(`   yayından kaldırılacak (silinmeyecek) kurs: ${absorbedCourseIds.length}`)
    if (enrollmentMoves.length) console.log(`   taşınacak kayıt: ${enrollmentMoves.length}`)
    if (enrollmentSkipped) console.log(`   zaten kayıtlı olduğu için atlanan: ${enrollmentSkipped}`)
    console.log()
  }

  const totalAbsorbed = plans.reduce((sum, plan) => sum + plan.absorbedCourseIds.length, 0)
  const totalEnrollments = plans.reduce((sum, plan) => sum + plan.enrollmentMoves.length, 0)
  console.log(`Özet: ${allTitles.length} kurs → ${GROUPS.length} kurs`)
  console.log(`      ${totalAbsorbed} kurs yayından kalkacak (kayıtlar korunur, silinmez)`)
  console.log(`      ${totalEnrollments} kullanıcı kaydı kapsayıcı kursa taşınacak`)

  if (!APPLY) {
    console.log('\nDRY-RUN — hiçbir kayıt değiştirilmedi.')
    console.log('Uygulamak için: npm run courses:consolidate -- --apply')
    return
  }

  for (const plan of plans) {
    await prisma.$transaction([
      // 1) Kapsayıcı kursun kimliğini güncelle
      prisma.course.update({
        where: { id: plan.containerId },
        data: {
          title: plan.group.title,
          description: plan.group.description,
          category: plan.group.category,
          published: true
        }
      }),
      // 2) Dersleri taşı ve yeniden numarala
      ...plan.lessonMoves.map(move =>
        prisma.lesson.update({
          where: { id: move.lessonId },
          data: { courseId: plan.containerId, order: move.newOrder }
        })
      ),
      // 3) Kayıtları taşı
      ...plan.enrollmentMoves.map(move =>
        prisma.enrollment.update({
          where: { id: move.enrollmentId },
          data: { courseId: plan.containerId }
        })
      ),
      // 4) Boşalan kursları yayından kaldır — SİLME yok
      prisma.course.updateMany({
        where: { id: { in: plan.absorbedCourseIds } },
        data: { published: false }
      })
    ])
    console.log(`  ✓ ${plan.group.title}`)
  }

  console.log('\nUYGULANDI.')
  console.log('Boşalan kurslar silinmedi, yalnızca published=false yapıldı.')
  console.log('Geri almak isterseniz o kayıtlar hâlâ veritabanında duruyor.')
}

main()
  .catch(error => { console.error(error); process.exitCode = 1 })
  .finally(async () => prisma.$disconnect())
