---
layout: default
title: LLM Agent Tools
---

# LLM Agent Tools

The SDK ships four deterministic utility tools that LLM agents commonly need. Each tool is exported as an OpenAI-compatible tool definition, making them directly usable with OpenAI, LangChain, Vercel AI SDK, CrewAI, or any function-calling compatible framework.

---

## Quick Start

### Plug Into Your Agent Framework

```typescript
import {
  aletheiaToolDefinitions,
  aletheiaToolExecutors,
} from "@a2aletheia/sdk";

// Pass definitions to your LLM
const response = await openai.chat.completions.create({
  model: "gpt-4",
  tools: aletheiaToolDefinitions.map((t) => ({
    type: t.type,
    function: t.function,
  })),
  messages,
});

// Route tool calls to the matching executor
for (const call of response.choices[0].message.tool_calls ?? []) {
  const result = aletheiaToolExecutors[call.function.name]?.(
    JSON.parse(call.function.arguments)
  );
  console.log(result);
}
```

---

## Available Tools

| Tool Definition | Tool Name | Description |
|----------------|-----------|-------------|
| `calculatorToolDefinition` | `calculator` | Safe math expression evaluator |
| `getCurrentTimeToolDefinition` | `get_current_time` | Current time in multiple formats |
| `convertUnitsToolDefinition` | `convert_units` | Unit conversion across categories |
| `uuidGeneratorToolDefinition` | `uuid_generator` | Random UUID v4 generator |

---

## Calculator

Safe math expression evaluator using a recursive descent parser (no `eval`).

### Supported Operations

| Category | Items |
|----------|-------|
| **Operators** | `+`, `-`, `*`, `/`, `%` (modulo), `**` (power) |
| **Grouping** | Parentheses `()`, unary minus |
| **Functions** | `sqrt`, `abs`, `ceil`, `floor`, `round`, `min`, `max`, `log`, `sin`, `cos`, `tan` |
| **Constants** | `PI`, `E` |

### Usage

```typescript
import { calculate } from "@a2aletheia/sdk";

calculate("2 + 3 * 4");
// { tool: "calculator", input: "2 + 3 * 4", result: 14 }

calculate("sqrt(144) + 2 ** 10");
// { tool: "calculator", input: "sqrt(144) + 2 ** 10", result: 1036 }

calculate("min(10, 20, 5)");
// { tool: "calculator", input: "min(10, 20, 5)", result: 5 }

calculate("sin(PI / 2)");
// { tool: "calculator", input: "sin(PI / 2)", result: 1 }
```

### Tool Definition

```typescript
import { calculatorToolDefinition } from "@a2aletheia/sdk";

// {
//   type: "function",
//   function: {
//     name: "calculator",
//     description: "...",
//     parameters: {
//       type: "object",
//       properties: {
//         expression: { type: "string", description: "..." }
//       },
//       required: ["expression"]
//     }
//   }
// }
```

---

## Get Current Time

Returns the current time in multiple formats.

### Usage

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

No parameters required.

---

## Convert Units

Convert between units in the same category.

### Supported Categories

| Category | Units | Notes |
|----------|-------|-------|
| **Crypto** | `wei`, `gwei`, `ether` | Bigint precision via `viem` |
| **Time** | `seconds`, `minutes`, `hours`, `days` | |
| **Data** | `bytes`, `KB`, `MB`, `GB`, `TB` | |

### Usage

```typescript
import { convertUnits } from "@a2aletheia/sdk";

convertUnits("1.5", "ether", "wei");
// {
//   tool: "convert_units",
//   result: "1500000000000000000",
//   from: "ether",
//   to: "wei",
//   category: "crypto"
// }

convertUnits("3600", "seconds", "hours");
// { tool: "convert_units", result: "1", from: "seconds", to: "hours", category: "time" }

convertUnits("1024", "MB", "GB");
// { tool: "convert_units", result: "1", from: "MB", to: "GB", category: "data" }
```

> **Important:** The `value` parameter is always a string. Crypto conversions use bigint internally for precision.

---

## UUID Generator

Generates a random UUID v4 via `crypto.randomUUID()`.

### Usage

```typescript
import { generateUUID } from "@a2aletheia/sdk";

generateUUID();
// {
//   tool: "uuid_generator",
//   uuid: "550e8400-e29b-41d4-a716-446655440000",
//   version: 4
// }
```

No parameters required.

---

## Using Individual Executors

Each tool exports its executor function separately:

```typescript
import {
  calculate,
  getCurrentTime,
  convertUnits,
  generateUUID,
} from "@a2aletheia/sdk";
```

## Using the Collections

For framework integration, use the collection exports:

```typescript
import {
  aletheiaToolDefinitions,  // Array of all tool definitions
  aletheiaToolExecutors,     // Record<string, executor function>
} from "@a2aletheia/sdk";

// aletheiaToolDefinitions is an array of OpenAI-format tool definitions
// aletheiaToolExecutors maps tool names to their execute functions:
// {
//   "calculator": (args) => ...,
//   "get_current_time": (args) => ...,
//   "convert_units": (args) => ...,
//   "uuid_generator": (args) => ...
// }
```

---

## Framework Integration Examples

### Vercel AI SDK

```typescript
import { aletheiaToolDefinitions, aletheiaToolExecutors } from "@a2aletheia/sdk";

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
```

### LangChain

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { aletheiaToolDefinitions, aletheiaToolExecutors } from "@a2aletheia/sdk";

const tools = aletheiaToolDefinitions.map(
  (def) =>
    new DynamicStructuredTool({
      name: def.function.name,
      description: def.function.description,
      schema: def.function.parameters, // Zod or JSON Schema
      func: async (args) => JSON.stringify(aletheiaToolExecutors[def.function.name](args)),
    })
);
```

---

## Next Steps

- [Agent Hosting](agent-hosting) -- Build an agent that uses these tools
- [Getting Started](getting-started) -- Back to basics
