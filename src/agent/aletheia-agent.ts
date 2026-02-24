import type { AgentCard } from "@a2a-js/sdk";
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  JsonRpcTransportHandler,
  type TaskStore,
  type A2ARequestHandler,
} from "@a2a-js/sdk/server";
import { A2AExpressApp } from "@a2a-js/sdk/server/express";
import type { A2AResponse } from "@a2a-js/sdk";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import type {
  AletheiaLogger,
  AletheiaEventType,
  AletheiaEventHandler,
  DIDDocument,
} from "../types/index.js";
import type {
  AletheiaAgentConfig,
  AgentHandler,
  CancelHandler,
} from "./types.js";
import { DelegatingAgentExecutor } from "./agent-executor.js";
import { ConsoleLogger } from "../logger/console-logger.js";
import { EventEmitter } from "../logger/event-emitter.js";

const DEFAULT_PROTOCOL_VERSION = "0.3.10";
const A2A_PROTOCOL_VERSION = resolveA2ASdkVersion();

function resolveA2ASdkVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const sdkEntryPath = require.resolve("@a2a-js/sdk");
    const sdkPackageJsonPath = join(
      dirname(sdkEntryPath),
      "..",
      "package.json",
    );
    const sdkPackageJson = JSON.parse(
      readFileSync(sdkPackageJsonPath, "utf8"),
    ) as { version?: string };

    return sdkPackageJson.version || DEFAULT_PROTOCOL_VERSION;
  } catch {
    return DEFAULT_PROTOCOL_VERSION;
  }
}

/**
 * AletheiaAgent provides a high-level API for building A2A-compliant agents
 * with Aletheia trust layer integration.
 *
 * @example
 * ```typescript
 * import { AletheiaAgent } from "@a2aletheia/sdk";
 *
 * const agent = new AletheiaAgent({
 *   name: "Translator",
 *   version: "1.0.0",
 *   url: "https://translate.example.com",
 *   description: "Translates text between languages",
 *   skills: [{
 *     id: "translate",
 *     name: "translate-text",
 *     description: "Translate text to another language",
 *     tags: ["translation", "nlp"],
 *   }],
 * });
 *
 * agent.handle(async (context, response) => {
 *   const text = context.textContent;
 *   response.text(`Translated: ${text}`);
 * });
 *
 * await agent.start(4000);
 * ```
 */
export class AletheiaAgent {
  private readonly config: AletheiaAgentConfig;
  private readonly agentCard: AgentCard;
  private readonly taskStore: TaskStore;
  private readonly requestHandler: A2ARequestHandler;
  private readonly jsonRpcHandler: JsonRpcTransportHandler;
  private readonly executor: DelegatingAgentExecutor;

  readonly logger: AletheiaLogger;
  readonly events: EventEmitter;

  private messageHandler?: AgentHandler;
  private cancelHandler?: CancelHandler;
  private server?: { close: () => void };

  constructor(config: AletheiaAgentConfig) {
    this.config = config;
    this.logger = config.logger ?? new ConsoleLogger(config.logLevel ?? "info");
    this.events = new EventEmitter();
    this.agentCard = this.buildAgentCard(config);
    this.taskStore = config.taskStore ?? new InMemoryTaskStore();

    this.executor = new DelegatingAgentExecutor(
      () => this.messageHandler,
      () => this.cancelHandler,
      this.logger,
      this.events,
    );

    this.requestHandler = new DefaultRequestHandler(
      this.agentCard,
      this.taskStore,
      this.executor,
    );

    this.jsonRpcHandler = new JsonRpcTransportHandler(this.requestHandler);
  }

  // ---------------------------------------------------------------------------
  // Handler registration
  // ---------------------------------------------------------------------------

  /**
   * Register the message handler for incoming requests.
   */
  handle(handler: AgentHandler): this {
    this.messageHandler = handler;
    return this;
  }

