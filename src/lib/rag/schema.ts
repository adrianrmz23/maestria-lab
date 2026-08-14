export const tutorAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    answer: { type: "string" },
    keyPoints: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    checkQuestion: { anyOf: [{ type: "string" }, { type: "null" }] },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          chunkId: { type: "integer" },
          unitIndex: { type: "integer" },
          pageNumber: { anyOf: [{ type: "integer" }, { type: "null" }] },
          label: { type: "string" },
          note: { type: "string" },
        },
        required: ["chunkId", "unitIndex", "pageNumber", "label", "note"],
      },
      minItems: 0,
      maxItems: 6,
    },
  },
  required: ["title", "answer", "keyPoints", "checkQuestion", "citations"],
} as const;
