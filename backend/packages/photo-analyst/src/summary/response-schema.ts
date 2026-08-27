/** JSON Schema handed to the Summary Agent via output_config.format. */
export const SUMMARY_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline',
    'overallAssessment',
    'overallCondition',
    'topConcernIds',
    'topPositiveIds',
    'corroboration',
  ],
  properties: {
    headline: { type: 'string' },
    overallAssessment: { type: 'string' },
    overallCondition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
    topConcernIds: { type: 'array', items: { type: 'string' } },
    topPositiveIds: { type: 'array', items: { type: 'string' } },
    corroboration: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['finding', 'permitContext', 'effect'],
        properties: {
          finding: { type: 'string' },
          permitContext: { type: 'string' },
          effect: { type: 'string', enum: ['confirmed', 'contradicted', 'context_only'] },
        },
      },
    },
  },
} as const;
