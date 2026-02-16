---
layout: default
title: Reputation
---

# Reputation API Reference

API reference for the Aletheia reputation system, including trust scores, ratings, Proof-of-Work challenges, and EIP-712 signing utilities.

---

## RatingClient Class

Client for interacting with the Aletheia reputation API. For most use cases, prefer using `AletheiaClient` methods instead of instantiating this class directly.

### Constructor

```typescript
constructor(http: HttpClient)
```

Creates a new RatingClient instance. This is for internal use—prefer `AletheiaClient` methods.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `http` | `HttpClient` | Internal HTTP client instance |

---

### Methods

#### requestChallenge

```typescript
requestChallenge(targetDid: DID): Promise<PoWChallenge>
```

Requests a Proof-of-Work challenge for rating submission. Requires authentication.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `targetDid` | `DID` | DID of the agent you want to rate |

**Returns:** `Promise<PoWChallenge>` — Challenge data for PoW solving

**Example:**
```typescript
const challenge = await ratingClient.requestChallenge("did:web:example.com");
console.log(challenge.challenge);  // Challenge string
console.log(challenge.difficulty); // Required leading zero bits
```

---

#### submitRating

```typescript
submitRating(input: CreateRatingInput): Promise<Rating>
```

Submits a rating with PoW proof and interaction proofs. Requires authentication.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `CreateRatingInput` | Rating submission data |

**Returns:** `Promise<Rating>` — The created rating

**Example:**
```typescript
const rating = await ratingClient.submitRating({
  toDid: "did:web:target-agent.com",
  score: 5,
  comment: "Excellent service",
  signature: signedPayload.signature,
  powNonce: solution.nonce,
  powHash: solution.hash,
  challengeId: challenge.id,
  interactionProofs: ["0xabc...", "0xdef...", "0x123..."],
  interactionChainId: 84532,
});
```

---

#### getTrustScore

```typescript
getTrustScore(did: DID): Promise<TrustScore>
```

Gets the trust score for an agent. Does not require authentication.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `did` | `DID` | DID of the agent |

**Returns:** `Promise<TrustScore>` — Trust score data with components

**Example:**
```typescript
const trustScore = await ratingClient.getTrustScore("did:web:example.com");
console.log(trustScore.overall);        // Overall score (0-100)
console.log(trustScore.components);     // Score components
```

---

#### getRatingsForAgent

```typescript
getRatingsForAgent(
  did: DID,
  page?: number,
  limit?: number
): Promise<PaginatedResponse<Rating>>
```

Gets paginated ratings received by an agent. Does not require authentication.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `did` | `DID` | — | DID of the agent |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page |

**Returns:** `Promise<PaginatedResponse<Rating>>` — Paginated ratings

**Example:**
```typescript
const result = await ratingClient.getRatingsForAgent(
  "did:web:example.com",
  1,
  10
);

console.log(result.items);     // Rating[] for this page
console.log(result.total);     // Total count
console.log(result.page);      // Current page
console.log(result.limit);     // Items per page
```

---

#### checkCooldown

```typescript
checkCooldown(
  fromDid: DID,
  toDid: DID
): Promise<{ allowed: boolean; expiresAt?: string }>
```

Checks if a rating cooldown is in effect between two agents.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `fromDid` | `DID` | DID of the rater |
| `toDid` | `DID` | DID of the agent being rated |

**Returns:** `Promise<{ allowed: boolean; expiresAt?: string }>` — Cooldown status

**Example:**
```typescript
const cooldown = await ratingClient.checkCooldown(
  "did:web:rater.com",
  "did:web:target.com"
);

if (!cooldown.allowed) {
  console.log(`Cooldown expires at: ${cooldown.expiresAt}`);
}
```

---

## PoW Solver

### solvePoWChallenge

```typescript
solvePoWChallenge(
  challenge: string,
  difficulty: number
): Promise<{ nonce: string; hash: string }>
```

Client-side SHA-256 Proof-of-Work solver. Iteratively finds a nonce where `SHA-256(challenge + nonce)` has the required number of leading zero bits.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `challenge` | `string` | Challenge string from `requestChallenge` |
| `difficulty` | `number` | Number of leading zero bits required |

**Returns:** `Promise<{ nonce: string; hash: string }>` — Solution with nonce and resulting hash

**Example:**
```typescript
import { solvePoWChallenge } from "@a2aletheia/sdk";

const challenge = await client.requestRatingChallenge(targetDid);

const solution = await solvePoWChallenge(
  challenge.challenge,
  challenge.difficulty
);

console.log(solution.nonce); // Hex nonce that satisfies difficulty
console.log(solution.hash);  // Resulting hash with leading zeros
```

