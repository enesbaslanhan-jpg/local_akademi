import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  getEmbeddedPracticeBlocksForKnowledgeObject,
  getEmbeddedPracticeBlocksForCourse,
  getEmbeddedPracticeBlocksForLesson,
  isValidDecisionCheckCode
} from '../src/services/embedded-practice-blocks'

const prisma = new PrismaClient()

describe('Embedded Practice Blocks', () => {
  let user: any
  let category: any
  let knowledgeObject: any
  let course: any
  let lesson: any
  let practicalCard: any

  beforeAll(async () => {
    user = await prisma.user.create({
      data: { email: `epb_user_${Date.now()}@test.com`, name: 'EPB User', password: 'testpassword', role: 'student' }
    })

    category = await prisma.category.create({
      data: { name: `EPB Category ${Date.now()}`, slug: `epb-category-${Date.now()}` }
    })

    knowledgeObject = await prisma.knowledgeObject.create({
      data: {
        code: `EPB-KO-${Date.now()}`,
        title: 'EPB Test Knowledge Object',
        type: 'concept',
        content: 'Test content',
        embedding: JSON.stringify(Array.from({ length: 768 }, () => 0)),
        metadata: '{}',
        status: 'published',
        isDemo: false,
        categoryId: category.id
      }
    })

    course = await prisma.course.create({
      data: { title: 'EPB Test Course', description: 'Test', category: 'test', published: true }
    })

    lesson = await prisma.lesson.create({
      data: { title: 'EPB Test Lesson', courseId: course.id, order: 1, content: 'test', knowledgeObjectId: knowledgeObject.id }
    })

    practicalCard = await prisma.practicalCard.create({
      data: {
        code: `EPB-PC-${Date.now()}`,
        title: 'EPB Test Card',
        type: 'checklist',
        shortDescription: 'Test embedded block',
        published: true,
        category: 'Test'
      }
    })

    await prisma.practicalCardVersion.create({
      data: {
        practicalCardId: practicalCard.id,
        version: 1,
        status: 'published',
        contentJson: {
          mainContent: 'Main content',
          checklistItems: ['Item 1', 'Item 2'],
          primaryAction: { label: 'Check', code: 'open_decision_check' }
        }
      }
    })

    await prisma.practicalCardKnowledgeObject.create({
      data: {
        practicalCardId: practicalCard.id,
        knowledgeObjectId: knowledgeObject.id,
        order: 0
      }
    })
  })

  afterAll(async () => {
    await prisma.practicalCardKnowledgeObject.deleteMany({ where: { practicalCardId: practicalCard.id } })
    await prisma.practicalCardVersion.deleteMany({ where: { practicalCardId: practicalCard.id } })
    await prisma.practicalCard.deleteMany({ where: { id: practicalCard.id } })
    await prisma.lesson.deleteMany({ where: { id: lesson.id } })
    await prisma.course.deleteMany({ where: { id: course.id } })
    await prisma.knowledgeObject.deleteMany({ where: { id: knowledgeObject.id } })
    await prisma.category.deleteMany({ where: { id: category.id } })
    await prisma.user.deleteMany({ where: { id: user.id } })
    await prisma.$disconnect()
  })

  it('returns blocks for a knowledge object', async () => {
    const blocks = await getEmbeddedPracticeBlocksForKnowledgeObject(knowledgeObject.id)
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('checklist')
    expect(blocks[0].title).toBe(practicalCard.title)
    expect(blocks[0].content.checklistItems).toEqual(['Item 1', 'Item 2'])
  })

  it('returns blocks for a course via its lessons', async () => {
    const blocks = await getEmbeddedPracticeBlocksForCourse(course.id)
    expect(blocks.length).toBe(1)
    expect(blocks[0].id).toBe(practicalCard.id)
  })

  it('returns blocks for a single lesson', async () => {
    const blocks = await getEmbeddedPracticeBlocksForLesson(lesson.id)
    expect(blocks.length).toBe(1)
    expect(blocks[0].type).toBe('checklist')
  })

  it('returns empty array when no links exist', async () => {
    const orphanKo = await prisma.knowledgeObject.create({
      data: {
        code: `EPB-ORPHAN-${Date.now()}`,
        title: 'Orphan',
        type: 'concept',
        content: '...',
        embedding: JSON.stringify(Array.from({ length: 768 }, () => 0)),
        metadata: '{}',
        status: 'published',
        isDemo: false
      }
    })
    const blocks = await getEmbeddedPracticeBlocksForKnowledgeObject(orphanKo.id)
    expect(blocks).toEqual([])
    await prisma.knowledgeObject.deleteMany({ where: { id: orphanKo.id } })
  })

  it('renders scoped Operations Wave 2 metadata blocks without a decision tool', async () => {
    const metadataKo = await prisma.knowledgeObject.create({
      data: {
        code: `EPB-OPS-W2-${Date.now()}`,
        title: 'Operations Wave 2 metadata block',
        type: 'concept',
        content: '...',
        embedding: JSON.stringify(Array.from({ length: 768 }, () => 0)),
        metadata: JSON.stringify({
          embeddedPracticeBlocksVersion: 'operations-wave-2',
          embeddedPracticeBlocks: [{
            id: 'evidence-check',
            type: 'checklist',
            title: 'Kanıt kontrolü',
            content: { checklistItems: ['Kayıt var mı?', 'Varsayım işaretlendi mi?'] },
            relatedDecisionCheckCode: 'DC-SHOULD-NOT-RENDER'
          }]
        }),
        status: 'published',
        isDemo: false
      }
    })

    const blocks = await getEmbeddedPracticeBlocksForKnowledgeObject(metadataKo.id)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('checklist')
    expect(blocks[0].content.checklistItems).toEqual(['Kayıt var mı?', 'Varsayım işaretlendi mi?'])
    expect(blocks[0].relatedDecisionCheckCode).toBeNull()
    await prisma.knowledgeObject.deleteMany({ where: { id: metadataKo.id } })
  })

  it('validates decision check codes', () => {
    expect(isValidDecisionCheckCode('DC-PROFIT-001')).toBe(true)
    expect(isValidDecisionCheckCode('invalid')).toBe(false)
    expect(isValidDecisionCheckCode(null)).toBe(false)
  })
})
