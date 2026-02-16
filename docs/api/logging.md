---
layout: default
title: Logging
---

# Logging API

The Logging module provides observability for the Aletheia SDK through a pluggable logger interface and an event emitter for lifecycle events.

---

## Classes

### ConsoleLogger

Default logger that writes to the console with level filtering.

```typescript
import { ConsoleLogger } from '@a2aletheia/sdk';

const logger = new ConsoleLogger("debug");
logger.info("Agent started", { port: 4000 });
// [aletheia:info] Agent started { port: 4000 }
```

#### Constructor

```typescript
constructor(level?: AletheiaLogLevel)
```

**Parameters:**
- `level` - Minimum log level to output (default: `"info"`)

Levels are filtered by priority: `debug` < `info` < `warn` < `error`. Messages below the configured level are silently discarded.

```typescript
// Only warn and error will be logged
const logger = new ConsoleLogger("warn");

logger.debug("This is ignored");
logger.info("This is ignored");
logger.warn("This appears");  // [aletheia:warn] This appears
logger.error("This appears"); // [aletheia:error] This appears
```

#### Methods

##### `debug(message: string, context?: Record<string, unknown>): void`

Logs a debug-level message.

```typescript
logger.debug("Processing request", { requestId: "abc-123", step: "validation" });
```

##### `info(message: string, context?: Record<string, unknown>): void`

Logs an info-level message.

```typescript
logger.info("Agent registered", { did: "did:web:agent.example.com" });
```

##### `warn(message: string, context?: Record<string, unknown>): void`

Logs a warning-level message.

```typescript
logger.warn("Rate limit approaching", { remaining: 10, limit: 100 });
```

##### `error(message: string, context?: Record<string, unknown>): void`

Logs an error-level message.

```typescript
logger.error("Connection failed", { endpoint: "https://api.example.com", error: "ECONNREFUSED" });
```

---

### NoopLogger

Silent logger that discards all output. Use when you want to suppress SDK logging entirely.

```typescript
import { NoopLogger } from '@a2aletheia/sdk';

const logger = new NoopLogger();
logger.info("This is silently ignored");
```

#### Methods

All methods are no-ops (no operation):

##### `debug(message: string, context?: Record<string, unknown>): void`

##### `info(message: string, context?: Record<string, unknown>): void`

##### `warn(message: string, context?: Record<string, unknown>): void`

##### `error(message: string, context?: Record<string, unknown>): void`

---

### EventEmitter

Lightweight event emitter for Aletheia lifecycle events. Supports specific event types and a `"*"` wildcard that receives all events.

```typescript
import { EventEmitter } from '@a2aletheia/sdk';

const emitter = new EventEmitter();
```

#### Constructor

```typescript
constructor()
```

#### Methods

##### `on(event: AletheiaEventType | "*", handler: AletheiaEventHandler): () => void`

Subscribe to an event type. Returns an unsubscribe function.

**Parameters:**
- `event` - The event type to subscribe to, or `"*"` for all events
- `handler` - Callback function invoked when the event is emitted

**Returns:** Unsubscribe function

```typescript
// Listen to specific event
const unsub = emitter.on("agent.start", (event) => {
  console.log("Agent started at", event.timestamp);
});

// Unsubscribe
unsub();
```

##### `emit(event: AletheiaEventType, data?: Record<string, unknown>): void`

Emit an event to all registered handlers (specific + wildcard).

**Parameters:**
- `event` - The event type to emit
- `data` - Optional data payload

```typescript
emitter.emit("agent.start", { port: 4000, name: "MyAgent" });
```

---

## Types

### AletheiaLogger

Pluggable logger interface for the Aletheia SDK. Consumers can implement this interface with pino, winston, bunyan, OpenTelemetry, or any custom logger.

```typescript
interface AletheiaLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

### AletheiaLogLevel

Log level type used for filtering.

```typescript
type AletheiaLogLevel = "debug" | "info" | "warn" | "error";
```

### AletheiaEventType

Lifecycle event types emitted by the SDK.

```typescript
type AletheiaEventType =
  | "agent.start"
  | "agent.stop"
  | "message.received"
  | "message.sent"
  | "message.failed"
  | "trust.verified"
  | "trust.failed"
  | "rating.submitted"
  | "rating.received"
  | "discovery.search"
  | "discovery.connect"
  | "liveness.check"
  | "liveness.result";
```

### AletheiaEvent

Event object passed to handlers.

```typescript
interface AletheiaEvent {
  type: AletheiaEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}
```

### AletheiaEventHandler

Handler function signature for event subscriptions.

```typescript
type AletheiaEventHandler = (event: AletheiaEvent) => void;
```

---

## Event Types Reference

| Event | Description |
|-------|-------------|
| `agent.start` | Agent server started listening |
| `agent.stop` | Agent server stopped |
| `message.received` | Incoming message received from another agent |
| `message.sent` | Message successfully sent to another agent |
| `message.failed` | Message delivery failed |
| `trust.verified` | Agent trust verification succeeded |
| `trust.failed` | Agent trust verification failed |
| `rating.submitted` | Rating submitted for an agent |
| `rating.received` | Rating received from another agent |
| `discovery.search` | Agent discovery search initiated |
| `discovery.connect` | Connection established with discovered agent |
| `liveness.check` | Liveness health check performed |
| `liveness.result` | Liveness check result received |

---

## Examples

### ConsoleLogger with Different Levels

```typescript
import { ConsoleLogger } from '@a2aletheia/sdk';

