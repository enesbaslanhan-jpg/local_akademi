import { z } from 'zod'

export const practicalCardContentSchema = z.object({
  mainContent: z.string().optional(),
  formula: z.string().optional(),
  example: z.string().optional(),
  warning: z.string().optional(),
  checklistItems: z.array(z.string()).optional(),
  keyTakeaway: z.string().optional(),
  primaryAction: z.object({
    label: z.string(),
    code: z.string() // open_profitability_check, open_pricing_tool vs.
  }).optional(),
  relatedToolCode: z.string().optional(),
  relatedDecisionCheckCode: z.string().optional(),
  sourceSummary: z.string().optional()
})

export const practicalCardFeedbackSchema = z.object({
  value: z.enum(['helpful', 'not_helpful'])
})

export const getPracticalCardsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional()
})
