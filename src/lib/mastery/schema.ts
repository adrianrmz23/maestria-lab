const sourceRef = {
  type: "object",
  additionalProperties: false,
  required: ["unitIndex", "pageNumber", "label"],
  properties: {
    unitIndex: { type: "integer", minimum: 1 },
    pageNumber: { anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }] },
    label: { type: "string" },
  },
} as const;

export const examJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "title", "instructions", "mode", "questions"],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    title: { type: "string" },
    instructions: { type: "string" },
    mode: { type: "string", enum: ["quick", "review", "full", "reinforcement"] },
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "topicId", "topicTitle", "conceptId", "conceptTitle", "difficulty", "type", "prompt", "options", "correctAnswer", "acceptedAnswers", "explanation", "sourceRefs"],
        properties: {
          id: { type: "string" },
          topicId: { type: "string" },
          topicTitle: { type: "string" },
          conceptId: { type: "string" },
          conceptTitle: { type: "string" },
          difficulty: { type: "integer", enum: [1, 2, 3] },
          type: { type: "string", enum: ["multiple_choice", "true_false", "short_answer", "code_prediction"] },
          prompt: { type: "string" },
          options: { type: "array", maxItems: 6, items: { type: "string" } },
          correctAnswer: { type: "string" },
          acceptedAnswers: { type: "array", maxItems: 8, items: { type: "string" } },
          explanation: { type: "string" },
          sourceRefs: { type: "array", minItems: 1, maxItems: 8, items: sourceRef },
        },
      },
    },
  },
} as const;
