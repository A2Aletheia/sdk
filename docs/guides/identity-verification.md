---
layout: default
title: Identity & Verification
---

# Identity & Verification

Learn how to work with Decentralized Identifiers (DIDs), generate Ed25519 key pairs, and sign/verify agent messages.

---

## Overview

Aletheia uses DIDs for agent identity. The SDK supports:

| DID Method | Resolution | Example |
|------------|------------|---------|
| `did:web` | Fetches `/.well-known/did.json` from the domain | `did:web:my-agent.example.com` |
| `did:key` | Derives DID Document from the public key itself | `did:key:z6Mk...` |

---

## Resolving DIDs

### Using AletheiaClient

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

const didDocument = await aletheia.resolveDID("did:web:example.com");
console.log(didDocument.id);
console.log(didDocument.verificationMethod);
```

### Using DIDResolver Directly

```typescript
import { DIDResolver } from "@a2aletheia/sdk";

const resolver = new DIDResolver();

// Resolve did:web (fetches https://example.com/.well-known/did.json)
const webDoc = await resolver.resolve("did:web:example.com");

// Resolve did:key (constructs document from public key)
const keyDoc = await resolver.resolve("did:key:z6Mk...");
```

### DID Document Structure

A resolved DID Document contains:

```typescript
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  id: "did:web:example.com",
  verificationMethod: [
    {
      id: "did:web:example.com#key-1",
      type: "Ed25519VerificationKey2020",
      controller: "did:web:example.com",
      publicKeyMultibase: "z6Mk..."
    }
  ],
  authentication: ["did:web:example.com#key-1"],
  service: [
    {
      id: "#a2a",
      type: "A2AAgent",
      serviceEndpoint: "https://example.com"
    }
  ]
}
```

---

## Key Pair Generation

Generate an Ed25519 key pair for agent message signing:

```typescript
import { generateAgentKeyPair } from "@a2aletheia/sdk";

const keys = await generateAgentKeyPair();

console.log(keys.privateKey);          // Hex-encoded private key (keep secret!)
console.log(keys.publicKey);           // Hex-encoded public key
console.log(keys.publicKeyMultibase);  // Multibase-encoded (for DID documents)
console.log(keys.didKey);              // did:key:z6Mk... identifier
```

### Using with AletheiaAgent

When building an agent with `AletheiaAgent`, you have two options:

**Option 1: Auto-generated did:key (Development)**

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";

// No keys needed - agent generates them on startup
const agent = new AletheiaAgent({
  name: "DevAgent",
  version: "1.0.0",
  url: "http://localhost:4000",
  description: "Development agent",
  skills: [...],
});
// Agent gets a new did:key each restart
```

**Option 2: Persistent did:web (Production)**

```typescript
import { AletheiaAgent } from "@a2aletheia/sdk/agent";
import { generateAgentKeyPair } from "@a2aletheia/sdk";

// Generate once, store securely
const keys = await generateAgentKeyPair();

const agent = new AletheiaAgent({
  name: "ProductionAgent",
  version: "1.0.0",
  url: "https://my-agent.example.com",
  description: "Production agent",
  skills: [...],
  aletheiaExtensions: {
    did: "did:web:my-agent.example.com",
    publicKeyMultibase: keys.publicKeyMultibase,
  },
});
// Agent serves /.well-known/did.json with your public key
```

### Key Storage

> **Important:** Store the private key securely. Never commit it to source control or expose it in client-side code.

The `publicKeyMultibase` value is what you publish in your DID Document's `verificationMethod`.

---

## Message Signing

Sign arbitrary payloads with Ed25519 to prove your agent's identity:

```typescript
import { signAgentMessage } from "@a2aletheia/sdk";

const signedMessage = await signAgentMessage(
  { action: "book", hotelId: "123", date: "2025-03-15" },
  keys.privateKey,
  keys.didKey // or "did:web:your-agent.com"
);

// signedMessage contains:
// {
//   payload: { action: "book", hotelId: "123", date: "2025-03-15" },
//   signature: "base64-encoded-signature",
//   signer: "did:key:z6Mk...",
//   timestamp: "2025-01-15T10:30:00.000Z"
// }
```

The signed message includes a timestamp for replay protection.

---

## Message Verification

### Method 1: Verify with Public Key

If you already have the signer's public key:

```typescript
import { verifyAgentSignature } from "@a2aletheia/sdk";

const isValid = await verifyAgentSignature(signedMessage, publicKeyHex);
console.log(isValid); // true or false
```

### Method 2: Verify with DID Resolution (Recommended)

Automatically resolves the signer's DID and verifies against their published public key:

```typescript
// Using AletheiaClient (recommended)
const result = await aletheia.verifyAgentMessage(signedMessage);

if (result.valid) {
  console.log(`Verified message from ${result.didDocument?.id}`);
} else {
  console.log(`Verification failed: ${result.error}`);
}
```

```typescript
// Or using the low-level function
import { verifyAgentMessageWithDID } from "@a2aletheia/sdk";

const didDocument = await aletheia.resolveDID(signedMessage.signer);
const isValid = await verifyAgentMessageWithDID(signedMessage, didDocument);
```

---

## End-to-End Example

Complete flow: generating keys, publishing identity, signing messages, and verifying.

### Step 1: Agent Setup (One-Time)

```typescript
import { generateAgentKeyPair } from "@a2aletheia/sdk";

// Generate keys (do this once, store securely)
const keys = await generateAgentKeyPair();
```

### Step 2: Publish DID Document

Host this at `https://your-agent.com/.well-known/did.json`:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:your-agent.com",
  "verificationMethod": [
    {
      "id": "did:web:your-agent.com#key-1",
      "type": "Ed25519VerificationKey2020",
      "controller": "did:web:your-agent.com",
      "publicKeyMultibase": "<keys.publicKeyMultibase>"
    }
  ],
  "authentication": ["did:web:your-agent.com#key-1"]
}
```

### Step 3: Sign Outgoing Messages

```typescript
import { signAgentMessage } from "@a2aletheia/sdk";

const signedResponse = await signAgentMessage(
  { result: "booking confirmed", confirmationId: "ABC123" },
  keys.privateKey,
  "did:web:your-agent.com"
);

// Send signedResponse to the requesting agent
```

### Step 4: Verify Incoming Messages

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

const verification = await aletheia.verifyAgentMessage(signedResponse);

if (!verification.valid) {
  throw new Error("Message not from the claimed agent!");
}

// Trusted: this message really came from did:web:your-agent.com
console.log("Verified response:", signedResponse.payload);
```

---

## Fetching Agent Manifests

The manifest (Agent Card) is the A2A-compliant description of an agent's capabilities:

```typescript
// Fetches https://my-agent.example.com/.well-known/agent.json
const manifest = await aletheia.fetchManifest("https://my-agent.example.com");

// Or from an arbitrary URL
const manifest = await aletheia.fetchManifestFromUrl(
  "https://cdn.example.com/agents/manifest.json"
);
```

The manifest includes the agent's name, description, skills, supported capabilities, and Aletheia-specific extensions.

---

## Next Steps

- [Reputation & Trust](reputation-trust) -- Submit ratings and check trust scores
- [Agent Hosting](agent-hosting) -- Build an agent that serves its own DID document automatically
