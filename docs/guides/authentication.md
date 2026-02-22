---
layout: default
title: Authentication (SIWE)
---

# Authentication (SIWE)

Learn how to authenticate with the Aletheia registry using Sign-In with Ethereum (SIWE).

---

## Overview

The Aletheia registry uses [Sign-In with Ethereum (SIWE)](https://eips.ethereum.org/EIPS/eip-4361) for wallet-based authentication. Authenticated sessions are required for actions like agent registration and rating submission.

### Authentication Flow

```
1. Client requests a nonce from the registry
2. Client constructs and signs a SIWE message with their wallet
3. Client sends the signed message to the registry for verification
4. Registry returns a session token
5. Client includes the token in subsequent requests
```

---

## Step-by-Step

### 1. Get a Nonce

Request a unique nonce from the registry to prevent replay attacks:

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";

const aletheia = new AletheiaClient();
const nonce = await aletheia.getNonce();
```

### 2. Sign the Message

Construct a SIWE message and sign it with your Ethereum wallet. This example uses `viem`:

```typescript
import { createSiweMessage } from "viem/siwe";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0x...");

const message = createSiweMessage({
  domain: "aletheia-api.vercel.app",
  address: account.address,
  statement: "Sign in to Aletheia",
  uri: "https://aletheia-api.vercel.app",
  version: "1",
  chainId: 84532, // Base Sepolia
  nonce,
});

const signature = await account.signMessage({ message });
```

### 3. Verify and Get Session Token

Submit the signed message to get a session token:

```typescript
const { sessionToken } = await aletheia.verifySiwe(message, signature);
```

### 4. Set Auth Token

Attach the token to the client for authenticated requests:

```typescript
aletheia.setAuthToken(sessionToken);

// Now you can perform authenticated actions
const agent = await aletheia.registerAgent(
  "https://my-agent.example.com/.well-known/agent-card.json"
);
```

---

## Complete Example

```typescript
import { AletheiaClient } from "@a2aletheia/sdk";
import { createSiweMessage } from "viem/siwe";
import { privateKeyToAccount } from "viem/accounts";

const aletheia = new AletheiaClient();
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

// 1. Get nonce
const nonce = await aletheia.getNonce();

// 2. Create and sign SIWE message
const message = createSiweMessage({
  domain: "aletheia-api.vercel.app",
  address: account.address,
  statement: "Sign in to Aletheia",
  uri: "https://aletheia-api.vercel.app",
  version: "1",
  chainId: 84532,
  nonce,
});

const signature = await account.signMessage({ message });

// 3. Verify and authenticate
const { sessionToken } = await aletheia.verifySiwe(message, signature);
aletheia.setAuthToken(sessionToken);

// 4. Perform authenticated actions
const agent = await aletheia.registerAgent(
  "https://my-agent.example.com/.well-known/agent-card.json",
  account.address
);

console.log(`Registered: ${agent.did}`);
```

---

## Authenticated Endpoints

The following operations require authentication:

| Operation | Method |
|-----------|--------|
| Register agent | `registerAgent()` |
| Submit rating | `submitRating()` |

Discovery and read-only operations (e.g., `searchAgents`, `getAgent`, `getTrustScore`) do not require authentication.

---

## Next Steps

- [Agent Discovery](agent-discovery) -- Discover and search agents
- [Reputation & Trust](reputation-trust) -- Submit ratings (requires auth)
