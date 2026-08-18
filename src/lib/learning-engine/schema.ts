export const recallEvaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "feedback", "missingIdeas", "misconception"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    feedback: { type: "string" },
    missingIdeas: { type: "array", maxItems: 6, items: { type: "string" } },
    misconception: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;

export const capstoneProjectSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "title", "scenario", "objective", "deliverables", "constraints", "rubric", "starterPrompt"],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    title: { type: "string" },
    scenario: { type: "string" },
    objective: { type: "string" },
    deliverables: { type: "array", minItems: 3, maxItems: 7, items: { type: "string" } },
    constraints: { type: "array", minItems: 2, maxItems: 7, items: { type: "string" } },
    rubric: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterion", "weight", "description"],
        properties: {
          criterion: { type: "string" },
          weight: { type: "integer", minimum: 5, maximum: 60 },
          description: { type: "string" },
        },
      },
    },
    starterPrompt: { type: "string" },
  },
} as const;

export const capstoneEvaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "verdict", "strengths", "improvements", "nextStep"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string" },
    strengths: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
    improvements: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
    nextStep: { type: "string" },
  },
} as const;
