---
layout: default
title: LLM Tools
---

# LLM Tools

OpenAI-compatible tool definitions and executor functions for LLM agent frameworks.

---

## Tool Collections

### aletheiaToolDefinitions

Array of all 4 tool definitions in OpenAI-compatible format.

```typescript
import { aletheiaToolDefinitions } from "@a2aletheia/sdk";

// Type: readonly ToolDefinition[]
console.log(aletheiaToolDefinitions.length); // 4
```

Each definition follows the OpenAI function calling schema:

```typescript
{
  type: "function",
  function: {
    name: string,
    description: string,
    parameters: JSONSchema
  },
  execute: (input: unknown) => unknown
}
```

### aletheiaToolExecutors

Record mapping tool names to executor functions for routing LLM tool calls.

```typescript
import { aletheiaToolExecutors } from "@a2aletheia/sdk";

// Type: Record<string, (input: any) => unknown>
const result = aletheiaToolExecutors["calculator"]({ expression: "2 + 2" });
// { tool: "calculator", input: "2 + 2", result: 4 }
```

---

## Calculator Tool

Safe math expression evaluator using a recursive descent parser (no `eval`).

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `calculatorToolDefinition` | `ToolDefinition` | OpenAI tool definition object |
| `calculate` | `(expression: string) => CalculatorResult` | Executor function |

### calculate(expression)

Evaluates a mathematical expression and returns the result.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `expression` | `string` | Math expression to evaluate |

**Returns:** `CalculatorResult`

```typescript
import { calculate } from "@a2aletheia/sdk";

calculate("2 + 3 * 4");
// { tool: "calculator", input: "2 + 3 * 4", result: 14 }

calculate("sqrt(144) + 2 ** 10");
// { tool: "calculator", input: "sqrt(144) + 2 ** 10", result: 1036 }

calculate("sin(PI / 2)");
// { tool: "calculator", input: "sin(PI / 2)", result: 1 }
```

### Supported Operations

| Category | Operators/Functions |
|----------|---------------------|
| Arithmetic | `+`, `-`, `*`, `/`, `%` (modulo), `**` (power) |
| Grouping | Parentheses `()`, unary minus |
| Functions | `sqrt`, `abs`, `ceil`, `floor`, `round`, `min`, `max`, `log`, `sin`, `cos`, `tan` |
| Constants | `PI`, `E` |

### Tool Definition Structure

```typescript
calculatorToolDefinition = {
  type: "function",
  function: {
    name: "calculator",
    description: "Evaluate a mathematical expression...",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The mathematical expression to evaluate"
        }
      },
      required: ["expression"]
    }
  },
  execute: calculate
}
```

---

## Current Time Tool

Returns the current time in multiple formats.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `getCurrentTimeToolDefinition` | `ToolDefinition` | OpenAI tool definition object |
| `getCurrentTime` | `() => CurrentTimeResult` | Executor function |

### getCurrentTime()

Returns current time in ISO 8601, Unix timestamp, and UTC string formats.

**Parameters:** None

**Returns:** `CurrentTimeResult`

```typescript
import { getCurrentTime } from "@a2aletheia/sdk";

getCurrentTime();
// {
//   tool: "get_current_time",
//   iso8601: "2025-06-15T10:30:00.000Z",
//   unixTimestamp: 1750000200,
//   unixTimestampMs: 1750000200000,
//   utcString: "Sun, 15 Jun 2025 10:30:00 GMT"
// }
```

### Tool Definition Structure

```typescript
getCurrentTimeToolDefinition = {
  type: "function",
  function: {
    name: "get_current_time",
    description: "Get the current time in multiple formats...",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  execute: getCurrentTime
}
```

---

## Unit Conversion Tool

Convert between units within the same category.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `convertUnitsToolDefinition` | `ToolDefinition` | OpenAI tool definition object |
| `convertUnits` | `(value: string, from: SupportedUnit, to: SupportedUnit) => UnitConversionResult` | Executor function |

### convertUnits(value, from, to)

Convert a value from one unit to another within the same category.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `value` | `string` | Numeric value as string (required for crypto precision) |
| `from` | `SupportedUnit` | Source unit |
| `to` | `SupportedUnit` | Target unit |

**Returns:** `UnitConversionResult`

```typescript
import { convertUnits } from "@a2aletheia/sdk";

// Crypto conversion (bigint precision)
convertUnits("1.5", "ether", "wei");
// {
//   tool: "convert_units",
//   result: "1500000000000000000",
//   from: "ether",
//   to: "wei",
//   category: "crypto"
// }

// Time conversion
convertUnits("3600", "seconds", "hours");
// { tool: "convert_units", result: "1", from: "seconds", to: "hours", category: "time" }

// Data conversion
convertUnits("1024", "MB", "GB");
// { tool: "convert_units", result: "1", from: "MB", to: "GB", category: "data" }
```

### Supported Units by Category

| Category | Units | Notes |
|----------|-------|-------|
| `crypto` | `wei`, `gwei`, `ether` | Uses bigint precision internally |
| `time` | `seconds`, `minutes`, `hours`, `days` | Standard time units |
| `data` | `bytes`, `KB`, `MB`, `GB`, `TB` | Binary (1024-based) |

> **Note:** The `value` parameter is always a string to preserve precision for crypto conversions.

### Tool Definition Structure

