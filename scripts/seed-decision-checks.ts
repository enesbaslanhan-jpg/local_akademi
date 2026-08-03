import { PrismaClient } from '@prisma/client'
import { STRUCTURED_TOOL_CONFIGS } from '../src/services/decision-tool-catalog'

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
      currentVersion: '2.0'
    },
    create: {
      code: dcCode,
      title: 'Ürünüm Gerçekten Kârlı mı?',
      description: 'Bir ürünün satış fiyatından tüm temel maliyetler düşüldüğünde gerçekte ne kadar kazandırdığını kontrol eder.',
      category: 'Finans',
      targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yatırımcı']),
      published: true,
      currentVersion: '2.0'
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
      },
      {
        code: 'packagingCost',
        label: 'Paketleme Maliyeti',
        description: 'Kutu, poşet, etiket ve koruyucu malzemenin ürün başına maliyeti',
        type: 'money',
        required: true,
        allowUnknown: false,
        min: 0,
        currency: 'TRY',
        order: 5
      },
      {
        code: 'returnLossAllowance',
        label: 'İade Payı',
        description: 'İade ve hasar riskleri için ürün başına ayırdığınız ortalama tutar',
        type: 'money',
        required: true,
        allowUnknown: false,
        min: 0,
        currency: 'TRY',
        order: 6
      },
      {
        code: 'otherVariableCost',
        label: 'Diğer Giderler',
        description: 'Reklam payı, ödeme kesintisi ve diğer ürün başı değişken giderler',
        type: 'money',
        required: true,
        allowUnknown: false,
        min: 0,
        currency: 'TRY',
        order: 7
      },
      {
        code: 'discountRate',
        label: 'İndirim Oranı (%)',
        description: 'Planladığınız indirimin satış fiyatına uygulanacak oranı; indirim yoksa 0 girin',
        type: 'percentage',
        required: true,
        allowUnknown: false,
        min: 0,
        max: 100,
        order: 8
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

  const existingVersion = await prisma.decisionCheckVersion.findFirst({
    where: { decisionCheckId: dc.id, version: '2.0' }
  })
  const versionData = {
    status: 'published',
    definitionJson,
    ruleVersion: '2.0',
    publishedAt: new Date()
  }

  if (existingVersion) {
    await prisma.decisionCheckVersion.update({ where: { id: existingVersion.id }, data: versionData })
  } else {
    await prisma.decisionCheckVersion.create({
      data: { decisionCheckId: dc.id, version: '2.0', ...versionData }
    })
  }

  console.log(`Seeded Decision Check: ${dc.code}`)

  for (const tool of STRUCTURED_TOOL_CONFIGS) {
    const decisionCheck = await prisma.decisionCheck.upsert({
      where: { code: tool.code },
      update: {
        title: tool.title,
        description: tool.description,
        category: tool.category,
        targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yönetici']),
        published: true,
        currentVersion: tool.version
      },
      create: {
        code: tool.code,
        title: tool.title,
        description: tool.description,
        category: tool.category,
        targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yönetici']),
        published: true,
        currentVersion: tool.version
      }
    })

    const toolDefinition = {
      questions: tool.questions,
      rules: [],
      ui: {
        intro: tool.intro,
        submitLabel: tool.submitLabel,
        formulas: tool.formulas,
        decisionChecks: tool.decisionChecks
      }
    }
    const existingToolVersion = await prisma.decisionCheckVersion.findFirst({
      where: { decisionCheckId: decisionCheck.id, version: tool.version }
    })
    const toolVersionData = {
      status: 'published',
      definitionJson: toolDefinition,
      ruleVersion: tool.version,
      publishedAt: new Date()
    }

    if (existingToolVersion) {
      await prisma.decisionCheckVersion.update({ where: { id: existingToolVersion.id }, data: toolVersionData })
    } else {
      await prisma.decisionCheckVersion.create({
        data: { decisionCheckId: decisionCheck.id, version: tool.version, ...toolVersionData }
      })
    }
    console.log(`Seeded Decision Check: ${decisionCheck.code}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
