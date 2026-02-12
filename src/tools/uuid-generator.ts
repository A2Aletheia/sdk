// ── Result type ──────────────────────────────────────────────────────────────

export interface UUIDResult {
  tool: "uuid_generator";
  uuid: string;
  version: 4;
}

// ── Core function ────────────────────────────────────────────────────────────

export function generateUUID(): UUIDResult {
  return {
    tool: "uuid_generator",
    uuid: crypto.randomUUID(),
    version: 4,
  };
}

// ── Tool definition (OpenAI-compatible / LangChain / Vercel AI SDK) ──────────

export const uuidGeneratorToolDefinition = {
  type: "function" as const,
  function: {
    name: "uuid_generator",
    description:
      "Generate a random UUID v4 identifier. Use this when you need a unique ID for creating resources, correlation IDs, or any scenario requiring a globally unique identifier.",
    parameters: {
      type: "object" as const,
      properties: {} as Record<string, never>,
      required: [] as string[],
      additionalProperties: false as const,
    },
  },
  execute: (_input?: Record<string, never>): UUIDResult => generateUUID(),
};
