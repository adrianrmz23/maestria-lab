export const readerAnnotationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    phrase: { type: "string" },
    kind: { type: "string", enum: ["concept", "example", "warning", "formula", "context"] },
    title: { type: "string" },
    explanation: { type: "string" },
    example: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["phrase", "kind", "title", "explanation", "example"],
} as const;
