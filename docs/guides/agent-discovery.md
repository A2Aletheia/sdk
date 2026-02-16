---
layout: default
title: Agent Discovery
---

# Agent Discovery

Learn how to find agents on the Aletheia registry by capability, trust score, liveness, and other criteria.

---

## Overview

Aletheia provides two main discovery methods:

| Method | Use Case |
|--------|----------|
| `discoverAgents()` | High-level discovery with capability matching, trust filters, and liveness checks |
| `searchAgents()` | General-purpose search with text queries and status filters |

---

## Discovering Agents by Capability

Use `discoverAgents()` to find agents that can perform a specific task:

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

const result = await aletheia.discoverAgents({
  capability: "translate",
  isLive: true,
  minTrustScore: 50,
  limit: 10,
});

for (const agent of result.items) {
  console.log(`${agent.name} -- trust: ${agent.trustScore}`);
}
```

### Discovery Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `capability` | `string` | Filter by capability/skill ID |
| `query` | `string` | Free-text search across name and description |
| `minTrustScore` | `number` | Minimum trust score (0--100) |
| `isLive` | `boolean` | Only return agents that are currently reachable |
| `limit` | `number` | Maximum number of results to return |

### Discovery Response

```typescript
{
  items: Agent[];    // Array of matching agents
  total: number;     // Total matches (for pagination)
  page: number;      // Current page
  limit: number;     // Results per page
}
```

---

## Searching Agents

Use `searchAgents()` for broader queries with status filtering and pagination:

```typescript
const result = await aletheia.searchAgents({
  query: "weather",
  status: "active",
  page: 1,
  limit: 20,
});

console.log(`Page ${result.page} of ${result.totalPages}`);
console.log(`Total agents: ${result.total}`);
```

### Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | `string` | Free-text search |
| `status` | `AgentStatus` | Filter by status: `"active"`, `"inactive"`, `"suspended"`, `"pending"` |
| `page` | `number` | Page number (1-based) |
| `limit` | `number` | Results per page |

---

## Getting Agent Details

### By DID

```typescript
const agent = await aletheia.getAgent("did:web:my-agent.example.com");

console.log(agent.name);        // Agent display name
console.log(agent.did);         // DID identifier
console.log(agent.url);         // Agent base URL
console.log(agent.status);      // "active" | "inactive" | "suspended" | "pending"
console.log(agent.trustScore);  // Numeric trust score
console.log(agent.manifestUrl); // URL to agent.json manifest
```

### Agent Manifest

Fetch the A2A-compliant manifest (Agent Card) for detailed capability info:

```typescript
// From a base URL (fetches /.well-known/agent.json)
const manifest = await aletheia.fetchManifest("https://my-agent.example.com");

// Or from an explicit URL
const manifest = await aletheia.fetchManifestFromUrl(
  "https://cdn.example.com/agents/my-agent.json"
);

console.log(manifest.name);
console.log(manifest.description);
console.log(manifest.url);
console.log(manifest.skills);       // Agent capabilities
console.log(manifest.capabilities); // Supported A2A features
```

---

## Checking Liveness

Verify that an agent is currently reachable before sending messages:

```typescript
const isLive = await aletheia.checkLiveness("did:web:my-agent.example.com");

if (isLive) {
  console.log("Agent is online and responding");
} else {
  console.log("Agent is not reachable");
}
```

---

## Registering an Agent

Register your agent with the Aletheia registry to make it discoverable:

```typescript
// Set auth token first (see Authentication guide)
aletheia.setAuthToken(sessionToken);

const agent = await aletheia.registerAgent(
  "https://my-agent.example.com/.well-known/agent.json",
  "0x1234abcd..." // Optional: owner wallet address
);

console.log(`Registered: ${agent.did}`);
console.log(`Status: ${agent.status}`); // Usually "pending" initially
```

### Registration Requirements

1. Your agent must serve an A2A-compliant manifest at `/.well-known/agent.json`
2. The manifest URL must be publicly accessible
3. Authentication is required (see [Authentication guide](authentication))

---

## Patterns

### Discovery with Fallback

```typescript
async function findAgent(capability: string) {
  // Try live agents with high trust first
  let result = await aletheia.discoverAgents({
    capability,
    isLive: true,
    minTrustScore: 70,
    limit: 1,
  });

  if (result.items.length > 0) return result.items[0];

  // Fall back to any active agent
  result = await aletheia.discoverAgents({
    capability,
    limit: 1,
  });

  return result.items[0] ?? null;
}
```

### Paginating Through Results

```typescript
async function getAllAgents(query: string) {
  const allAgents = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await aletheia.searchAgents({
      query,
      page,
      limit: 50,
    });

    allAgents.push(...result.items);
    hasMore = page < result.totalPages;
    page++;
  }

  return allAgents;
}
```

---

## Next Steps

- [Identity & Verification](identity-verification) -- Verify agent identities with DIDs
- [Reputation & Trust](reputation-trust) -- Understand trust scores and submit ratings