// Production - only warnings and errors
const prodLogger = new ConsoleLogger("warn");

// Development - everything
const devLogger = new ConsoleLogger("debug");

// Testing - errors only
const testLogger = new ConsoleLogger("error");
```

### NoopLogger Use Cases

```typescript
import { AletheiaAgent, NoopLogger } from '@a2aletheia/sdk/agent';

// Silent agent for testing
const agent = new AletheiaAgent({
  name: "TestAgent",
  version: "1.0.0",
  url: "https://test.example.com",
  logger: new NoopLogger(),
  // ...
});

// Or for production where you have external logging
const prodAgent = new AletheiaAgent({
  name: "ProdAgent",
  version: "1.0.0",
  url: "https://prod.example.com",
  logger: new NoopLogger(), // Using external APM/observability
  // ...
});
```

### EventEmitter with Wildcard Subscription

```typescript
import { EventEmitter } from '@a2aletheia/sdk';

const emitter = new EventEmitter();

// Subscribe to all events for metrics
emitter.on("*", (event) => {
  metrics.increment(`aletheia.events.${event.type}`);
  metrics.histogram("aletheia.event_latency", Date.now() - event.timestamp.getTime());
});

// Subscribe to specific events
emitter.on("message.received", (event) => {
  console.log("From:", event.data?.senderDid);
});

emitter.on("message.failed", (event) => {
  alerting.trigger("message_failure", event.data);
});

// Chain subscriptions with cleanup
const cleanup = [
  emitter.on("agent.start", handleStart),
  emitter.on("agent.stop", handleStop),
  emitter.on("trust.failed", handleTrustFailure),
];

// Unsubscribe all
cleanup.forEach(unsub => unsub());
```

### BYOL - Bring Your Own Logger

Integrate with popular logging libraries:

#### Pino

```typescript
import pino from 'pino';
import type { AletheiaLogger } from '@a2aletheia/sdk';

class PinoLogger implements AletheiaLogger {
  constructor(private readonly logger: pino.Logger) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context ?? {}, message);
  }
}

// Usage
const pinoInstance = pino({ level: 'debug' });
const logger = new PinoLogger(pinoInstance);
```

#### Winston

```typescript
import winston from 'winston';
import type { AletheiaLogger } from '@a2aletheia/sdk';

class WinstonLogger implements AletheiaLogger {
  constructor(private readonly logger: winston.Logger) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(message, context ?? {});
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(message, context ?? {});
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(message, context ?? {});
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(message, context ?? {});
  }
}

// Usage
const winstonInstance = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
const logger = new WinstonLogger(winstonInstance);
```

#### OpenTelemetry

```typescript
import { logs } from '@opentelemetry/api-logs';
import type { AletheiaLogger } from '@a2aletheia/sdk';

class OtelLogger implements AletheiaLogger {
  private readonly logger = logs.getLogger('aletheia-sdk');

  private emit(level: string, message: string, context?: Record<string, unknown>) {
    const record = this.logger.createLogRecord();
    record.setSeverityText(level);
    record.setBody(message);
    if (context) {
      Object.entries(context).forEach(([k, v]) => {
        record.setAttribute(k, v);
      });
    }
    this.logger.emit(record);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit('DEBUG', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit('WARN', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.emit('ERROR', message, context);
  }
}
```

### Integration with AletheiaAgent

```typescript
import { AletheiaAgent, ConsoleLogger, NoopLogger } from '@a2aletheia/sdk/agent';
import { PinoLogger } from './my-loggers'; // Your custom logger

// Option 1: Use default ConsoleLogger with custom level
const agent1 = new AletheiaAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://agent.example.com",
  logLevel: "debug", // ConsoleLogger will use this level
});

// Option 2: Provide a custom logger instance
const agent2 = new AletheiaAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://agent.example.com",
  logger: new PinoLogger(pinoInstance),
});

// Option 3: Silence SDK logging entirely
const agent3 = new AletheiaAgent({
  name: "MyAgent",
  version: "1.0.0",
  url: "https://agent.example.com",
  logger: new NoopLogger(),
});

// Access the logger at runtime
agent.logger.info("Custom log from handler", { taskId: "123" });

// Subscribe to lifecycle events
agent.on("message.received", (event) => {
  agent.logger.info("Processing message", event.data);
});

agent.on("message.failed", (event) => {
  agent.logger.error("Message failed", event.data);
});

// Wildcard subscription for observability
agent.on("*", (event) => {
  // Send to your APM/metrics system
  apm.recordEvent(event.type, event.data);
});
```

---

## Related APIs

- [Agent Hosting](../guides/agent-hosting) - Full agent configuration options
- [Types API](types.md) - Full type definitions
