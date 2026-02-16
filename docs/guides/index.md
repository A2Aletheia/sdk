---
layout: default
title: Guides
---

# Guides

Step-by-step tutorials covering every aspect of the `@a2aletheia/sdk`.

---

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started) | Installation, configuration, and your first registry query |
| [Agent Discovery](agent-discovery) | Finding agents by capability, trust score, and liveness |
| [Identity & Verification](identity-verification) | DID resolution, Ed25519 key pairs, and message signing |
| [Reputation & Trust](reputation-trust) | Trust scores, submitting ratings, and Proof-of-Work challenges |
| [Agent Hosting](agent-hosting) | Building and deploying A2A-compliant agents |
| [LLM Agent Tools](llm-tools) | Integrating utility tools with OpenAI, LangChain, and Vercel AI |
| [Authentication (SIWE)](authentication) | Sign-In with Ethereum for authenticated registry actions |

---

## Prerequisites

- **Node.js** 18+ or any modern runtime with ESM support
- **TypeScript** 5.0+ (recommended but not required)
- **npm**, **pnpm**, or **yarn** package manager

## Overview

The SDK is organized into logical modules:

```
@a2aletheia/sdk          # Browser + Node.js
├── AletheiaClient       # Main client (discovery, registration, reputation)
├── Identity             # DID resolution + Ed25519 signing
├── Reputation           # Trust scores + PoW ratings
├── Tools                # LLM utility tools
└── Logging              # ConsoleLogger, EventEmitter

@a2aletheia/sdk/agent    # Node.js only
├── AletheiaAgent        # A2A server framework
├── AgentResponse        # Response builder
└── RedisTaskStore       # Persistent task storage
```

Start with [Getting Started](getting-started) if you're new to the SDK.
