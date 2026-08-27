/**
 * JSON Schema handed to the model via `output_config.format`.
 *
 * Deliberately a plain schema object rather than a generated one: the SDK's Zod
 * helper tracks a different Zod major than this workspace uses, and the response
 * is validated against AgentCategoryResponseSchema on the way back regardless.
 * Keep it aligned with schemas/property-insights-result.json.
 */
export const AGENT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rating', 'confidence', 'summary', 'insights'],
  properties: {
    rating: {
      type: 'string',
      enum: ['excellent', 'good', 'fair', 'poor', 'not_visible'],
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    summary: { type: 'string' },
    insights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'severity', 'confidence', 'evidence'],
        properties: {
          title: { type: 'string', maxLength: 80 },
          description: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['critical', 'warning', 'info', 'good'],
          },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          costEstimate: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['low', 'high', 'unit'],
            properties: {
              low: { type: 'number' },
              high: { type: 'number' },
              unit: {
                type: 'string',
                enum: ['total', 'per_sq_ft', 'per_linear_ft', 'per_unit', 'per_opening'],
              },
              quantity: { type: ['number', 'null'] },
              currency: { type: 'string' },
              basis: { type: 'string' },
            },
          },
          recommendedAction: { type: 'string' },
          evidence: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['photoId', 'observed'],
              properties: {
                photoId: { type: 'string' },
                photoUrl: { type: 'string' },
                observed: { type: 'string' },
                inference: { type: 'string' },
                region: {
                  type: ['object', 'null'],
                  additionalProperties: false,
                  required: ['x', 'y', 'width', 'height'],
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
