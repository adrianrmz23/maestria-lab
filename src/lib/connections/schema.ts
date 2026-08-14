export const connectionGraphJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    connections: {
      type: "array",
      minItems: 0,
      maxItems: 14,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sourceModuleId: { type: "string" },
          sourceTopicId: { type: "string" },
          sourceConceptId: { type: "string" },
          targetModuleId: { type: "string" },
          targetTopicId: { type: "string" },
          targetConceptId: { type: "string" },
          relationshipType: { type: "string", enum: ["prerequisite", "analogy", "application", "shared_principle", "contrast", "extension"] },
          title: { type: "string" },
          explanation: { type: "string" },
          bridgeExample: { type: "string" },
          strength: { type: "integer", minimum: 1, maximum: 100 },
        },
        required: ["sourceModuleId", "sourceTopicId", "sourceConceptId", "targetModuleId", "targetTopicId", "targetConceptId", "relationshipType", "title", "explanation", "bridgeExample", "strength"],
      },
    },
  },
  required: ["connections"],
} as const;
