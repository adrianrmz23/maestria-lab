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

export const conceptExperienceJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "topicId", "conceptId", "conceptTitle", "studyNote", "lab", "exercises"],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    topicId: { type: "string" },
    conceptId: { type: "string" },
    conceptTitle: { type: "string" },
    studyNote: { type: "string" },
    lab: {
      type: "object",
      additionalProperties: false,
      required: ["type", "title", "objective", "instructions", "difficulty", "expression", "propositions", "operator", "matchingPairs", "sequenceItems", "codeSnippet", "codeQuestion", "codeOptions", "codeAnswerIndex", "sourceRefs"],
      properties: {
        type: { type: "string", enum: ["logic_switch", "truth_table", "matching", "sequence", "code_prediction"] },
        title: { type: "string" },
        objective: { type: "string" },
        instructions: { type: "string" },
        difficulty: { type: "integer", enum: [1, 2, 3] },
        expression: { anyOf: [{ type: "string" }, { type: "null" }] },
        propositions: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "description"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        operator: { anyOf: [{ type: "string", enum: ["and", "or", "implies", "xor", "not"] }, { type: "null" }] },
        matchingPairs: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "left", "right"],
            properties: {
              id: { type: "string" },
              left: { type: "string" },
              right: { type: "string" },
            },
          },
        },
        sequenceItems: {
          type: "array",
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "order"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              order: { type: "integer", minimum: 1 },
            },
          },
        },
        codeSnippet: { anyOf: [{ type: "string" }, { type: "null" }] },
        codeQuestion: { anyOf: [{ type: "string" }, { type: "null" }] },
        codeOptions: { type: "array", maxItems: 6, items: { type: "string" } },
        codeAnswerIndex: { anyOf: [{ type: "integer", minimum: 0, maximum: 5 }, { type: "null" }] },
        sourceRefs: { type: "array", minItems: 1, maxItems: 10, items: { $ref: "#/$defs/sourceRef" } },
      },
    },
    exercises: {
      type: "array",
      minItems: 6,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "level", "type", "prompt", "options", "correctAnswer", "acceptedAnswers", "hint", "explanation", "sourceRefs"],
        properties: {
          id: { type: "string" },
          level: { type: "integer", enum: [1, 2, 3] },
          type: { type: "string", enum: ["multiple_choice", "true_false", "short_answer", "code_prediction"] },
          prompt: { type: "string" },
          options: { type: "array", maxItems: 6, items: { type: "string" } },
          correctAnswer: { type: "string" },
          acceptedAnswers: { type: "array", maxItems: 8, items: { type: "string" } },
          hint: { type: "string" },
          explanation: { type: "string" },
          sourceRefs: { type: "array", minItems: 1, maxItems: 8, items: { $ref: "#/$defs/sourceRef" } },
        },
      },
    },
  },
  $defs: { sourceRef },
} as const;

export const practiceEvaluationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["correct", "score", "feedback", "misconception", "sourceRefs"],
  properties: {
    correct: { type: "boolean" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    feedback: { type: "string" },
    misconception: { anyOf: [{ type: "string" }, { type: "null" }] },
    sourceRefs: { type: "array", maxItems: 8, items: sourceRef },
  },
} as const;

export const studyAssistantJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "answer", "takeaways", "code", "challenge", "sourceRefs"],
  properties: {
    title: { type: "string" },
    answer: { type: "string" },
    takeaways: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    code: { anyOf: [{ type: "string" }, { type: "null" }] },
    challenge: { anyOf: [{ type: "string" }, { type: "null" }] },
    sourceRefs: { type: "array", maxItems: 8, items: sourceRef },
  },
} as const;