```typescript
convertUnitsToolDefinition = {
  type: "function",
  function: {
    name: "convert_units",
    description: "Convert a value from one unit to another...",
    parameters: {
      type: "object",
      properties: {
        value: { type: "string", description: "Numeric value to convert" },
        from: { 
          type: "string", 
          enum: ["wei", "gwei", "ether", "seconds", "minutes", "hours", "days", "bytes", "KB", "MB", "GB", "TB"]
        },
        to: { 
          type: "string",
          enum: ["wei", "gwei", "ether", "seconds", "minutes", "hours", "days", "bytes", "KB", "MB", "GB", "TB"]
        }
      },
      required: ["value", "from", "to"]
    }
  },
  execute: (args) => convertUnits(args.value, args.from, args.to)
}
```

---

## UUID Generator Tool

Generate random UUID v4 values.

### Exports

| Export | Type | Description |
|--------|------|-------------|
| `uuidGeneratorToolDefinition` | `ToolDefinition` | OpenAI tool definition object |
| `generateUUID` | `() => UUIDResult` | Executor function |

### generateUUID()

Generates a random UUID version 4 using `crypto.randomUUID()`.

**Parameters:** None

**Returns:** `UUIDResult`

```typescript
import { generateUUID } from "@a2aletheia/sdk";

generateUUID();
// {
//   tool: "uuid_generator",
//   uuid: "550e8400-e29b-41d4-a716-446655440000",
//   version: 4
// }
```

### Tool Definition Structure

```typescript
uuidGeneratorToolDefinition = {
  type: "function",
  function: {
    name: "uuid_generator",
    description: "Generate a random UUID v4...",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  execute: generateUUID
}
```

---

## Types

### CalculatorInput

```typescript
type CalculatorInput = {
  expression: string;
};
```

### CalculatorResult

```typescript
type CalculatorResult = {
  tool: "calculator";
  input: string;
  result: number;
};
```

### CurrentTimeResult

```typescript
type CurrentTimeResult = {
  tool: "get_current_time";
  iso8601: string;
  unixTimestamp: number;
  unixTimestampMs: number;
  utcString: string;
};
```

### CryptoUnit

```typescript
type CryptoUnit = "wei" | "gwei" | "ether";
```

### TimeUnit

```typescript
type TimeUnit = "seconds" | "minutes" | "hours" | "days";
```

### DataUnit

```typescript
type DataUnit = "bytes" | "KB" | "MB" | "GB" | "TB";
```

### SupportedUnit

```typescript
type SupportedUnit = CryptoUnit | TimeUnit | DataUnit;
```

### UnitCategory

```typescript
type UnitCategory = "crypto" | "time" | "data";
```

### UnitConversionInput

```typescript
type UnitConversionInput = {
  value: string;
  from: SupportedUnit;
  to: SupportedUnit;
};
```

### UnitConversionResult

```typescript
type UnitConversionResult = {
  tool: "convert_units";
  result: string;
  from: string;
  to: string;
  category: UnitCategory;
};
```

### UUIDResult

```typescript
type UUIDResult = {
  tool: "uuid_generator";
  uuid: string;
  version: 4;
};
```

---

## Integration Examples

### OpenAI Function Calling

```typescript
import OpenAI from "openai";
import {
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "What is 15% of 847?" }],
  tools: aletheiaToolDefinitions.map((t) => ({
    type: t.type,
    function: t.function,
  })),
});

const toolCall = response.choices[0].message.tool_calls?.[0];
if (toolCall) {
  const result = aletheiaToolExecutors[toolCall.function.name](
    JSON.parse(toolCall.function.arguments)
  );
  console.log(result);
  // { tool: "calculator", input: "15% of 847", result: 127.05 }
}
```

### Vercel AI SDK

```typescript
import { generateText } from "ai";
import {
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

const tools = Object.fromEntries(
  aletheiaToolDefinitions.map((def) => [
    def.function.name,
    {
      description: def.function.description,
      parameters: def.function.parameters,
      execute: async (args) => aletheiaToolExecutors[def.function.name](args),
    },
  ])
);

const { text, toolResults } = await generateText({
  model: openai("gpt-4"),
  tools,
  prompt: "Convert 2 ether to gwei",
});
```

### LangChain

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

const tools = aletheiaToolDefinitions.map(
  (def) =>
    new DynamicStructuredTool({
      name: def.function.name,
      description: def.function.description,
      schema: def.function.parameters,
      func: async (args) =>
        JSON.stringify(aletheiaToolExecutors[def.function.name](args)),
    })
);

const model = new ChatOpenAI({ model: "gpt-4" }).bind({ tools });
```

---

## Individual Function Usage

Import executor functions directly for standalone use:

```typescript
import {
  calculate,
  getCurrentTime,
  convertUnits,
  generateUUID,
} from "@a2aletheia/sdk";

// Calculator
const calc = calculate("sqrt(81) * 2");
// { tool: "calculator", input: "sqrt(81) * 2", result: 18 }

// Current time
const time = getCurrentTime();
// { tool: "get_current_time", iso8601: "...", unixTimestamp: ..., ... }

// Unit conversion
const conversion = convertUnits("1000000000", "gwei", "ether");
// { tool: "convert_units", result: "1", from: "gwei", to: "ether", category: "crypto" }

// UUID generation
const uuid = generateUUID();
// { tool: "uuid_generator", uuid: "...", version: 4 }
```