  /**
   * Register an optional cancel handler.
   */
  onCancel(handler: CancelHandler): this {
    this.cancelHandler = handler;
    return this;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle event hooks
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to lifecycle events. Returns an unsubscribe function.
   *
   * @example
   * ```typescript
   * agent.on("message.received", (event) => {
   *   console.log("Received message", event.data);
   * });
   *
   * // Wildcard — receive all events
   * agent.on("*", (event) => {
   *   metrics.increment(`aletheia.${event.type}`);
   * });
   * ```
   */
  on(
    event: AletheiaEventType | "*",
    handler: AletheiaEventHandler,
  ): () => void {
    return this.events.on(event, handler);
  }

  // ---------------------------------------------------------------------------
  // Framework-agnostic request handling
  // ---------------------------------------------------------------------------

  /**
   * Handle a JSON-RPC request body (framework-agnostic).
   * Use this for Hono, Fastify, or other frameworks.
   *
   * @param body - The parsed JSON-RPC request body
   * @returns A2AResponse or AsyncGenerator<A2AResponse> for streaming
   */
  async handleRequest(
    body: unknown,
  ): Promise<A2AResponse | AsyncGenerator<A2AResponse, void, undefined>> {
    return this.jsonRpcHandler.handle(body);
  }

  // ---------------------------------------------------------------------------
  // Express standalone server
  // ---------------------------------------------------------------------------

  /**
   * Start a standalone Express server.
   *
   * @param port - Port to listen on
   * @returns Promise that resolves when server is listening
   */
  async start(port: number): Promise<void> {
    // Dynamic import to keep express optional
    const express = (await import("express")).default;
    const app = express();

    // Log all incoming requests
    app.use((req, res, next) => {
      this.logger.info(`[HTTP] ${req.method} ${req.path}`);
      next();
    });

    // Setup A2A routes (handles /.well-known/agent-card.json and POST /)
    const a2aApp = new A2AExpressApp(this.requestHandler);
    a2aApp.setupRoutes(app);

    // Serve /.well-known/did.json for any DID (did:web or did:key)
    const did = this.config.aletheiaExtensions?.did;
    if (did) {
      app.get("/.well-known/did.json", (_req, res) => {
        res.json(this.buildDIDDocument(did));
      });
    }

    // Add liveness endpoint for Aletheia health checks
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        this.server = server;
        this.logger.info("Agent started", { name: this.config.name, port });
        this.events.emit("agent.start", { name: this.config.name, port });
        resolve();
      });
    });
  }

  /**
   * Stop the standalone server if running.
   */
  stop(): void {
    this.server?.close();
    this.server = undefined;
    this.logger.info("Agent stopped", { name: this.config.name });
    this.events.emit("agent.stop", { name: this.config.name });
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  /**
   * Get the agent's AgentCard.
   */
  getAgentCard(): AgentCard {
    return this.agentCard;
  }

  /**
   * Get the underlying request handler for custom integrations.
   */
  getRequestHandler(): A2ARequestHandler {
    return this.requestHandler;
  }

  /**
   * Get the task store.
   */
  getTaskStore(): TaskStore {
    return this.taskStore;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildAgentCard(config: AletheiaAgentConfig): AgentCard {
    const card: AgentCard = {
      protocolVersion: A2A_PROTOCOL_VERSION,
      name: config.name,
      version: config.version,
      url: config.url,
      description: config.description,
      skills: config.skills,
      defaultInputModes: config.defaultInputModes ?? [
        "text/plain",
        "application/json",
      ],
      defaultOutputModes: config.defaultOutputModes ?? [
        "text/plain",
        "application/json",
      ],
      capabilities: {
        streaming: config.capabilities?.streaming ?? true,
        pushNotifications: config.capabilities?.pushNotifications ?? false,
        stateTransitionHistory:
          config.capabilities?.stateTransitionHistory ?? false,
        extensions: config.capabilities?.extensions,
      },
    };

    if (config.iconUrl) {
      card.iconUrl = config.iconUrl;
    }

    if (config.documentationUrl) {
      card.documentationUrl = config.documentationUrl;
    }

    if (config.provider) {
      card.provider = config.provider;
    }

    // Include Aletheia extensions directly on the card so they are served
    // at /.well-known/agent-card.json — this lets the registry verify ownership.
    if (config.aletheiaExtensions) {
      const ext: Record<string, string> = {};
      if (config.aletheiaExtensions.did)
        ext.did = config.aletheiaExtensions.did;
      if (config.aletheiaExtensions.owner)
        ext.owner = config.aletheiaExtensions.owner;
      if (config.aletheiaExtensions.livenessPingUrl)
        ext.livenessPingUrl = config.aletheiaExtensions.livenessPingUrl;
      if (config.aletheiaExtensions.publicKeyMultibase)
        ext.publicKeyMultibase = config.aletheiaExtensions.publicKeyMultibase;

      (card as unknown as Record<string, unknown>).aletheiaExtensions = ext;
    }

    return card;
  }

  /**
   * Get Aletheia-specific extensions.
   */
  getAletheiaExtensions() {
    return this.config.aletheiaExtensions;
  }

  /**
   * Build a minimal W3C DID Document for did:web self-hosting.
   */
  public buildDIDDocument(did: string): DIDDocument {
    const publicKeyMultibase =
      this.config.aletheiaExtensions?.publicKeyMultibase;
    const verificationMethodId = `${did}#${publicKeyMultibase ?? "key-1"}`;

    const doc: DIDDocument = {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/multikey/v1",
      ],
      id: did,
      controller: did,
      service: [
        {
          id: `${did}#agent`,
          type: "AgentService",
          serviceEndpoint: this.config.url,
        },
      ],
    };

    if (publicKeyMultibase) {
      doc.verificationMethod = [
        {
          id: verificationMethodId,
          type: "Multikey",
          controller: did,
          publicKeyMultibase,
        },
      ];
      doc.authentication = [verificationMethodId];
      doc.assertionMethod = [verificationMethodId];
    }

    return doc;
  }
}