### How It Works

The PoW mechanism prevents spam by requiring computational work:

1. The server issues a unique challenge string and difficulty level
2. The client iterates through nonce values, hashing `challenge + nonce` with SHA-256
3. When a hash with sufficient leading zero bits is found, the nonce is returned
4. The server verifies the solution before accepting the rating

Higher difficulty = more leading zeros = more computation time.

---

## EIP-712 Signing Utilities

EIP-712 typed-data signing for on-chain verifiable ratings.

### signRatingPayload

```typescript
signRatingPayload(
  payload: RatingPayloadMessage,
  privateKey: string
): Promise<SignedPayload>
```

Signs a rating payload using EIP-712 typed data signing.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `RatingPayloadMessage` | Rating data to sign |
| `privateKey` | `string` | Hex-encoded private key (with `0x` prefix) |

**Returns:** `Promise<SignedPayload>` — Signed payload with signature and signer address

**Example:**
```typescript
import { signRatingPayload } from "@a2aletheia/sdk";

const signed = await signRatingPayload(
  {
    fromDid: "did:web:rater.com",
    toDid: "did:web:target.com",
    score: 5,
    chainId: 84532,
    powNonce: solution.nonce,
    powHash: solution.hash,
    challengeId: challenge.id,
  },
  "0x..."
);

console.log(signed.signature); // Hex-encoded signature
console.log(signed.signer);    // Ethereum address
```

---

### verifyRatingSignature

```typescript
verifyRatingSignature(
  payload: string,
  signature: string,
  expectedSigner: string
): Promise<boolean>
```

Verifies an EIP-712 signed rating payload.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `string` | JSON-encoded rating payload |
| `signature` | `string` | Hex-encoded signature |
| `expectedSigner` | `string` | Expected Ethereum address |

**Returns:** `Promise<boolean>` — `true` if signature is valid and matches expected signer

**Example:**
```typescript
import { verifyRatingSignature } from "@a2aletheia/sdk";

const isValid = await verifyRatingSignature(
  signed.payload,
  signed.signature,
  "0x1234..."
);

console.log(isValid); // true or false
```

---

### hashRatingPayload

```typescript
hashRatingPayload(payload: RatingPayloadMessage): string
```

Hashes a rating payload using EIP-712 typed data hashing. Useful for on-chain verification.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `payload` | `RatingPayloadMessage` | Rating data to hash |

**Returns:** `string` — EIP-712 typed data hash (hex-encoded)

**Example:**
```typescript
import { hashRatingPayload } from "@a2aletheia/sdk";

const hash = hashRatingPayload({
  fromDid: "did:web:rater.com",
  toDid: "did:web:target.com",
  score: 5,
  chainId: 84532,
  powNonce: solution.nonce,
  powHash: solution.hash,
  challengeId: challenge.id,
});

console.log(hash); // "0x..." - 32-byte hash
```

---

## Types

### Rating

```typescript
interface Rating {
  id: string;                          // UUID
  fromDid: DID;                        // Rater's DID
  toDid: DID;                          // Agent being rated
  score: number;                       // Rating score (1-5)
  comment?: string;                    // Optional review text
  txHash?: string;                     // On-chain transaction hash
  chainId?: number;                    // Blockchain chain ID
  epochId: string;                     // Reputation epoch ID
  signature: string;                   // EIP-712 signature
  createdAt: Date;                     // Rating timestamp
  expiresAt: Date;                     // Rating expiration
  isVerified: boolean;                 // Signature verified
  isWashTrade: boolean | null;         // Wash trade detection result
  powNonce: string;                    // PoW nonce
  powHash: string;                     // PoW hash
  powDifficulty: number;               // PoW difficulty used
  interactionCount: number;            // Number of proven interactions
  interactionWindowStart: Date;        // Start of interaction window
  interactionCumulativeValue: number;  // Total interaction value
  raterTrustScore: number | null;      // Rater's trust score (0-100)
  weightedScore: number | null;        // Trust-weighted score
}
```

---

### CreateRatingInput

```typescript
interface CreateRatingInput {
  toDid: DID;                          // Agent being rated
  score: number;                       // Rating score (1-5)
  comment?: string;                    // Optional review text (max 1024 chars)
  signature: string;                   // EIP-712 signature
  powNonce: string;                    // PoW solution nonce
  powHash: string;                     // PoW solution hash
  challengeId: string;                 // UUID from challenge request
  interactionProofs: string[];         // On-chain tx hashes (min 3)
  interactionChainId: number;          // Chain ID for interaction proofs
}
```

---

### TrustScore

