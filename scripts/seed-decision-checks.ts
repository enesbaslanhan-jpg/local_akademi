import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Decision Checks...')

  // MVP: Ürünüm Gerçekten Kârlı mı?
  const dcCode = 'DC-PROFIT-001'

  const dc = await prisma.decisionCheck.upsert({
    where: { code: dcCode },
    update: {
      title: 'Ürünüm Gerçekten Kârlı mı?',
      description: 'Bir ürünün satış fiyatından tüm temel maliyetler düşüldüğünde gerçekte ne kadar kazandırdığını kontrol eder.',
      category: 'Finans',
      targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yatırımcı']),
      published: true,
      currentVersion: '1.0'
    },
    create: {
      code: dcCode,
      title: 'Ürünüm Gerçekten Kârlı mı?',
      description: 'Bir ürünün satış fiyatından tüm temel maliyetler düşüldüğünde gerçekte ne kadar kazandırdığını kontrol eder.',
      category: 'Finans',
      targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yatırımcı']),
      published: true,
      currentVersion: '1.0'
    }
  })

  // Definition JSON for the questions
  const definitionJson = {
    questions: [
      {
        code: 'salePrice',
        label: 'Satış Fiyatı',
        description: 'Ürünü müşteriye sattığınız KDV dahil son fiyat',
        type: 'money',
        required: true,
        allowUnknown: false,
        min: 0,
        currency: 'TRY',
        order: 1
      },
      {
        code: 'productCost',
        label: 'Ürün Maliyeti',
        description: 'Ürünü satın alma veya üretme maliyetiniz',
        type: 'money',
        required: true,
        allowUnknown: true,
        min: 0,
        currency: 'TRY',
        order: 2
      },
      {
        code: 'commissionRate',
        label: 'Komisyon Oranı (%)',
        description: 'Pazaryeri veya ödeme altyapısı kesintisi yüzdesi',
        type: 'percentage',
        required: true,
        allowUnknown: true,
        min: 0,
        max: 100,
        order: 3
      },
      {
        code: 'shippingCost',
        label: 'Kargo Maliyeti',
        description: 'Bir sipariş için ödenen kargo tutarı',
        type: 'money',
        required: true,
        allowUnknown: true,
        min: 0,
        currency: 'TRY',
        order: 4
      }
    ],
    rules: [
      {
        questionCode: 'salePrice',
        operator: 'less_than_or_equal',
        threshold: 0,
        findingCode: 'invalid_price',
        severity: 'critical',
        messageTemplate: 'Satış fiyatı sıfır veya negatif olamaz.',
        blocking: true,
        priority: 100
      },
      {
        questionCode: 'productCost',
        operator: 'is_unknown',
        findingCode: 'unknown_product_cost',
        severity: 'high',
        messageTemplate: 'Ürün maliyeti bilinmediği için kesin kârlılık hesaplanamıyor.',
        actionCode: 'review_product_cost',
        blocking: false,
        priority: 90
      },
      {
        questionCode: 'commissionRate',
        operator: 'is_unknown',
        findingCode: 'unknown_commission',
        severity: 'medium',
        messageTemplate: 'Komisyon oranı bilinmiyor, kâr marjınız beklenenden düşük çıkabilir.',
        actionCode: 'add_commission_cost',
        blocking: false,
        priority: 80
      }
    ]
  }

  await prisma.decisionCheckVersion.create({
    data: {
      decisionCheckId: dc.id,
      version: '1.0',
      status: 'published',
      definitionJson,
      ruleVersion: '1.0',
      publishedAt: new Date()
    }
  })

  console.log(`Seeded Decision Check: ${dc.code}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
