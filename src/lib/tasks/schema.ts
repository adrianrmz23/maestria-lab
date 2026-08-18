const sourceRef = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "label", "unitIndex", "pageNumber", "url"],
  properties: {
    kind: { type: "string", enum: ["document", "manifest", "note", "web"] },
    label: { type: "string" },
    unitIndex: { type: ["integer", "null"] },
    pageNumber: { type: ["integer", "null"] },
    url: { type: ["string", "null"] },
  },
} as const;

export const taskRequirementsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["inferredTitle", "taskType", "theme", "objective", "length", "format", "citationStyle", "structure", "requiredElements", "constraints", "dueDate", "ambiguities"],
  properties: {
    inferredTitle: { type: "string" },
    taskType: { type: "string", enum: ["concept_map", "synoptic", "summary", "essay", "report", "research", "infographic", "presentation", "questions", "custom"] },
    theme: { type: "string" },
    objective: { type: "string" },
    length: { type: "string" },
    format: { type: "string" },
    citationStyle: { type: "string" },
    structure: { type: "array", items: { type: "string" }, maxItems: 16 },
    requiredElements: { type: "array", items: { type: "string" }, maxItems: 24 },
    constraints: { type: "array", items: { type: "string" }, maxItems: 24 },
    dueDate: { type: ["string", "null"] },
    ambiguities: { type: "array", items: { type: "string" }, maxItems: 12 },
  },
} as const;

export const taskOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "taskType", "title", "subtitle", "introduction", "sections", "conclusion", "bibliography", "visual", "studyTakeaways", "submissionChecklist"],
  properties: {
    schemaVersion: { type: "string", enum: ["1.0"] },
    taskType: { type: "string", enum: ["concept_map", "synoptic", "summary", "essay", "report", "research", "infographic", "presentation", "questions", "custom"] },
    title: { type: "string" },
    subtitle: { type: "string" },
    introduction: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "heading", "body", "sourceRefs"],
        properties: {
          id: { type: "string" },
          heading: { type: "string" },
          body: { type: "string" },
          sourceRefs: { type: "array", items: sourceRef, maxItems: 12 },
        },
      },
    },
    conclusion: { type: "string" },
    bibliography: { type: "array", items: sourceRef, maxItems: 40 },
    visual: {
      type: "object",
      additionalProperties: false,
      required: ["enabled", "type", "orientation", "nodes", "edges"],
      properties: {
        enabled: { type: "boolean" },
        type: { type: "string", enum: ["concept_map", "synoptic", "infographic", "none"] },
        orientation: { type: "string", enum: ["horizontal", "vertical"] },
        nodes: {
          type: "array",
          maxItems: 40,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "label", "detail", "level", "parentId"],
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              detail: { type: "string" },
              level: { type: "integer", minimum: 0, maximum: 8 },
              parentId: { type: ["string", "null"] },
            },
          },
        },
        edges: {
          type: "array",
          maxItems: 60,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["source", "target", "label"],
            properties: {
              source: { type: "string" },
              target: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
    },
    studyTakeaways: { type: "array", items: { type: "string" }, maxItems: 12 },
    submissionChecklist: { type: "array", items: { type: "string" }, maxItems: 16 },
  },
} as const;

export const taskReviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "verdict", "rubricItems", "strengths", "improvements", "unsupportedClaims", "revisionInstructions"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    verdict: { type: "string" },
    rubricItems: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["criterion", "score", "maxScore", "feedback"],
        properties: {
          criterion: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          maxScore: { type: "integer", minimum: 1, maximum: 100 },
          feedback: { type: "string" },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" }, maxItems: 12 },
    improvements: { type: "array", items: { type: "string" }, maxItems: 12 },
    unsupportedClaims: { type: "array", items: { type: "string" }, maxItems: 20 },
    revisionInstructions: { type: "array", items: { type: "string" }, maxItems: 12 },
  },
} as const;
