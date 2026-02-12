// ── Result type ──────────────────────────────────────────────────────────────

export interface CurrentTimeResult {
  tool: "get_current_time";
  iso8601: string;
  unixTimestamp: number;
  unixTimestampMs: number;
  utcString: string;
}

// ── Core function ────────────────────────────────────────────────────────────

export function getCurrentTime(): CurrentTimeResult {
  const now = new Date();
  return {
    tool: "get_current_time",
    iso8601: now.toISOString(),
    unixTimestamp: Math.floor(now.getTime() / 1000),
    unixTimestampMs: now.getTime(),
    utcString: now.toUTCString(),
  };
}

// ── Tool definition (OpenAI-compatible / LangChain / Vercel AI SDK) ──────────

export const getCurrentTimeToolDefinition = {
  type: "function" as const,
  function: {
    name: "get_current_time",
    description:
      "Get the current date and time in multiple formats: ISO 8601, Unix timestamp (seconds), Unix timestamp (milliseconds), and UTC string. Use this when you need the current time for scheduling, logging, timestamps, or time-based calculations.",
    parameters: {
      type: "object" as const,
      properties: {} as Record<string, never>,
      required: [] as string[],
      additionalProperties: false as const,
    },
  },
  execute: (_input?: Record<string, never>): CurrentTimeResult =>
    getCurrentTime(),
};
