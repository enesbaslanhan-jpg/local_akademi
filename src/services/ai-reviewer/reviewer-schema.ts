import { z } from 'zod'

export const aiReviewerIssueCodeSchema = z.enum([
  'unsupported_claim',
  'source_conflict',
  'overconfident_language',
  'financial_advice',
  'tax_or_legal_specificity',
  'unsafe_action',
  'credential_request',
  'prompt_injection',
  'poor_pedagogy',
  'irrelevant_answer',
])

export const aiReviewerResultSchema = z.object({
  decision: z.enum(['allow', 'allow_with_disclaimer', 'block']),
  issueCodes: z.array(aiReviewerIssueCodeSchema).max(10),
  groundednessScore: z.number().min(0).max(1),
  pedagogicalScore: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.number().int().positive()).max(10),
  requiresHumanReview: z.boolean(),
  safeReasonCode: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
}).strict()

export const aiReviewerResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'decision',
    'issueCodes',
    'groundednessScore',
    'pedagogicalScore',
    'confidence',
    'evidenceIds',
    'requiresHumanReview',
    'safeReasonCode',
  ],
  properties: {
    decision: {
      type: 'string',
      enum: ['allow', 'allow_with_disclaimer', 'block'],
    },
    issueCodes: {
      type: 'array',
      maxItems: 10,
      items: {
        type: 'string',
        enum: aiReviewerIssueCodeSchema.options,
      },
    },
    groundednessScore: { type: 'number', minimum: 0, maximum: 1 },
    pedagogicalScore: { type: 'number', minimum: 0, maximum: 1 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidenceIds: {
      type: 'array',
      maxItems: 10,
      items: { type: 'integer', minimum: 1 },
    },
    requiresHumanReview: { type: 'boolean' },
    safeReasonCode: {
      type: 'string',
      minLength: 1,
      maxLength: 80,
      pattern: '^[a-z0-9_]+$',
    },
  },
} as const
