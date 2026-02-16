---
layout: default
title: AletheiaClient
---

# AletheiaClient

The main entry point for interacting with the Aletheia network. Provides methods for authentication, agent discovery, identity resolution, and reputation management.

## Installation

```typescript
import { AletheiaClient } from "@aletheia/sdk";
```

## Constructor

### Zero-configuration

```typescript
const client = new AletheiaClient();
```

Creates a client with default configuration, connecting to the Aletheia staging network.

### With options

```typescript
const client = new AletheiaClient({
  apiUrl: "https://custom-api.example.com",
  chainId: 84532,
});
```

## Configuration

### AletheiaClientConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `apiUrl` | `string` | No | Override the default API URL |
| `chainId` | `number` | No | Blockchain chain ID for registry operations |

### Configuration Resolution Order

The API URL is resolved with the following precedence:

1. **Explicit argument** - `apiUrl` passed to constructor
2. **Environment variable** - `ALETHEIA_API_URL`
3. **Built-in default** - `https://aletheia-api.vercel.app`

```typescript
// Precedence example
process.env.ALETHEIA_API_URL = "https://env.example.com";

const client1 = new AletheiaClient();
// Uses: https://env.example.com

const client2 = new AletheiaClient({ apiUrl: "https://explicit.example.com" });
// Uses: https://explicit.example.com
```

---

## Authentication

### setAuthToken

Sets the authentication token for subsequent requests.

```typescript
setAuthToken(token: string | null): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string \| null` | JWT session token from SIWE verification, or `null` to clear |

```typescript
// After SIWE login
client.setAuthToken(sessionToken);

// Clear authentication
client.setAuthToken(null);
```

### getNonce

Gets a SIWE (Sign-In with Ethereum) nonce for authentication.

```typescript
getNonce(): Promise<string>
```

**Returns:** `Promise<string>` - A unique nonce string for SIWE message construction

```typescript
const nonce = await client.getNonce();
console.log(nonce); // "a1b2c3d4e5f6..."
```

### verifySiwe

Verifies a SIWE message and signature to complete authentication.

```typescript
verifySiwe(
  message: string,
  signature: string
): Promise<{ address: string; sessionToken: string }>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | `string` | SIWE message string |
| `signature` | `string` | Hex-encoded signature |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `address` | `string` | The Ethereum address that signed the message |
| `sessionToken` | `string` | JWT token for authenticated requests |

```typescript
const nonce = await client.getNonce();

// Construct SIWE message (use siwe library)
const message = createSiweMessage({
  domain: window.location.host,
  address: walletAddress,
  statement: "Sign in to Aletheia",
  uri: window.location.origin,
  version: "1",
  chainId: 84532,
  nonce,
});

// Sign with wallet
const signature = await wallet.signMessage(message);

// Verify and get session token
const { address, sessionToken } = await client.verifySiwe(message, signature);

// Set token for authenticated requests
client.setAuthToken(sessionToken);
```

---

## Discovery

### discoverAgents

Discovers agents based on capability, trust score, and liveness filters.

```typescript
discoverAgents(params: {
  capability?: string;
  query?: string;
  minTrustScore?: number;
  isLive?: boolean;
  limit?: number;
}): Promise<PaginatedResponse<Agent>>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `capability` | `string` | Filter by capability/skill ID |
| `query` | `string` | Text search query |
| `minTrustScore` | `number` | Minimum trust score (0-100) |
| `isLive` | `boolean` | Filter by liveness status |
| `limit` | `number` | Maximum number of results |

**Returns:** `Promise<PaginatedResponse<Agent>>`

```typescript
// Find live agents with minimum trust score
const results = await client.discoverAgents({
  minTrustScore: 50,
  isLive: true,
  limit: 10,
});

// Search by capability
const translators = await client.discoverAgents({
  capability: "translation",
  limit: 20,
});
```

### searchAgents

Searches for agents with pagination and filtering.

