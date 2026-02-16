---
layout: default
title: Identity
---

# Identity API

The Identity module provides decentralized identifier (DID) resolution, agent manifest fetching, and cryptographic signing/verification for secure agent-to-agent authentication.

## DID Method Support

| Method | Description | Resolution |
|--------|-------------|------------|
| `did:web` | Domain-based DIDs | Fetches `/.well-known/did.json` via HTTPS |
| `did:key` | Self-contained key-based DIDs | Constructs DID Document from embedded key |

---

## Classes

### DIDResolver

Resolves DID documents for supported DID methods.

```typescript
import { DIDResolver } from '@a2aletheia/sdk';

const resolver = new DIDResolver();
```

#### Methods

##### `resolve(did: DID): Promise<DIDDocument>`

Resolves any supported DID method. Automatically routes to the appropriate resolver based on the DID method prefix.

**Parameters:**
- `did` - A valid DID string (e.g., `did:web:example.com` or `did:key:z6Mk...`)

**Returns:** Promise resolving to a DID Document

**Throws:** Error if DID method is unsupported

```typescript
const didDoc = await resolver.resolve('did:web:agent.example.com');
const didDoc = await resolver.resolve('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq');
```

##### `resolveWeb(did: DID): Promise<DIDDocument>`

Resolves a `did:web` DID by fetching the DID document from the well-known location.

**Resolution Logic:**
- `did:web:example.com` → `https://example.com/.well-known/did.json`
- `did:web:example.com:path:to:agent` → `https://example.com/path/to/agent/did.json`

**Parameters:**
- `did` - A valid `did:web` DID string

**Returns:** Promise resolving to a DID Document

**Throws:** Error if DID is invalid or HTTP request fails

```typescript
const didDoc = await resolver.resolveWeb('did:web:agent.example.com');
console.log(didDoc.id); // did:web:agent.example.com
```

##### `resolveKey(did: DID): Promise<DIDDocument>`

Resolves a `did:key` DID by constructing a DID Document from the embedded key material.

**Parameters:**
- `did` - A valid `did:key` DID string

**Returns:** Promise resolving to a constructed DID Document

**Supports:** Ed25519 and secp256k1 multicodec keys

```typescript
const didDoc = await resolver.resolveKey('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq');
console.log(didDoc.verificationMethod?.[0]?.publicKeyMultibase);
```

---

### ManifestFetcher

Fetches and validates A2A-compliant agent manifests from `.well-known` endpoints or explicit URLs.

```typescript
import { ManifestFetcher } from '@a2aletheia/sdk';

const fetcher = new ManifestFetcher();
```

#### Methods

##### `fetch(baseUrl: string): Promise<AgentManifest>`

Fetches an agent manifest from the standard `.well-known/agent.json` location.

**Parameters:**
- `baseUrl` - The base URL of the agent (e.g., `https://agent.example.com`)

**Returns:** Promise resolving to a validated `AgentManifest`

**Throws:** Error if fetch fails or manifest validation fails

```typescript
const manifest = await fetcher.fetch('https://agent.example.com');
console.log(manifest.name, manifest.skills);
```

##### `fetchFromUrl(manifestUrl: string): Promise<AgentManifest>`

Fetches an agent manifest from an explicit URL (not necessarily `.well-known`).

**Parameters:**
- `manifestUrl` - The full URL to the manifest JSON file

**Returns:** Promise resolving to a validated `AgentManifest`

**Throws:** Error if fetch fails or manifest validation fails

```typescript
const manifest = await fetcher.fetchFromUrl('https://cdn.example.com/agents/my-agent.json');
```

---

## Functions

### generateAgentKeyPair

Generates a new Ed25519 key pair suitable for agent identity and message signing.

```typescript
function generateAgentKeyPair(): Promise<AgentKeyPair>
```

**Returns:** Promise resolving to an `AgentKeyPair` object

```typescript
import { generateAgentKeyPair } from '@a2aletheia/sdk';

const keys = await generateAgentKeyPair();
console.log(keys.didKey); // did:key:z6Mk...
console.log(keys.publicKeyMultibase); // z6Mk...
```

> **⚠️ Security Warning:** Store `keys.privateKey` securely and never expose it in logs, client-side code, or version control. The private key is the cryptographic proof of agent identity.

---

### signAgentMessage

Signs a message with an agent's private key, creating a verifiable signed message.

```typescript
function signAgentMessage<T>(
  message: T,
  privateKey: string,
  signerDid: string
): Promise<SignedMessage<T>>
```

**Parameters:**
- `message` - The payload to sign (will be JSON stringified)
- `privateKey` - Agent's private key as hex string
- `signerDid` - The DID of the signing agent

**Returns:** Promise resolving to a `SignedMessage<T>`

```typescript
import { signAgentMessage } from '@a2aletheia/sdk';

const signed = await signAgentMessage(
  { action: 'book', hotelId: '123', dates: ['2024-03-15'] },
  keys.privateKey,
  keys.didKey
);

// signed = {
//   payload: { action: 'book', ... },
//   signature: 'a1b2c3...',
//   signer: 'did:key:z6Mk...',
//   timestamp: 1708051200000
// }
```

---

### verifyAgentSignature

Verifies a signed message using the signer's known public key.

```typescript
function verifyAgentSignature<T>(
  signedMessage: SignedMessage<T>,
  publicKey: string
): Promise<boolean>
```

**Parameters:**
- `signedMessage` - The signed message to verify
- `publicKey` - Signer's public key as hex string

**Returns:** Promise resolving to `true` if signature is valid, `false` otherwise

