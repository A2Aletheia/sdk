export { AletheiaClient, type AletheiaClientConfig } from "./client.js";
export { ALETHEIA_DEFAULTS, resolveApiUrl } from "./defaults.js";
export { DIDResolver } from "./identity/did-resolver.js";
export { ManifestFetcher } from "./identity/manifest-fetcher.js";
export {
  generateAgentKeyPair,
  signAgentMessage,
  verifyAgentSignature,
  verifyAgentMessageWithDID,
  type AgentKeyPair,
  type SignedMessage,
} from "./identity/agent-signer.js";
export { RatingClient } from "./reputation/rating-client.js";
export { solvePoWChallenge } from "./reputation/pow-solver.js";
export { AuditClient } from "./security/audit-client.js";
export {
  signRatingPayload,
  verifyRatingSignature,
  hashRatingPayload,
  type SignedPayload,
  type RatingPayloadMessage,
} from "./utils/signing.js";
export { HttpClient } from "./utils/http.js";

// Logger — BYOL (Bring Your Own Logger)
export { ConsoleLogger, NoopLogger, EventEmitter } from "./logger/index.js";

// Tools — LangChain / Vercel AI SDK / OpenAI-compatible tool definitions
export {
  // Individual tools
  calculate,
  calculatorToolDefinition,
  getCurrentTime,
  getCurrentTimeToolDefinition,
  convertUnits,
  convertUnitsToolDefinition,
  generateUUID,
  uuidGeneratorToolDefinition,
  // Convenience collections
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
  // Types
  type CalculatorInput,
  type CalculatorResult,
  type CurrentTimeResult,
  type CryptoUnit,
  type TimeUnit,
  type DataUnit,
  type SupportedUnit,
  type UnitCategory,
  type UnitConversionInput,
  type UnitConversionResult,
  type UUIDResult,
} from "./tools/index.js";

// Types — re-exported from inlined @a2aletheia/types
export * from "./types/index.js";

// NOTE: Agent hosting exports are available via "@a2aletheia/sdk/agent"
// This keeps the main export browser-safe (no Node.js dependencies)