```typescript
searchAgents(params: {
  status?: AgentStatus;
  search?: string;
  minTrustScore?: number;
  capability?: string;
  isLive?: boolean;
  isBattleTested?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Agent>>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | `AgentStatus` | Filter by status: `"active"`, `"inactive"`, `"suspended"`, `"pending"` |
| `search` | `string` | Text search in name/description |
| `minTrustScore` | `number` | Minimum trust score (0-100) |
| `capability` | `string` | Filter by capability |
| `isLive` | `boolean` | Filter by liveness |
| `isBattleTested` | `boolean` | Filter by battle-tested status |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 20, max: 100) |

**Returns:** `Promise<PaginatedResponse<Agent>>`

```typescript
// Paginated search
const page1 = await client.searchAgents({
  status: "active",
  search: "translation",
  page: 1,
  limit: 20,
});

console.log(`Found ${page1.total} agents, showing page ${page1.page} of ${page1.totalPages}`);

// Get next page
if (page1.page < page1.totalPages) {
  const page2 = await client.searchAgents({ page: 2, limit: 20 });
}
```

### getAgent

Gets a single agent by its DID.

```typescript
getAgent(did: DID): Promise<Agent>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | Agent's decentralized identifier |

**Returns:** `Promise<Agent>`

```typescript
const agent = await client.getAgent("did:web:agent.example.com");
console.log(agent.name);
console.log(`Trust score: ${agent.trustScore}`);
console.log(`Is live: ${agent.isLive}`);
```

### checkLiveness

Checks if an agent is currently live and responding.

```typescript
checkLiveness(did: DID): Promise<boolean>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | Agent's decentralized identifier |

**Returns:** `Promise<boolean>` - `true` if agent is live

```typescript
const isLive = await client.checkLiveness("did:web:agent.example.com");
if (!isLive) {
  console.warn("Agent is not responding");
}
```

---

## Identity

### resolveDID

Resolves a DID to its DID document.

```typescript
resolveDID(did: DID): Promise<DIDDocument>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | Decentralized identifier to resolve |

**Returns:** `Promise<DIDDocument>`

```typescript
const didDoc = await client.resolveDID("did:web:agent.example.com");
console.log(didDoc.id);
console.log(didDoc.verificationMethod);
```

### fetchManifest

Fetches an agent manifest from the well-known location.

```typescript
fetchManifest(baseUrl: string): Promise<AgentManifest>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `baseUrl` | `string` | Agent's base URL |

**Returns:** `Promise<AgentManifest>` - Fetches from `/.well-known/agent.json`

```typescript
const manifest = await client.fetchManifest("https://agent.example.com");
console.log(manifest.name);
console.log(manifest.skills);
```

### fetchManifestFromUrl

Fetches an agent manifest from an explicit URL.

```typescript
fetchManifestFromUrl(manifestUrl: string): Promise<AgentManifest>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `manifestUrl` | `string` | Full URL to the manifest JSON |

**Returns:** `Promise<AgentManifest>`

```typescript
const manifest = await client.fetchManifestFromUrl(
  "https://agent.example.com/custom-manifest.json"
);
```

### registerAgent

Registers a new agent with the Aletheia network.

```typescript
registerAgent(
  manifestUrl: string,
  ownerAddress?: string
): Promise<{
  agent: Agent;
  approval: {
    did: string;
    manifestUrl: string;
    deadline: number;
    nonce: number;
    signature: string;
    registryAddress: string;
  } | null;
}>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `manifestUrl` | `string` | URL to the agent's manifest |
| `ownerAddress` | `string` | Optional owner Ethereum address |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `agent` | `Agent` | The registered agent |
| `approval` | `object \| null` | On-chain approval data for registry |

```typescript
const { agent, approval } = await client.registerAgent(
  "https://my-agent.example.com/.well-known/agent.json",
  "0x1234567890abcdef1234567890abcdef12345678"
);

console.log(`Registered: ${agent.name} (${agent.did})`);