```typescript
import { verifyAgentSignature } from '@a2aletheia/sdk';

const isValid = await verifyAgentSignature(signed, keys.publicKey);
if (!isValid) {
  throw new Error('Signature verification failed');
}
```

---

### verifyAgentMessageWithDID

Verifies a signed message by resolving the signer's DID document. This is the primary method for agent-to-agent authentication.

```typescript
function verifyAgentMessageWithDID<T>(
  signedMessage: SignedMessage<T>,
  didDocument: DIDDocument
): Promise<boolean>
```

**Parameters:**
- `signedMessage` - The signed message to verify
- `didDocument` - The signer's resolved DID document

**Returns:** Promise resolving to `true` if signature is valid and matches the DID document

**Verification Process:**
1. Validates DID document ID matches the signer
2. Extracts public key from verification methods
3. Verifies signature against the extracted key

```typescript
import { DIDResolver, verifyAgentMessageWithDID } from '@a2aletheia/sdk';

const resolver = new DIDResolver();
const didDoc = await resolver.resolve(signedMessage.signer);

const isValid = await verifyAgentMessageWithDID(signedMessage, didDoc);
if (!isValid) {
  throw new Error('Message signature invalid - not from claimed agent!');
}
```

---

## Types

### AgentKeyPair

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

### SignedMessage\<T\>

```typescript
interface SignedMessage<T = unknown> {
  /** The original message payload */
  payload: T;
  
  /** Ed25519 signature (hex string) */
  signature: string;
  
  /** DID of the signer */
  signer: string;
  
  /** Timestamp when signed (Unix ms) */
  timestamp: number;
}
```

### DID

```typescript
type DID = string; // Must match pattern: ^did:(web|key|ethr|pkh):.+$
```

### DIDDocument

```typescript
interface DIDDocument {
  '@context': string[];
  id: string;
  controller?: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  service?: DIDService[];
}
```

### VerificationMethod

```typescript
interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
}
```

### DIDService

```typescript
interface DIDService {
  id: string;
  type: string;
  serviceEndpoint: string; // URL
}
```

---

## Examples

### Key Generation and Secure Storage

```typescript
import { generateAgentKeyPair } from '@a2aletheia/sdk';

// Generate identity keys
const keys = await generateAgentKeyPair();

console.log('Agent DID:', keys.didKey);
console.log('Public Key (multibase):', keys.publicKeyMultibase);

// CRITICAL: Store privateKey securely (env vars, secrets manager, etc.)
// NEVER commit to version control or expose in client-side code
await storeSecurely('AGENT_PRIVATE_KEY', keys.privateKey);
```

### DID Resolution

```typescript
import { DIDResolver } from '@a2aletheia/sdk';

const resolver = new DIDResolver();

// Resolve did:web (fetches from HTTPS endpoint)
const webDidDoc = await resolver.resolve('did:web:api.example.com');
console.log('Authentication methods:', webDidDoc.authentication);

// Resolve did:key (constructs from key material)
const keyDidDoc = await resolver.resolve('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGcpnnJtaUxeJq');
console.log('Public key:', keyDidDoc.verificationMethod?.[0]?.publicKeyMultibase);
```

### Message Signing and Verification

```typescript
import { generateAgentKeyPair, signAgentMessage, verifyAgentSignature } from '@a2aletheia/sdk';

// Sender side: Sign a message
const keys = await generateAgentKeyPair();

const signed = await signAgentMessage(
  { type: 'task_request', taskId: 'abc-123', action: 'execute' },
  keys.privateKey,
  keys.didKey
);

// Receiver side: Verify with known public key
const isValid = await verifyAgentSignature(signed, keys.publicKey);
console.log('Signature valid:', isValid);
```

### End-to-End Agent Authentication Flow

```typescript
import {
  DIDResolver,
  ManifestFetcher,
  signAgentMessage,
  verifyAgentMessageWithDID,
} from '@a2aletheia/sdk';

// === Agent A: Send authenticated request ===
const agentAKeys = await generateAgentKeyPair();

const request = {
  type: 'capability_invoke',
  capability: 'hotel-booking',
  params: { hotelId: 'h-001', dates: ['2024-06-01', '2024-06-03'] }
};

const signedRequest = await signAgentMessage(
  request,
  agentAKeys.privateKey,
  agentAKeys.didKey
);

// === Agent B: Verify and process ===
const resolver = new DIDResolver();

// 1. Resolve sender's DID
const senderDidDoc = await resolver.resolve(signedRequest.signer);

// 2. Verify signature
const isValid = await verifyAgentMessageWithDID(signedRequest, senderDidDoc);

if (!isValid) {
  throw new Error('Authentication failed: invalid signature');
}

// 3. Request authenticated - process the capability
console.log('Authenticated request from:', signedRequest.signer);
console.log('Payload:', signedRequest.payload);
```

### Fetching Agent Manifests

```typescript
import { ManifestFetcher } from '@a2aletheia/sdk';

const fetcher = new ManifestFetcher();

// From standard .well-known location
const manifest = await fetcher.fetch('https://booking-agent.example.com');

console.log('Agent:', manifest.name);
console.log('Version:', manifest.version);
console.log('Skills:', manifest.skills.map(s => s.name));

// Check for DID in Aletheia extensions
if (manifest.aletheiaExtensions?.did) {
  console.log('Agent DID:', manifest.aletheiaExtensions.did);
}
```

---

## Related APIs

- [Client API](client.md) - High-level client with integrated DID resolution
- [Types API](types.md) - Full type definitions and Zod schemas