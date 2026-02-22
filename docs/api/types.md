---
layout: default
title: Types
---

# Types API Reference

This document provides comprehensive type definitions for the Aletheia SDK. All types are validated using [Zod](https://zod.dev/) schemas for runtime type safety.

## Table of Contents

- [Identity Types](#identity-types)
- [Reputation Types](#reputation-types)
- [Security Types](#security-types)
- [Common Types](#common-types)
- [Signing Types](#signing-types)

---

## Identity Types

Types for decentralized identifiers, agent identity, and A2A-compliant manifests.

### DID

A Decentralized Identifier string following the W3C DID specification.

```typescript
type DID = string; // Must match pattern: /^did:(web|key|ethr|pkh):.+$/
```

**Zod Schema:**
```typescript
const DIDSchema = z.string().regex(/^did:(web|key|ethr|pkh):.+$/, "Must be a valid DID string");
```

**Examples:**
```typescript
const webDid: DID = "did:web:agent.example.com";
const keyDid: DID = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq";
const ethrDid: DID = "did:ethr:0xE6Fe788d8ca214A080b0f6aC7F48480b2AEfa9a6";
const pkhDid: DID = "did:pkh:eip155:1:0xb9c5714089478a327f09197987f16f9e5d936e8a";
```

**Used by:** `DIDDocument`, `Agent`, `Rating`, `TrustScore`, `PoWChallenge`, `AuditReport`

---

### DIDMethod

Supported DID method identifiers.

```typescript
type DIDMethod = "web" | "key" | "ethr" | "pkh";
```

**Zod Schema:**
```typescript
const DIDMethodSchema = z.enum(["web", "key", "ethr", "pkh"]);
```

| Value | Description |
|-------|-------------|
| `web` | Domain-based DIDs resolved via HTTPS |
| `key` | Self-contained key-based DIDs |
| `ethr` | Ethereum-based DIDs |
| `pkh` | Public key hash DIDs (e.g., blockchain accounts) |

---

### DIDDocument

W3C-compliant DID Document representing an entity's cryptographic keys and service endpoints.

```typescript
interface DIDDocument {
  "@context": string[];
  id: string;
  controller?: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  service?: DIDService[];
}
```

**Zod Schema:**
```typescript
const DIDDocumentSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string(),
  controller: z.string().optional(),
  verificationMethod: z.array(VerificationMethodSchema).optional(),
  authentication: z.array(z.string()).optional(),
  assertionMethod: z.array(z.string()).optional(),
  service: z.array(DIDServiceSchema).optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@context` | `string[]` | Yes | JSON-LD context URIs for the document |
| `id` | `string` | Yes | The DID being described |
| `controller` | `string` | No | DID that has authority over this document |
| `verificationMethod` | `VerificationMethod[]` | No | Public keys for verification |
| `authentication` | `string[]` | No | References to keys authorized for authentication |
| `assertionMethod` | `string[]` | No | References to keys for assertions/claims |
| `service` | `DIDService[]` | No | Service endpoints for the DID |

**Example:**
```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:web:agent.example.com",
  "verificationMethod": [{
    "id": "did:web:agent.example.com#key-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:web:agent.example.com",
    "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq"
  }],
  "authentication": ["did:web:agent.example.com#key-1"],
  "service": [{
    "id": "did:web:agent.example.com#a2a",
    "type": "A2A",
    "serviceEndpoint": "https://agent.example.com/a2a"
  }]
}
```

**Used by:** [DIDResolver](identity.md#didresolver), `verifyAgentMessageWithDID`

---

### VerificationMethod

A public key and its associated metadata for cryptographic verification.

```typescript
interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
}
```

**Zod Schema:**
```typescript
const VerificationMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  controller: z.string(),
  publicKeyMultibase: z.string().optional(),
  publicKeyJwk: z.record(z.unknown()).optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for this verification method |
| `type` | `string` | Yes | Key type (e.g., `Ed25519VerificationKey2020`) |
| `controller` | `string` | Yes | DID that controls this key |
| `publicKeyMultibase` | `string` | No | Public key in multibase format (base58btc) |
| `publicKeyJwk` | `Record<string, unknown>` | No | Public key as JWK (JSON Web Key) |

**Example:**
```json
{
  "id": "did:key:z6Mk...#key-1",
  "type": "Ed25519VerificationKey2020",
  "controller": "did:key:z6Mk...",
  "publicKeyMultibase": "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq"
}
```

---

### DIDService

A service endpoint associated with a DID.

```typescript
interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string; // Must be a valid URL
}
```

**Zod Schema:**
```typescript
const DIDServiceSchema = z.object({
  id: z.string(),
  type: z.string(),
  serviceEndpoint: z.string().url(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the service |
| `type` | `string` | Yes | Service type (e.g., `A2A`, `Hub`) |
| `serviceEndpoint` | `string` | Yes | URL of the service endpoint |

---

### Agent

A registered AI agent on the Aletheia network.

```typescript
interface Agent {
  id: string;                  // UUID
  did: DID;
  name: string;
  description?: string;
  url: string;                 // Agent's base URL
  manifestUrl: string;         // URL to agent-card.json manifest
  status: AgentStatus;
  trustScore: number | null;   // 0-100, null if unrated
  totalRatings: number;
  totalVolume: number;
  lastLivenessCheck: Date | null;
  isLive: boolean;
  isBattleTested: boolean;
  registeredAt: Date;
  updatedAt: Date;
  chainId?: number;
  registryTxHash?: string;
  ownerAddress?: string;
}
```

**Zod Schema:**
```typescript
const AgentSchema = z.object({
  id: z.string().uuid(),
  did: DIDSchema,
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  manifestUrl: z.string().url(),
  status: AgentStatusSchema,
  trustScore: z.number().min(0).max(100).nullable(),
  totalRatings: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  lastLivenessCheck: z.coerce.date().nullable(),
  isLive: z.boolean(),
  isBattleTested: z.boolean(),
  registeredAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  chainId: z.number().int().optional(),
  registryTxHash: z.string().optional(),
  ownerAddress: z.string().optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique UUID identifier |
| `did` | `DID` | Yes | Agent's decentralized identifier |
| `name` | `string` | Yes | Display name |
| `description` | `string` | No | Human-readable description |
| `url` | `string` | Yes | Base URL for agent communication |
| `manifestUrl` | `string` | Yes | URL to A2A agent manifest |
| `status` | `AgentStatus` | Yes | Current registration status |
| `trustScore` | `number \| null` | Yes | Computed trust score (0-100) |
| `totalRatings` | `number` | Yes | Total number of ratings received |
| `totalVolume` | `number` | Yes | Total transaction volume |
| `lastLivenessCheck` | `Date \| null` | Yes | Last successful liveness ping |
| `isLive` | `boolean` | Yes | Whether agent is currently responsive |
| `isBattleTested` | `boolean` | Yes | Whether agent passed security audit |
| `registeredAt` | `Date` | Yes | Registration timestamp |
| `updatedAt` | `Date` | Yes | Last update timestamp |
| `chainId` | `number` | No | Blockchain network ID |
| `registryTxHash` | `string` | No | Transaction hash of registration |
| `ownerAddress` | `string` | No | Owner's Ethereum address |

**Used by:** [Client API](client.md) - `discoverAgents()`, `getAgent()`

---

### AgentStatus

Lifecycle status of an agent registration.

```typescript
type AgentStatus = "active" | "inactive" | "suspended" | "pending";
```

**Zod Schema:**
```typescript
const AgentStatusSchema = z.enum(["active", "inactive", "suspended", "pending"]);
```

| Value | Description |
|-------|-------------|
| `active` | Agent is registered and operational |
| `inactive` | Agent has been deactivated |
| `suspended` | Agent is suspended due to policy violation |
| `pending` | Agent registration is awaiting verification |

---

### AgentSearchParams

Parameters for searching and filtering agents.

```typescript
interface AgentSearchParams {
  status?: AgentStatus;
  search?: string;
  minTrustScore?: number;
  capability?: string;
  isLive?: boolean;
  isBattleTested?: boolean;
}
```

**Zod Schema:**
```typescript
const AgentSearchParamsSchema = z.object({
  status: AgentStatusSchema.optional(),
  search: z.string().optional(),
  minTrustScore: z.coerce.number().optional(),
  capability: z.string().optional(),
  isLive: z.coerce.boolean().optional(),
  isBattleTested: z.coerce.boolean().optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `AgentStatus` | No | Filter by registration status |
| `search` | `string` | No | Full-text search on name/description |
| `minTrustScore` | `number` | No | Minimum trust score (0-100) |
| `capability` | `string` | No | Filter by skill/capability ID |
| `isLive` | `boolean` | No | Filter by liveness status |
| `isBattleTested` | `boolean` | No | Filter by security audit status |

**Used by:** [Client API](client.md) - `discoverAgents()`

---

### AgentManifest

A2A-compliant agent manifest describing capabilities, skills, and metadata.

```typescript
interface AgentManifest {
  // Core A2A fields
  name: string;
  description?: string;
  version: string;           // SemVer format: X.Y.Z
  url: string;
  skills: Skill[];           // At least one required

  // A2A capabilities (protocol features)
  capabilities?: Capabilities;

  // A2A input/output modes
  defaultInputModes?: string[];
  defaultOutputModes?: string[];

  // Provider info
  provider?: {
    organization: string;
    url?: string;
    contact?: string;        // Email
  };

  // Security configuration
  securitySchemes?: Record<string, unknown>;
  security?: Record<string, string[]>[];

  // Extended agent card support
  supportsAuthenticatedExtendedCard?: boolean;

  // Aletheia-specific extensions
  aletheiaExtensions?: {
    did?: DID;
    owner?: string;              // Ethereum address (0x...)
    publicKeyMultibase?: string; // Ed25519 public key for did:web
    registryChain?: string;
    registryAddress?: string;
    livenessPingUrl?: string;
  };
}
```

**Zod Schema:**
```typescript
const AgentManifestSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2048).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  url: z.string().url(),
  skills: z.array(SkillSchema).min(1),
  capabilities: CapabilitiesSchema.optional(),
  defaultInputModes: z.array(z.string()).optional(),
  defaultOutputModes: z.array(z.string()).optional(),
  provider: z.object({
    organization: z.string(),
    url: z.string().url().optional(),
    contact: z.string().email().optional(),
  }).optional(),
  securitySchemes: z.record(z.unknown()).optional(),
  security: z.array(z.record(z.array(z.string()))).optional(),
  supportsAuthenticatedExtendedCard: z.boolean().optional(),
  aletheiaExtensions: z.object({
    did: DIDSchema.optional(),
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    registryChain: z.string().optional(),
    registryAddress: z.string().optional(),
    livenessPingUrl: z.string().url().optional(),
  }).optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Agent display name (1-256 chars) |
| `description` | `string` | No | Agent description (max 2048 chars) |
| `version` | `string` | Yes | SemVer version (e.g., `1.0.0`) |
| `url` | `string` | Yes | Agent's base URL |
| `skills` | `Skill[]` | Yes | List of agent skills (min 1) |
| `capabilities` | `Capabilities` | No | Protocol feature support |
| `defaultInputModes` | `string[]` | No | Supported input content types |
| `defaultOutputModes` | `string[]` | No | Supported output content types |
| `provider` | `object` | No | Provider/organization info |
| `securitySchemes` | `Record<string, unknown>` | No | OpenAPI-style security schemes |
| `security` | `Record<string, string[]>[]` | No | Security requirements |
| `supportsAuthenticatedExtendedCard` | `boolean` | No | Extended card behind auth |
| `aletheiaExtensions` | `object` | No | Aletheia-specific metadata |

**Used by:** [ManifestFetcher](identity.md#manifestfetcher)

---

### Skill

Describes a specific skill/capability an agent can perform (A2A-compliant).

```typescript
interface Skill {
  id: string;
  name: string;              // 1-128 characters
  description?: string;      // Max 1024 characters
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
  inputSchema?: Record<string, unknown>;   // JSON Schema
  outputSchema?: Record<string, unknown>;  // JSON Schema
}
```

**Zod Schema:**
```typescript
const SkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  tags: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  inputModes: z.array(z.string()).optional(),
  outputModes: z.array(z.string()).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique skill identifier |
| `name` | `string` | Yes | Human-readable skill name |
| `description` | `string` | No | Skill description |
| `tags` | `string[]` | No | Tags for categorization |
| `examples` | `string[]` | No | Example prompts/queries |
| `inputModes` | `string[]` | No | Supported input MIME types |
| `outputModes` | `string[]` | No | Supported output MIME types |
| `inputSchema` | `Record<string, unknown>` | No | JSON Schema for input validation |
| `outputSchema` | `Record<string, unknown>` | No | JSON Schema for output validation |

**Example:**
```json
{
  "id": "hotel-booking",
  "name": "Hotel Booking",
  "description": "Search and book hotels worldwide",
  "tags": ["travel", "booking", "hotels"],
  "examples": ["Book a hotel in Paris for next weekend"],
  "inputModes": ["text/plain", "application/json"],
  "outputModes": ["text/plain", "application/json"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "destination": { "type": "string" },
      "checkIn": { "type": "string", "format": "date" },
      "checkOut": { "type": "string", "format": "date" }
    },
    "required": ["destination"]
  }
}
```

---

### Capabilities

Protocol features supported by an agent.

```typescript
interface Capabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}
```

**Zod Schema:**
```typescript
const CapabilitiesSchema = z.object({
  streaming: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  stateTransitionHistory: z.boolean().optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `streaming` | `boolean` | No | Supports streaming responses |
| `pushNotifications` | `boolean` | No | Supports push notifications |
| `stateTransitionHistory` | `boolean` | No | Maintains state history |

---

### Capability

**Alias for `Skill`** - maintained for backward compatibility.

```typescript
type Capability = Skill;
```

---

## Reputation Types

Types for trust scores, ratings, and proof-of-work challenges.

### Rating

A verified rating submitted for an agent.

```typescript
interface Rating {
  id: string;                      // UUID
  fromDid: DID;                    // Rater's DID
  toDid: DID;                      // Agent being rated
  score: number;                   // 1-5 stars
  comment?: string;                // Max 1024 chars
  txHash?: string;                 // On-chain transaction hash
  chainId?: number;                // Blockchain network ID
  epochId: string;                 // Rating epoch
  signature: string;               // EIP-712 signature
  createdAt: Date;
  expiresAt: Date;
  isVerified: boolean;
  isWashTrade: boolean | null;     // Wash trade detection result
  // Proof-of-Work fields
  powNonce: string;
  powHash: string;
  powDifficulty: number;
  // Interaction proof fields
  interactionCount: number;        // Min 3 interactions required
  interactionWindowStart: Date;
  interactionCumulativeValue: number;
  // Trust-weighted influence
  raterTrustScore: number | null;  // Rater's trust score at time of rating
  weightedScore: number | null;    // Trust-weighted score
}
```

**Zod Schema:**
```typescript
const RatingSchema = z.object({
  id: z.string().uuid(),
  fromDid: DIDSchema,
  toDid: DIDSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1024).optional(),
  txHash: z.string().optional(),
  chainId: z.number().int().optional(),
  epochId: z.string(),
  signature: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  isVerified: z.boolean(),
  isWashTrade: z.boolean().nullable(),
  powNonce: z.string(),
  powHash: z.string(),
  powDifficulty: z.number().int(),
  interactionCount: z.number().int().min(3),
  interactionWindowStart: z.coerce.date(),
  interactionCumulativeValue: z.number().nonnegative(),
  raterTrustScore: z.number().min(0).max(100).nullable(),
  weightedScore: z.number().nullable(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique rating UUID |
| `fromDid` | `DID` | Yes | DID of the rater |
| `toDid` | `DID` | Yes | DID of the agent being rated |
| `score` | `number` | Yes | Rating score (1-5) |
| `comment` | `string` | No | Textual feedback (max 1024 chars) |
| `txHash` | `string` | No | On-chain transaction hash |
| `chainId` | `number` | No | Blockchain network ID |
| `epochId` | `string` | Yes | Rating epoch identifier |
| `signature` | `string` | Yes | EIP-712 typed data signature |
| `createdAt` | `Date` | Yes | Rating creation timestamp |
| `expiresAt` | `Date` | Yes | Rating expiration timestamp |
| `isVerified` | `boolean` | Yes | Whether signature is verified |
| `isWashTrade` | `boolean \| null` | Yes | Wash trade detection result |
| `powNonce` | `string` | Yes | Proof-of-work nonce |
| `powHash` | `string` | Yes | Proof-of-work hash solution |
| `powDifficulty` | `number` | Yes | Difficulty level of PoW |
| `interactionCount` | `number` | Yes | Number of prior interactions (min 3) |
| `interactionWindowStart` | `Date` | Yes | Start of interaction window |
| `interactionCumulativeValue` | `number` | Yes | Total value of interactions |
| `raterTrustScore` | `number \| null` | Yes | Rater's trust score at rating time |
| `weightedScore` | `number \| null` | Yes | Trust-weighted score |

**Used by:** [Client API](client.md) - `submitRating()`, `getRatings()`

---

### CreateRatingInput

Input required to submit a new rating.

```typescript
interface CreateRatingInput {
  toDid: DID;                      // Agent being rated
  score: number;                   // 1-5 stars
  comment?: string;                // Max 1024 chars
  signature: string;               // EIP-712 signature
  // Proof-of-Work proof
  powNonce: string;
  powHash: string;
  challengeId: string;             // UUID of the PoW challenge
  // Interaction proofs (on-chain tx hashes)
  interactionProofs: string[];     // Min 3 transaction hashes
  interactionChainId: number;
}
```

**Zod Schema:**
```typescript
const CreateRatingInputSchema = z.object({
  toDid: DIDSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1024).optional(),
  signature: z.string(),
  powNonce: z.string(),
  powHash: z.string(),
  challengeId: z.string().uuid(),
  interactionProofs: z.array(z.string()).min(3),
  interactionChainId: z.number().int(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toDid` | `DID` | Yes | DID of agent being rated |
| `score` | `number` | Yes | Rating score (1-5) |
| `comment` | `string` | No | Optional feedback text |
| `signature` | `string` | Yes | EIP-712 signature of rating payload |
| `powNonce` | `string` | Yes | Proof-of-work nonce solution |
| `powHash` | `string` | Yes | Proof-of-work hash result |
| `challengeId` | `string` | Yes | UUID of the PoW challenge |
| `interactionProofs` | `string[]` | Yes | Transaction hashes proving interaction (min 3) |
| `interactionChainId` | `number` | Yes | Chain ID where interactions occurred |

**Used by:** [Client API](client.md) - `submitRating()`

---

### TrustScore

Computed trust score with component breakdown.

```typescript
interface TrustScore {
  did: DID;
  overall: number;                 // 0-100
  components: {
    volumeWeighted: number;        // 0-100
    recencyWeighted: number;       // 0-100
    diversityScore: number;        // 0-100
    washTradeDiscount: number;     // 0-100 (penalty factor)
    trustWeightedInfluence: number; // 0-100
  };
  totalRatings: number;
  totalVolume: number;
  lastCalculated: Date;
  epoch: string;
}
```

**Zod Schema:**
```typescript
const TrustScoreSchema = z.object({
  did: DIDSchema,
  overall: z.number().min(0).max(100),
  components: z.object({
    volumeWeighted: z.number().min(0).max(100),
    recencyWeighted: z.number().min(0).max(100),
    diversityScore: z.number().min(0).max(100),
    washTradeDiscount: z.number().min(0).max(100),
    trustWeightedInfluence: z.number().min(0).max(100),
  }),
  totalRatings: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  lastCalculated: z.coerce.date(),
  epoch: z.string(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `did` | `DID` | Yes | Agent's DID |
| `overall` | `number` | Yes | Composite trust score (0-100) |
| `components.volumeWeighted` | `number` | Yes | Score weighted by transaction volume |
| `components.recencyWeighted` | `number` | Yes | Score weighted by recency |
| `components.diversityScore` | `number` | Yes | Score based on rater diversity |
| `components.washTradeDiscount` | `number` | Yes | Penalty for detected wash trades |
| `components.trustWeightedInfluence` | `number` | Yes | Score weighted by rater trust |
| `totalRatings` | `number` | Yes | Total ratings received |
| `totalVolume` | `number` | Yes | Total transaction volume |
| `lastCalculated` | `Date` | Yes | Last calculation timestamp |
| `epoch` | `string` | Yes | Epoch when calculated |

**Used by:** [Client API](client.md) - `getTrustScore()`

---

### PoWChallenge

Proof-of-Work challenge for rating submission anti-spam.

```typescript
interface PoWChallenge {
  id: string;                      // UUID
  challenge: string;               // Challenge string to solve
  difficulty: number;              // Number of leading zeros required
  expiresAt: Date;
  raterDid: DID;                   // DID of the rater
  targetDid: DID;                  // DID of agent being rated
}
```

**Zod Schema:**
```typescript
const PoWChallengeSchema = z.object({
  id: z.string().uuid(),
  challenge: z.string(),
  difficulty: z.number().int(),
  expiresAt: z.coerce.date(),
  raterDid: DIDSchema,
  targetDid: DIDSchema,
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique challenge UUID |
| `challenge` | `string` | Yes | Challenge string for PoW computation |
| `difficulty` | `number` | Yes | Required leading zeros in hash |
| `expiresAt` | `Date` | Yes | Challenge expiration time |
| `raterDid` | `DID` | Yes | DID of the rater requesting challenge |
| `targetDid` | `DID` | Yes | DID of agent being rated |

**Used by:** [Client API](client.md) - `requestPowChallenge()`

---

## Security Types

Types for security audits and vulnerability reports.

### AuditSeverity

Severity level for security findings.

```typescript
type AuditSeverity = "critical" | "high" | "medium" | "low" | "info";
```

**Zod Schema:**
```typescript
const AuditSeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
```

---

### AuditStatus

Status of a security audit run.

```typescript
type AuditStatus = "running" | "completed" | "failed";
```

**Zod Schema:**
```typescript
const AuditStatusSchema = z.enum(["running", "completed", "failed"]);
```

---

### AuditFinding

A specific vulnerability or security finding.

```typescript
interface AuditFinding {
  id: string;                      // UUID
  vectorId: string;                // Attack vector identifier
  severity: AuditSeverity;
  title: string;
  description: string;
  evidence?: string;
  mitigated: boolean;
}
```

**Zod Schema:**
```typescript
const AuditFindingSchema = z.object({
  id: z.string().uuid(),
  vectorId: z.string(),
  severity: AuditSeveritySchema,
  title: z.string(),
  description: z.string(),
  evidence: z.string().optional(),
  mitigated: z.boolean(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Finding UUID |
| `vectorId` | `string` | Yes | Attack vector ID |
| `severity` | `AuditSeverity` | Yes | Severity level |
| `title` | `string` | Yes | Finding title |
| `description` | `string` | Yes | Detailed description |
| `evidence` | `string` | No | Supporting evidence |
| `mitigated` | `boolean` | Yes | Whether issue is resolved |

---

### AuditReport

Complete security audit report for an agent.

```typescript
interface AuditReport {
  id: string;                      // UUID
  agentDid: DID;
  runAt: Date;
  completedAt: Date | null;
  status: AuditStatus;
  findings: AuditFinding[];
  overallRisk: AuditSeverity | null;
  battleTestedAwarded: boolean;
  encryptedReport?: string;
}
```

**Zod Schema:**
```typescript
const AuditReportSchema = z.object({
  id: z.string().uuid(),
  agentDid: DIDSchema,
  runAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  status: AuditStatusSchema,
  findings: z.array(AuditFindingSchema),
  overallRisk: AuditSeveritySchema.nullable(),
  battleTestedAwarded: z.boolean(),
  encryptedReport: z.string().optional(),
});
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Report UUID |
| `agentDid` | `DID` | Yes | Audited agent's DID |
| `runAt` | `Date` | Yes | Audit start timestamp |
| `completedAt` | `Date \| null` | Yes | Audit completion timestamp |
| `status` | `AuditStatus` | Yes | Current audit status |
| `findings` | `AuditFinding[]` | Yes | List of security findings |
| `overallRisk` | `AuditSeverity \| null` | Yes | Overall risk assessment |
| `battleTestedAwarded` | `boolean` | Yes | Whether agent earned Battle Tested status |
| `encryptedReport` | `string` | No | Encrypted full report |

---

## Common Types

Shared utility types for pagination, logging, and events.

### PaginationInput

Parameters for paginated API requests.

```typescript
interface PaginationInput {
  page: number;                    // Default: 1
  limit: number;                   // 1-100, default: 20
  sortBy?: string;
  sortOrder: "asc" | "desc";       // Default: "desc"
}
```

**Zod Schema:**
```typescript
const PaginationInputSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | `number` | No | `1` | Page number (1-indexed) |
| `limit` | `number` | No | `20` | Items per page (1-100) |
| `sortBy` | `string` | No | - | Field to sort by |
| `sortOrder` | `"asc" \| "desc"` | No | `"desc"` | Sort direction |

**Used by:** [Client API](client.md) - List/discover endpoints

---

### PaginatedResponse\<T\>

Generic wrapper for paginated API responses.

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**Zod Schema (factory):**
```typescript
function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `T[]` | Array of items for current page |
| `total` | `number` | Total number of items across all pages |
| `page` | `number` | Current page number |
| `limit` | `number` | Items per page |
| `totalPages` | `number` | Total number of pages |

**Example:**
```typescript
const response: PaginatedResponse<Agent> = {
  items: [agent1, agent2, agent3],
  total: 47,
  page: 1,
  limit: 20,
  totalPages: 3
};
```

---

### AletheiaLogger

Pluggable logger interface for SDK observability.

```typescript
interface AletheiaLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
```

| Method | Description |
|--------|-------------|
| `debug(message, context?)` | Log debug-level message |
| `info(message, context?)` | Log info-level message |
| `warn(message, context?)` | Log warning-level message |
| `error(message, context?)` | Log error-level message |

**Usage with popular loggers:**

```typescript
// Pino
import pino from 'pino';
const logger: AletheiaLogger = pino({ level: 'debug' });

// Winston
import winston from 'winston';
const logger: AletheiaLogger = winston.createLogger({
  level: 'debug',
  transports: [new winston.transports.Console()]
});

// Console (simple)
const logger: AletheiaLogger = {
  debug: (msg, ctx) => console.debug(msg, ctx),
  info: (msg, ctx) => console.info(msg, ctx),
  warn: (msg, ctx) => console.warn(msg, ctx),
  error: (msg, ctx) => console.error(msg, ctx),
};
```

**Used by:** [Client API](client.md) - Client initialization options

---

### AletheiaLogLevel

Log level enumeration.

```typescript
type AletheiaLogLevel = "debug" | "info" | "warn" | "error";
```

---

### AletheiaEventType

All available event types for SDK lifecycle monitoring.

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

| Event | Description |
|-------|-------------|
| `agent.start` | Agent client started |
| `agent.stop` | Agent client stopped |
| `message.received` | Message received from agent |
| `message.sent` | Message sent to agent |
| `message.failed` | Message delivery failed |
| `trust.verified` | Trust verification successful |
| `trust.failed` | Trust verification failed |
| `rating.submitted` | Rating submitted successfully |
| `rating.received` | Rating received from another agent |
| `discovery.search` | Agent discovery search initiated |
| `discovery.connect` | Connected to discovered agent |
| `liveness.check` | Liveness check initiated |
| `liveness.result` | Liveness check completed |

---

### AletheiaEvent

Event object passed to event handlers.

```typescript
interface AletheiaEvent {
  type: AletheiaEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `AletheiaEventType` | Yes | Event type identifier |
| `timestamp` | `Date` | Yes | When the event occurred |
| `data` | `Record<string, unknown>` | No | Event-specific payload |

**Example:**
```typescript
const event: AletheiaEvent = {
  type: "message.received",
  timestamp: new Date(),
  data: {
    fromDid: "did:web:agent.example.com",
    messageType: "task_response",
    taskId: "abc-123"
  }
};
```

---

### AletheiaEventHandler

Handler function type for SDK events.

```typescript
type AletheiaEventHandler = (event: AletheiaEvent) => void;
```

**Usage:**
```typescript
const handler: AletheiaEventHandler = (event) => {
  console.log(`[${event.type}]`, event.data);
};

client.on('message.received', handler);
```

---

## Signing Types

Types for cryptographic signing and message authentication.

### AgentKeyPair

Ed25519 key pair for agent identity and message signing.

```typescript
interface AgentKeyPair {
  /** Private key (hex string) - KEEP SECRET! */
  privateKey: string;
  /** Public key (hex string) */
  publicKey: string;
  /** Public key in multibase format (for DID documents) */
  publicKeyMultibase: string;
  /** Generated did:key identifier */
  didKey: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `privateKey` | `string` | Hex-encoded private key (32 bytes). **Must be kept secret!** |
| `publicKey` | `string` | Hex-encoded public key (32 bytes) |
| `publicKeyMultibase` | `string` | Base58btc multibase-encoded public key with Ed25519 multicodec prefix |
| `didKey` | `string` | Full `did:key` identifier derived from public key |

**Example:**
```typescript
const keys: AgentKeyPair = {
  privateKey: "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60",
  publicKey: "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a",
  publicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq",
  didKey: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq"
};
```

**Used by:** `generateAgentKeyPair()`, `signAgentMessage()`, `verifyAgentSignature()`

---

### SignedMessage\<T\>

A cryptographically signed message with Ed25519 signature.

```typescript
interface SignedMessage<T = unknown> {
  /** The original message payload */
  payload: T;
  /** Ed25519 signature (hex string) */
  signature: string;
  /** DID of the signer */
  signer: string;
  /** Timestamp when signed (Unix milliseconds) */
  timestamp: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload` | `T` | Original message data |
| `signature` | `string` | Hex-encoded Ed25519 signature |
| `signer` | `string` | DID of the message signer |
| `timestamp` | `number` | Unix timestamp in milliseconds |

**Example:**
```typescript
const signed: SignedMessage<{ action: string }> = {
  payload: { action: "execute" },
  signature: "a1b2c3d4...",
  signer: "did:key:z6Mk...",
  timestamp: 1708051200000
};
```

**Used by:** `signAgentMessage()`, `verifyAgentSignature()`, `verifyAgentMessageWithDID()`

---

### SignedPayload

EIP-712 signed rating payload for Ethereum-based verification.

```typescript
interface SignedPayload {
  /** JSON-encoded rating payload */
  payload: string;
  /** EIP-712 signature */
  signature: string;
  /** Ethereum address of the signer */
  signer: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `payload` | `string` | JSON-stringified `RatingPayloadMessage` |
| `signature` | `string` | Hex-encoded EIP-712 typed data signature |
| `signer` | `string` | Ethereum address (0x...) of the signer |

**Used by:** `signRatingPayload()`, `verifyRatingSignature()`

---

### RatingPayloadMessage

Rating payload structure for EIP-712 typed data signing.

```typescript
interface RatingPayloadMessage {
  fromDid: string;
  toDid: string;
  score: number;
  chainId: number | bigint;
  powNonce: string;
  powHash: string;
  challengeId: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fromDid` | `string` | DID of the rater |
| `toDid` | `string` | DID of the agent being rated |
| `score` | `number` | Rating score (1-5) |
| `chainId` | `number \| bigint` | Blockchain network ID |
| `powNonce` | `string` | Proof-of-work nonce |
| `powHash` | `string` | Proof-of-work hash solution |
| `challengeId` | `string` | UUID of the PoW challenge |

**EIP-712 Domain:**
```typescript
{
  name: "Aletheia Reputation",
  version: "1",
  chainId: <chainId>
}
```

**Used by:** `signRatingPayload()`, `verifyRatingSignature()`, `hashRatingPayload()`

---

## Related APIs

- [Identity API](identity.md) - DID resolution, manifest fetching, message signing
- [Client API](client.md) - High-level client interface
- [Getting Started](../getting-started.md) - Quick start guide