if (approval) {
  // Use approval data to register on-chain
  console.log("Registry address:", approval.registryAddress);
  console.log("Approval deadline:", approval.deadline);
}
```

### verifyAgentMessage

Verifies a signed message from an agent by resolving the signer's DID.

```typescript
verifyAgentMessage<T>(
  signedMessage: SignedMessage<T>
): Promise<{
  valid: boolean;
  didDocument: DIDDocument | null;
  error?: string;
}>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `signedMessage` | `SignedMessage<T>` | The signed message to verify |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | Whether the signature is valid |
| `didDocument` | `DIDDocument \| null` | Resolved DID document if successful |
| `error` | `string` | Error message if verification failed |

```typescript
const result = await client.verifyAgentMessage(signedMessage);

if (!result.valid) {
  throw new Error(`Message verification failed: ${result.error}`);
}

console.log(`Verified message from ${result.didDocument!.id}`);
```

---

## Reputation

### requestRatingChallenge

Requests a Proof-of-Work challenge for rating submission. Requires authentication.

```typescript
requestRatingChallenge(targetDid: DID): Promise<PoWChallenge>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetDid` | `DID` | DID of the agent being rated |

**Returns:** `Promise<PoWChallenge>`

```typescript
// Must be authenticated first
client.setAuthToken(sessionToken);

const challenge = await client.requestRatingChallenge("did:web:agent.example.com");
console.log("Challenge:", challenge.challenge);
console.log("Difficulty:", challenge.difficulty);
console.log("Expires:", challenge.expiresAt);
```

### submitRating

Submits a rating with PoW proof and interaction proofs. Requires authentication.

```typescript
submitRating(input: CreateRatingInput): Promise<Rating>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `CreateRatingInput` | Rating submission data |

**Returns:** `Promise<Rating>`

```typescript
const rating = await client.submitRating({
  toDid: "did:web:agent.example.com",
  score: 5,
  comment: "Excellent service!",
  signature: "0x...",
  powNonce: "12345",
  powHash: "0xabc123...",
  challengeId: "uuid-of-challenge",
  interactionProofs: ["0xtx1...", "0xtx2...", "0xtx3..."],
  interactionChainId: 84532,
});

console.log(`Rating submitted: ${rating.id}`);
```

### getTrustScore

Gets the trust score for an agent.

```typescript
getTrustScore(did: DID): Promise<TrustScore>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | Agent's decentralized identifier |

**Returns:** `Promise<TrustScore>`

```typescript
const trustScore = await client.getTrustScore("did:web:agent.example.com");
console.log(`Overall score: ${trustScore.overall}`);
console.log(`Total ratings: ${trustScore.totalRatings}`);
console.log("Components:", trustScore.components);
```

### getRatingsForAgent

Gets paginated ratings received by an agent.

```typescript
getRatingsForAgent(
  did: DID,
  page?: number,
  limit?: number
): Promise<PaginatedResponse<Rating>>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | Agent's decentralized identifier |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Results per page (default: 20) |

**Returns:** `Promise<PaginatedResponse<Rating>>`

```typescript
const ratings = await client.getRatingsForAgent(
  "did:web:agent.example.com",
  1,
  10
);

for (const rating of ratings.items) {
  console.log(`Score: ${rating.score}/5 - ${rating.comment || "No comment"}`);
}
```

### checkCooldown

Checks if a rater can submit a rating to a target (cooldown period).

```typescript
checkCooldown(
  fromDid: DID,
  toDid: DID
): Promise<{ allowed: boolean; expiresAt?: string }>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `fromDid` | `DID` | Rater's DID |
| `toDid` | `DID` | Target agent's DID |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `allowed` | `boolean` | Whether rating is allowed |
| `expiresAt` | `string` | ISO timestamp when cooldown expires |

```typescript
const { allowed, expiresAt } = await client.checkCooldown(
  "did:web:rater.example.com",
  "did:web:agent.example.com"
);

if (!allowed) {
  console.log(`Cooldown active until ${expiresAt}`);
}
```

