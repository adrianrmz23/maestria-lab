export const audioSummaryScriptSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "script", "topicsCovered"],
  properties: {
    title: { type: "string" },
    script: { type: "string" },
    topicsCovered: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 30,
    },
  },
} as const;
