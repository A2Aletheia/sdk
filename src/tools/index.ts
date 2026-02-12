// ── Individual tool exports ──────────────────────────────────────────────────

export {
  calculate,
  calculatorToolDefinition,
  type CalculatorInput,
  type CalculatorResult,
} from "./calculator.js";

export {
  getCurrentTime,
  getCurrentTimeToolDefinition,
  type CurrentTimeResult,
} from "./get-current-time.js";

export {
  convertUnits,
  convertUnitsToolDefinition,
  type CryptoUnit,
  type TimeUnit,
  type DataUnit,
  type SupportedUnit,
  type UnitCategory,
  type UnitConversionInput,
  type UnitConversionResult,
} from "./convert-units.js";

export {
  generateUUID,
  uuidGeneratorToolDefinition,
  type UUIDResult,
} from "./uuid-generator.js";

// ── Convenience: all tool definitions as an array ────────────────────────────
//
// Usage with LangChain:
//   import { aletheiaToolDefinitions } from "@a2aletheia/sdk";
//   const tools = aletheiaToolDefinitions; // pass to ChatOpenAI.bind({ tools })
//
// Usage with Vercel AI SDK:
//   import { aletheiaToolDefinitions } from "@a2aletheia/sdk";
//   const result = await generateText({ tools: aletheiaToolDefinitions, ... });
//
// Usage with OpenAI function calling:
//   import { aletheiaToolDefinitions } from "@a2aletheia/sdk";
//   const response = await openai.chat.completions.create({
//     tools: aletheiaToolDefinitions.map(t => ({ type: t.type, function: t.function })),
//     ...
//   });
//   // Then route tool calls to the matching definition's .execute()

import { calculatorToolDefinition } from "./calculator.js";
import { getCurrentTimeToolDefinition } from "./get-current-time.js";
import { convertUnitsToolDefinition } from "./convert-units.js";
import { uuidGeneratorToolDefinition } from "./uuid-generator.js";

export const aletheiaToolDefinitions = [
  calculatorToolDefinition,
  getCurrentTimeToolDefinition,
  convertUnitsToolDefinition,
  uuidGeneratorToolDefinition,
] as const;

/** Map of tool name → execute function, for routing tool calls from LLM responses. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const aletheiaToolExecutors: Record<string, (input: any) => unknown> = {
  [calculatorToolDefinition.function.name]: calculatorToolDefinition.execute,
  [getCurrentTimeToolDefinition.function.name]:
    getCurrentTimeToolDefinition.execute,
  [convertUnitsToolDefinition.function.name]:
    convertUnitsToolDefinition.execute,
  [uuidGeneratorToolDefinition.function.name]:
    uuidGeneratorToolDefinition.execute,
};