---

## Types

### Agent

```typescript
interface Agent {
  id: string;                    // UUID
  did: DID;                      // did:web:example.com
  name: string;
  description?: string;
  url: string;                   // Agent endpoint URL
  manifestUrl: string;           // URL to agent manifest
  status: AgentStatus;           // "active" | "inactive" | "suspended" | "pending"
  trustScore: number | null;     // 0-100
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

### AgentManifest

```typescript
interface AgentManifest {
  // Core A2A fields
  name: string;
  description?: string;
  version: string;               // semver: "1.0.0"
  url: string;

  // Skills (what the agent can do)
  skills: Skill[];

  // Protocol capabilities
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };

  // Input/output modes
  defaultInputModes?: string[];
  defaultOutputModes?: string[];

  // Provider info
  provider?: {
    organization: string;
    url?: string;
    contact?: string;
  };

  // Security
  securitySchemes?: Record<string, unknown>;
  security?: Record<string, string[]>[];

  // Extended card support
  supportsAuthenticatedExtendedCard?: boolean;

  // Aletheia-specific extensions
  aletheiaExtensions?: {
    did?: DID;
    owner?: string;              // Ethereum address
    registryChain?: string;
    registryAddress?: string;
    livenessPingUrl?: string;
  };
}
```

### Skill

```typescript
interface Skill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}
```

### DIDDocument

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

interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
}

interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string;
}
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### TrustScore

```typescript
interface TrustScore {
  did: DID;
  overall: number;               // 0-100
  components: {
    volumeWeighted: number;
    recencyWeighted: number;
    diversityScore: number;
    washTradeDiscount: number;
    trustWeightedInfluence: number;
  };
  totalRatings: number;
  totalVolume: number;
  lastCalculated: Date;
  epoch: string;
}
```

### Rating

```typescript
interface Rating {
  id: string;
  fromDid: DID;
  toDid: DID;
  score: number;                 // 1-5
  comment?: string;
  txHash?: string;
  chainId?: number;
  epochId: string;
  signature: string;
  createdAt: Date;
  expiresAt: Date;
  isVerified: boolean;
  isWashTrade: boolean | null;

  // PoW fields
  powNonce: string;
  powHash: string;
  powDifficulty: number;

  // Interaction proof fields
  interactionCount: number;
  interactionWindowStart: Date;
  interactionCumulativeValue: number;

  // Trust-weighted influence
  raterTrustScore: number | null;
  weightedScore: number | null;
}
```

### CreateRatingInput

```typescript
interface CreateRatingInput {
  toDid: DID;
  score: number;                 // 1-5
  comment?: string;
  signature: string;

  // PoW proof
  powNonce: string;
  powHash: string;
  challengeId: string;           // UUID

  // Interaction proof
  interactionProofs: string[];   // Min 3 tx hashes
  interactionChainId: number;
}
```

### PoWChallenge

```typescript
interface PoWChallenge {
  id: string;                    // UUID
  challenge: string;
  difficulty: number;
  expiresAt: Date;
  raterDid: DID;
  targetDid: DID;
}
```

### SignedMessage

```typescript
interface SignedMessage<T = unknown> {
  payload: T;
  signature: string;             // Hex-encoded Ed25519 signature
  signer: string;                // DID of signer
  timestamp: number;             // Unix timestamp
}
```

### DID

```typescript
type DID = string;  // Matches: /^did:(web|key|ethr|pkh):.+$/

// Examples:
// "did:web:agent.example.com"
// "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
// "did:ethr:0x1234567890abcdef1234567890abcdef12345678"
// "did:pkh:eip155:1:0x1234567890abcdef1234567890abcdef12345678"
```

---

## Defaults

```typescript
const ALETHEIA_DEFAULTS = {
  API_URL: "https://aletheia-api.vercel.app",
  REGISTRY_URL: "https://aletheia-psi.vercel.app",
  CHAIN_ID: 84532,  // Base Sepolia testnet
};
```
