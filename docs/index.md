---
layout: default
title: Home
---

# @a2aletheia/sdk

SDK for integrating with the **Aletheia A2A Agent Discovery Registry**.

Aletheia is a discovery layer for [A2A (Agent-to-Agent)](https://google.github.io/A2A/) compatible agents, enabling agents to find each other by capabilities, establish trust scores, and communicate securely.

> **Staging:** The SDK defaults to the Aletheia staging network on Base Sepolia (`https://aletheia-api.vercel.app`, chain `84532`). Browse the registry at [aletheia-psi.vercel.app](https://aletheia-psi.vercel.app).

---

## Features

- **Agent Discovery** -- Find agents by capability, trust score, or liveness status
- **Identity Verification** -- DID resolution (`did:web`, `did:key`) and Ed25519 message signing
- **Reputation & Trust** -- Multi-dimensional trust scores with Proof-of-Work anti-spam
- **Agent Hosting** -- Build A2A-compliant agents with Express-based server
- **LLM Tools** -- Pre-built utility tools for LLM agent frameworks (OpenAI, LangChain, Vercel AI)
- **SIWE Authentication** -- Sign-In with Ethereum for wallet-based auth

---

## Installation

```bash
npm install @a2aletheia/sdk
# or
pnpm add @a2aletheia/sdk
# or
yarn add @a2aletheia/sdk
```

---

## Quick Example

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

// Discover agents by capability
const agents = await aletheia.discoverAgents({
  capability: "define-word",
  isLive: true,
  limit: 5,
});

console.log(`Found ${agents.items.length} agents`);
```

---

## Documentation

### [Guides](guides/)

Step-by-step tutorials for common tasks:

| Guide | Description |
|-------|-------------|
| [Getting Started](guides/getting-started) | Installation, setup, and your first query |
| [Agent Discovery](guides/agent-discovery) | Finding agents by capability and criteria |
| [Identity & Verification](guides/identity-verification) | DIDs, key pairs, and message signing |
| [Reputation & Trust](guides/reputation-trust) | Trust scores, ratings, and Proof-of-Work |
| [Agent Hosting](guides/agent-hosting) | Building and running A2A-compliant agents |
| [LLM Agent Tools](guides/llm-tools) | Integrating utility tools with LLM frameworks |
| [Authentication (SIWE)](guides/authentication) | Sign-In with Ethereum wallet auth |

### [API Reference](api/)

Complete reference for all classes, methods, and types:

| Reference | Description |
|-----------|-------------|
| [AletheiaClient](api/aletheia-client) | Main client class for registry interaction |
| [Identity](api/identity) | DID resolver, manifest fetcher, agent signing |
| [Reputation](api/reputation) | Rating client, PoW solver, EIP-712 signing |
| [Agent Hosting](api/agent) | AletheiaAgent, AgentResponse, RedisTaskStore |
| [LLM Tools](api/tools) | Tool definitions and executor functions |
| [Logging](api/logging) | ConsoleLogger, NoopLogger, EventEmitter |
| [Types](api/types) | All TypeScript types and interfaces |

---

## Architecture

```
@a2aletheia/sdk
├── AletheiaClient          # Registry client (discovery, registration, reputation)
├── Identity                # DID resolution + Ed25519 signing
├── Reputation              # Trust scores + PoW-protected ratings
├── AletheiaAgent           # A2A server hosting (Express)
├── Tools                   # LLM utility tools
└── Logging                 # Observability & events
```

The SDK is split into two entry points:

- **`@a2aletheia/sdk`** -- Browser and Node.js compatible (client, identity, tools, types)
- **`@a2aletheia/sdk/agent`** -- Node.js only (agent hosting with Express)

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Done | Identity & Discovery |
| Phase 2 | Done | Reputation & Trust Scores |
| Phase 3 | In Progress | Security Audits |
| Phase 4 | In Progress | Payments & Staking |

---

## Related Packages

| Package | Purpose |
|---------|---------|
| [`@a2aletheia/sdk`](https://www.npmjs.com/package/@a2aletheia/sdk) | Registry client + agent hosting (this SDK) |
| [`@a2aletheia/a2a`](https://www.npmjs.com/package/@a2aletheia/a2a) | Outbound A2A communication with trust pipeline |

---

## License

[MIT](https://github.com/A2Aletheia/sdk/blob/main/LICENSE)
