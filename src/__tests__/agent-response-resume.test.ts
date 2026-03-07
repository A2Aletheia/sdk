import { describe, expect, it } from "vitest";
import type { A2AResponse } from "@a2a-js/sdk";
import { AletheiaAgent } from "../agent/aletheia-agent.js";
import type { FlowRequest } from "../agent/flow-types.js";

function createAgent() {
  return new AletheiaAgent({
    name: "Resume Test Agent",
    version: "0.1.0",
    url: "http://localhost:9999",
    description: "Regression test agent",
    skills: [
      {
        id: "resume-test",
        name: "resume-test",
        description: "Regression test skill",
        tags: [],
      },
    ],
  });
}

function buildSendRequest(input: {
  id: string;
  text: string;
  taskId?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
  blocking?: boolean;
}) {
  return {
    jsonrpc: "2.0" as const,
    id: input.id,
    method: "message/send",
    params: {
      message: {
        messageId: `msg-${input.id}`,
        role: "user" as const,
        parts: [{ kind: "text" as const, text: input.text }],
        ...(input.taskId ? { taskId: input.taskId } : {}),
        ...(input.contextId ? { contextId: input.contextId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      ...(input.blocking === false
        ? { configuration: { blocking: false } }
        : {}),
    },
  };
}

function buildStreamRequest(input: {
  id: string;
  text: string;
  taskId?: string;
  contextId?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    jsonrpc: "2.0" as const,
    id: input.id,
    method: "message/stream",
    params: {
      message: {
        messageId: `msg-${input.id}`,
        role: "user" as const,
        parts: [{ kind: "text" as const, text: input.text }],
        ...(input.taskId ? { taskId: input.taskId } : {}),
        ...(input.contextId ? { contextId: input.contextId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    },
  };
}

function getSuccessResult(response: unknown) {
  const payload = response as {
    error?: { message?: string };
    result?: {
      kind: string;
      taskId?: string;
      contextId?: string;
      messageId?: string;
      parts?: Array<{ kind: string; text?: string }>;
      metadata?: Record<string, unknown>;
    };
  };

  expect(payload.error).toBeUndefined();
  expect(payload.result).toBeDefined();
  return payload.result!;
}

async function loadTask(agent: AletheiaAgent, taskId: string) {
  return (
    agent.getTaskStore() as {
      load: (id: string) => Promise<{
        status: { state: string };
        history?: Array<{ messageId: string; metadata?: Record<string, unknown> }>;
      } | undefined>;
    }
  ).load(taskId);
}

async function collectStreamResults(
  response: A2AResponse | AsyncGenerator<A2AResponse, void, undefined>,
) {
  expect(Symbol.asyncIterator in Object(response)).toBe(true);

  const results: unknown[] = [];
  for await (const item of response as AsyncGenerator<A2AResponse, void, undefined>) {
    results.push((item as { result?: unknown }).result);
  }

  return results;
}

describe("AgentResponse resume behavior", () => {
  it("persists a resumable task for text-only replies", async () => {
    const agent = createAgent();
    let callCount = 0;

    agent.handle(async (context, response) => {
      callCount++;
      response.text(`Echo: ${context.textContent}`);
    });

    const first = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({ id: "1", text: "first message" }),
      ),
    );

    expect(first.kind).toBe("message");
    expect(first.taskId).toBeDefined();
    expect(first.contextId).toBeDefined();
    expect(first.parts?.[0]?.text).toBe("Echo: first message");

    const storedTask = await loadTask(agent, first.taskId!);
    expect(storedTask?.status.state).toBe("working");
    expect(storedTask?.history).toHaveLength(2);
    expect(storedTask?.history?.at(-1)?.messageId).toBe(first.messageId);

    const second = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({
          id: "2",
          text: "second message",
          taskId: first.taskId,
          contextId: first.contextId,
        }),
      ),
    );

    expect(callCount).toBe(2);
    expect(second.parts?.[0]?.text).toBe("Echo: second message");
  });

  it("persists a resumable task for flow replies", async () => {
    const agent = createAgent();
    let callCount = 0;
    const flowRequest: FlowRequest = {
      type: "urn:a2a:flow:oauth",
      payload: {
        provider: "notion",
        authUrl: "https://example.com/oauth",
        grantId: "grant-123",
      },
      message: "Connect Notion",
    };

    agent.handle(async (_context, response) => {
      callCount++;
      response.flow(flowRequest);
    });

    const first = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({ id: "1", text: "start flow" }),
      ),
    );

    expect(first.kind).toBe("message");
    expect(first.taskId).toBeDefined();
    expect(first.contextId).toBeDefined();
    expect(first.metadata?.["urn:a2a:flow-request:v1"]).toEqual(flowRequest);

    const storedTask = await loadTask(agent, first.taskId!);
    expect(storedTask?.status.state).toBe("input-required");
    expect(storedTask?.history).toHaveLength(2);
    expect(storedTask?.history?.at(-1)?.metadata?.["urn:a2a:flow-request:v1"]).toEqual(
      flowRequest,
    );

    const second = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({
          id: "2",
          text: "resume flow",
          taskId: first.taskId,
          contextId: first.contextId,
        }),
      ),
    );

    expect(callCount).toBe(2);
    expect(second.metadata?.["urn:a2a:flow-request:v1"]).toEqual(flowRequest);
  });

  it("keeps non-blocking text replies as direct messages", async () => {
    const agent = createAgent();

    agent.handle(async (context, response) => {
      response.text(`Echo: ${context.textContent}`);
    });

    const reply = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({
          id: "non-blocking-text",
          text: "ping",
          blocking: false,
        }),
      ),
    );

    expect(reply.kind).toBe("message");
    expect(reply.parts?.[0]?.text).toBe("Echo: ping");
  });

  it("keeps non-blocking flow replies as direct messages", async () => {
    const agent = createAgent();
    const flowRequest: FlowRequest = {
      type: "urn:a2a:flow:oauth",
      payload: {
        provider: "notion",
        authUrl: "https://example.com/oauth",
        grantId: "grant-non-blocking",
      },
      message: "Connect Notion",
    };

    agent.handle(async (_context, response) => {
      response.flow(flowRequest);
    });

    const reply = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({
          id: "non-blocking-flow",
          text: "start flow",
          blocking: false,
        }),
      ),
    );

    expect(reply.kind).toBe("message");
    expect(reply.metadata?.["urn:a2a:flow-request:v1"]).toEqual(flowRequest);
  });

  it("keeps quick text stream replies as a single message event", async () => {
    const agent = createAgent();

    agent.handle(async (context, response) => {
      response.text(`Echo: ${context.textContent}`);
    });

    const events = await collectStreamResults(
      await agent.handleRequest(
        buildStreamRequest({ id: "stream-text", text: "hello stream" }),
      ),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "message",
      parts: [{ kind: "text", text: "Echo: hello stream" }],
    });
  });

  it("keeps quick flow stream replies as a single message event", async () => {
    const agent = createAgent();
    const flowRequest: FlowRequest = {
      type: "urn:a2a:flow:oauth",
      payload: {
        provider: "notion",
        authUrl: "https://example.com/oauth",
        grantId: "grant-stream",
      },
      message: "Connect Notion",
    };

    agent.handle(async (_context, response) => {
      response.flow(flowRequest);
    });

    const events = await collectStreamResults(
      await agent.handleRequest(
        buildStreamRequest({ id: "stream-flow", text: "flow stream" }),
      ),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "message",
      metadata: {
        "urn:a2a:flow-request:v1": flowRequest,
      },
    });
  });

  it("accepts legacy custom flow payloads", async () => {
    const agent = createAgent();
    const flowRequest: FlowRequest = {
      type: "urn:a2a:flow:delegation",
      payload: {
        legacyScopeKey: "custom-scope",
        customFlag: true,
      },
      message: "Legacy delegation flow",
    };

    agent.handle(async (_context, response) => {
      response.flow(flowRequest);
    });

    const reply = getSuccessResult(
      await agent.handleRequest(
        buildSendRequest({ id: "legacy-flow", text: "legacy flow" }),
      ),
    );

    expect(reply.metadata?.["urn:a2a:flow-request:v1"]).toEqual(flowRequest);
  });
});
