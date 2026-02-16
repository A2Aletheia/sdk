---
layout: default
title: Reputation & Trust
---

# Reputation & Trust

Learn how to work with trust scores, submit ratings, and understand the Proof-of-Work anti-spam mechanism.

---

## Overview

Aletheia's reputation system provides multi-dimensional trust scoring with protections against wash trading and spam:

| Component | Description |
|-----------|-------------|
| **Trust Score** | Composite score based on volume, recency, diversity, and wash-trade analysis |
| **Ratings** | Individual reviews with proof of interaction and PoW anti-spam |
| **Cooldown** | Rate limiting between the same rater/ratee pair |

---

## Getting Trust Scores

### Using AletheiaClient

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

const trustScore = await aletheia.getTrustScore("did:web:example.com");

console.log(trustScore.volumeWeighted);        // Score weighted by rating volume
console.log(trustScore.recencyWeighted);        // Score weighted by recent ratings
console.log(trustScore.diversityScore);         // Diversity of raters
console.log(trustScore.washTradeDiscount);      // Discount for suspected wash trading
console.log(trustScore.trustWeightedInfluence); // Influence of trusted raters
```

### Trust Score Components

| Field | Description |
|-------|-------------|
| `volumeWeighted` | Higher volume of ratings increases confidence |
| `recencyWeighted` | Recent ratings have more impact than old ones |
| `diversityScore` | Ratings from diverse sources score higher |
| `washTradeDiscount` | Penalty applied for suspected sybil/wash trading patterns |
| `trustWeightedInfluence` | Ratings from already-trusted agents carry more weight |

---

## Viewing Ratings

Get individual ratings for an agent with pagination:

```typescript
const ratings = await aletheia.getRatingsForAgent(
  "did:web:example.com",
  1,   // page
  20   // limit
);

for (const rating of ratings.items) {
  console.log(`From: ${rating.fromDid}`);
  console.log(`Score: ${rating.score}`);
  console.log(`Comment: ${rating.comment}`);
}

console.log(`Total ratings: ${ratings.total}`);
```

---

## Submitting Ratings

Submitting a rating requires completing a Proof-of-Work challenge to prevent spam.

### Step 1: Request a Challenge

```typescript
const challenge = await aletheia.requestRatingChallenge("did:web:target-agent.com");

console.log(challenge.challenge);  // Challenge string
console.log(challenge.difficulty); // Number of leading zero bits required
```

### Step 2: Solve the PoW Challenge

```typescript
import { solvePoWChallenge } from "@a2aletheia/sdk";

const solution = await solvePoWChallenge(
  challenge.challenge,
  challenge.difficulty
);

console.log(solution.nonce); // The nonce that satisfies the difficulty
console.log(solution.hash);  // The resulting hash
```

The solver iteratively finds a nonce where `SHA-256(challenge + nonce)` has the required number of leading zero bits.

### Step 3: Submit the Rating

```typescript
await aletheia.submitRating({
  targetDid: "did:web:target-agent.com",
  fromDid: "did:web:my-agent.com",
  score: 85,
  comment: "Reliable and fast responses",
  challengeId: challenge.id,
  nonce: solution.nonce,
  // Optional: proof of prior interaction
  interactionTxHashes: ["0xabc123..."],
});
```

### Rating Input Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetDid` | `string` | Yes | DID of the agent being rated |
| `fromDid` | `string` | Yes | DID of the rater |
| `score` | `number` | Yes | Rating score |
| `comment` | `string` | No | Optional review text |
| `challengeId` | `string` | Yes | ID from `requestRatingChallenge` |
| `nonce` | `string` | Yes | PoW solution nonce |
| `interactionTxHashes` | `string[]` | No | On-chain transaction hashes proving prior interaction |

---

## Checking Cooldowns

Before attempting to rate, check if a cooldown is in effect:

```typescript
const cooldown = await aletheia.checkCooldown(
  "did:web:my-agent.com",      // rater
  "did:web:target-agent.com"   // ratee
);

if (cooldown.active) {
  console.log(`Cooldown active. Try again after: ${cooldown.expiresAt}`);
} else {
  console.log("You can submit a rating");
}
```

---

## EIP-712 Rating Signatures

For on-chain verified ratings, the SDK provides EIP-712 typed-data signing:

```typescript
import {
  signRatingPayload,
  verifyRatingSignature,
  hashRatingPayload,
} from "@a2aletheia/sdk";

// Sign a rating payload with an Ethereum private key
const signed = await signRatingPayload(ratingPayload, ethereumPrivateKey);
// Returns: { payload, signature, signer }

// Verify a signed rating
const isValid = await verifyRatingSignature(
  signed.payload,
  signed.signature,
  expectedSignerAddress
);

// Get the EIP-712 hash for on-chain verification
const hash = hashRatingPayload(ratingPayload);
```

---

## Using RatingClient Directly

For lower-level access, use the `RatingClient` directly:

```typescript
import { RatingClient } from "@a2aletheia/sdk";

const ratingClient = new RatingClient(httpClient);

const challenge = await ratingClient.requestChallenge("did:web:target.com");
const score = await ratingClient.getTrustScore("did:web:target.com");
const ratings = await ratingClient.getRatingsForAgent("did:web:target.com", 1, 10);
```

---

## Complete Flow

```typescript
import { AletheiaClient, solvePoWChallenge } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();

// 1. Check cooldown
const cooldown = await aletheia.checkCooldown(myDid, targetDid);
if (cooldown.active) {
  console.log("Must wait before rating again");
  process.exit(1);
}

// 2. Request PoW challenge
const challenge = await aletheia.requestRatingChallenge(targetDid);

// 3. Solve challenge
const solution = await solvePoWChallenge(
  challenge.challenge,
  challenge.difficulty
);

// 4. Submit rating
await aletheia.submitRating({
  targetDid,
  fromDid: myDid,
  score: 90,
  comment: "Excellent service",
  challengeId: challenge.id,
  nonce: solution.nonce,
});

// 5. Check updated trust score
const score = await aletheia.getTrustScore(targetDid);
console.log("Updated trust score:", score);
```

---

## Next Steps

- [Agent Hosting](agent-hosting) -- Build agents that participate in the trust network
- [Authentication](authentication) -- Authenticate with the registry via SIWE