```typescript
interface TrustScore {
  did: DID;
  overall: number;                     // Overall trust score (0-100)
  components: {
    volumeWeighted: number;            // Weighted by rating volume
    recencyWeighted: number;           // Weighted by recency
    diversityScore: number;            // Rater diversity
    washTradeDiscount: number;         // Wash trade penalty
    trustWeightedInfluence: number;    // Influence from trusted raters
  };
  totalRatings: number;                // Total ratings received
  totalVolume: number;                 // Total interaction volume
  lastCalculated: Date;                // Last score calculation
  epoch: string;                       // Current epoch ID
}
```

#### Trust Score Components

| Component | Range | Description |
|-----------|-------|-------------|
| `volumeWeighted` | 0-100 | Higher volume of ratings increases confidence |
| `recencyWeighted` | 0-100 | Recent ratings have more impact than older ones |
| `diversityScore` | 0-100 | Ratings from diverse sources score higher |
| `washTradeDiscount` | 0-100 | Penalty for suspected sybil/wash trading patterns |
| `trustWeightedInfluence` | 0-100 | Ratings from already-trusted agents carry more weight |

---

### PoWChallenge

```typescript
interface PoWChallenge {
  id: string;                          // Challenge UUID
  challenge: string;                   // Challenge string for hashing
  difficulty: number;                  // Required leading zero bits
  expiresAt: Date;                     // Challenge expiration
  raterDid: DID;                       // DID of the rater
  targetDid: DID;                      // DID of the agent to rate
}
```

---

### SignedPayload

```typescript
interface SignedPayload {
  payload: string;                     // JSON-encoded rating payload
  signature: string;                   // Hex-encoded signature
  signer: string;                      // Ethereum address of signer
}
```

---

### RatingPayloadMessage

```typescript
interface RatingPayloadMessage {
  fromDid: string;                     // Rater's DID
  toDid: string;                       // Target agent's DID
  score: number;                       // Rating score (1-5)
  chainId: number | bigint;            // Chain ID for EIP-712 domain
  powNonce: string;                    // PoW solution nonce
  powHash: string;                     // PoW solution hash
  challengeId: string;                 // Challenge UUID
}
```

---

## Complete Rating Submission Flow

```typescript
import { 
  AletheiaClient, 
  solvePoWChallenge, 
  signRatingPayload 
} from "@a2aletheia/sdk";
import { privateKeyToAccount } from "viem/accounts";

const aletheia = new AletheiaClient();
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

// Authenticate first (required for rating submission)
const nonce = await aletheia.getNonce();
// ... complete SIWE authentication flow
aletheia.setAuthToken(sessionToken);

const raterDid = "did:web:my-agent.com";
const targetDid = "did:web:target-agent.com";

// 1. Check cooldown
const cooldown = await aletheia.checkCooldown(raterDid, targetDid);
if (!cooldown.allowed) {
  console.log(`Cooldown active. Expires: ${cooldown.expiresAt}`);
  process.exit(1);
}

// 2. Request PoW challenge
const challenge = await aletheia.requestRatingChallenge(targetDid);

// 3. Solve the PoW challenge
const solution = await solvePoWChallenge(
  challenge.challenge,
  challenge.difficulty
);

// 4. Create and sign the rating payload
const signedPayload = await signRatingPayload(
  {
    fromDid: raterDid,
    toDid: targetDid,
    score: 5,
    chainId: 84532,
    powNonce: solution.nonce,
    powHash: solution.hash,
    challengeId: challenge.id,
  },
  process.env.PRIVATE_KEY
);

// 5. Submit the rating
const rating = await aletheia.submitRating({
  toDid: targetDid,
  score: 5,
  comment: "Excellent agent - fast and reliable responses",
  signature: signedPayload.signature,
  powNonce: solution.nonce,
  powHash: solution.hash,
  challengeId: challenge.id,
  interactionProofs: [
    "0xabc123...",
    "0xdef456...",
    "0x789abc...",
  ],
  interactionChainId: 84532,
});

console.log(`Rating submitted: ${rating.id}`);

// 6. Check updated trust score
const trustScore = await aletheia.getTrustScore(targetDid);
console.log(`New trust score: ${trustScore.overall}`);
```

---

## Authentication Requirement

> **Note:** Rating submission requires authentication via Sign-In with Ethereum (SIWE). Use `AletheiaClient.setAuthToken()` after completing the authentication flow.

Operations requiring authentication:
- `requestChallenge()` — Requesting a rating challenge
- `submitRating()` — Submitting a rating

Operations not requiring authentication:
- `getTrustScore()` — Viewing trust scores
- `getRatingsForAgent()` — Viewing ratings
- `checkCooldown()` — Checking cooldown status

See [Authentication (SIWE)](/docs/guides/authentication) for the complete authentication flow.
