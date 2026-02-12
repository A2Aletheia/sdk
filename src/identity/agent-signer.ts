import * as ed25519 from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import type { DIDDocument } from "../types/index.js";

// Configure ed25519 to use sha512
ed25519.etc.sha512Sync = (...m) => sha512(ed25519.etc.concatBytes(...m));

/**
 * Agent key pair for signing messages.
 */
export interface AgentKeyPair {
  /** Private key (hex string, keep secret!) */
  privateKey: string;
  /** Public key (hex string) */
  publicKey: string;
  /** Public key in multibase format (for DID documents) */
  publicKeyMultibase: string;
  /** Generated did:key identifier */
  didKey: string;
}

/**
 * Signed message structure.
 */
export interface SignedMessage<T = unknown> {
  /** The original message payload */
  payload: T;
  /** Ed25519 signature (hex string) */
  signature: string;
  /** DID of the signer */
  signer: string;
  /** Timestamp when signed */
  timestamp: number;
}

/**
 * Generate a new Ed25519 key pair for agent signing.
 *
 * @returns Key pair with private key, public key, and derived did:key
 *
 * @example
 * ```typescript
 * const keys = await generateAgentKeyPair();
 * console.log(keys.didKey); // did:key:z6Mk...
 * // Store keys.privateKey securely!
 * ```
 */
export async function generateAgentKeyPair(): Promise<AgentKeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKeyAsync(privateKey);

  const privateKeyHex = bytesToHex(privateKey);
  const publicKeyHex = bytesToHex(publicKey);

  // Multibase encoding: 'z' prefix + base58btc
  // For Ed25519, the multicodec prefix is 0xed01
  const multicodecPrefix = new Uint8Array([0xed, 0x01]);
  const publicKeyWithPrefix = new Uint8Array([
    ...multicodecPrefix,
    ...publicKey,
  ]);
  const publicKeyMultibase = "z" + base58btcEncode(publicKeyWithPrefix);

  const didKey = `did:key:${publicKeyMultibase}`;

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    publicKeyMultibase,
    didKey,
  };
}

/**
 * Sign a message with an agent's private key.
 *
 * @param message - The message to sign (will be JSON stringified)
 * @param privateKey - Agent's private key (hex string)
 * @param signerDid - The DID of the signer
 * @returns Signed message with signature and metadata
 *
 * @example
 * ```typescript
 * const signed = await signAgentMessage(
 *   { action: "book", hotelId: "123" },
 *   keys.privateKey,
 *   keys.didKey
 * );
 * ```
 */
export async function signAgentMessage<T>(
  message: T,
  privateKey: string,
  signerDid: string,
): Promise<SignedMessage<T>> {
  const timestamp = Date.now();

  // Create canonical message to sign
  const toSign = JSON.stringify({
    payload: message,
    signer: signerDid,
    timestamp,
  });

  const messageBytes = new TextEncoder().encode(toSign);
  const privateKeyBytes = hexToBytes(privateKey);

  const signatureBytes = await ed25519.signAsync(messageBytes, privateKeyBytes);
  const signature = bytesToHex(signatureBytes);

  return {
    payload: message,
    signature,
    signer: signerDid,
    timestamp,
  };
}

/**
 * Verify a signed message using the signer's public key.
 *
 * @param signedMessage - The signed message to verify
 * @param publicKey - Signer's public key (hex string)
 * @returns True if signature is valid
 *
 * @example
 * ```typescript
 * const isValid = await verifyAgentSignature(signedMessage, publicKey);
 * ```
 */
export async function verifyAgentSignature<T>(
  signedMessage: SignedMessage<T>,
  publicKey: string,
): Promise<boolean> {
  const { payload, signature, signer, timestamp } = signedMessage;

  // Recreate the canonical message that was signed
  const toVerify = JSON.stringify({
    payload,
    signer,
    timestamp,
  });

  const messageBytes = new TextEncoder().encode(toVerify);
  const signatureBytes = hexToBytes(signature);
  const publicKeyBytes = hexToBytes(publicKey);

  try {
    return await ed25519.verifyAsync(
      signatureBytes,
      messageBytes,
      publicKeyBytes,
    );
  } catch {
    return false;
  }
}

/**
 * Verify a signed message by resolving the signer's DID document.
 * This is the main verification method for agent-to-agent authentication.
 *
 * @param signedMessage - The signed message to verify
 * @param didDocument - The signer's resolved DID document
 * @returns True if signature is valid and matches DID document
 *
 * @example
 * ```typescript
 * // Resolve DID first
 * const didDoc = await client.resolveDID(signedMessage.signer);
 *
 * // Verify signature
 * const isValid = await verifyAgentMessageWithDID(signedMessage, didDoc);
 * if (!isValid) {
 *   throw new Error("Message signature invalid - not from claimed agent!");
 * }
 * ```
 */
export async function verifyAgentMessageWithDID<T>(
  signedMessage: SignedMessage<T>,
  didDocument: DIDDocument,
): Promise<boolean> {
  // Verify DID document ID matches signer
  if (didDocument.id !== signedMessage.signer) {
    console.warn(
      `DID mismatch: message claims ${signedMessage.signer}, document is ${didDocument.id}`,
    );
    return false;
  }

  // Find verification method (public key) in DID document
  const verificationMethods = didDocument.verificationMethod ?? [];
  const authMethods = didDocument.authentication ?? [];

  for (const method of verificationMethods) {
    // Check if this method is authorized for authentication
    // Authentication array contains string references to verification method IDs
    const isAuthMethod = authMethods.some((auth) => auth === method.id);

    if (!isAuthMethod && authMethods.length > 0) {
      continue; // Skip non-auth methods if auth methods are specified
    }

    // Try to extract and verify with this key
    const publicKey = extractPublicKey(method);
    if (publicKey) {
      const isValid = await verifyAgentSignature(signedMessage, publicKey);
      if (isValid) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract public key from a DID verification method.
 */
function extractPublicKey(
  method: NonNullable<DIDDocument["verificationMethod"]>[number],
): string | null {
  // Handle publicKeyMultibase (Ed25519VerificationKey2020, Multikey)
  if (method.publicKeyMultibase) {
    try {
      const decoded = base58btcDecode(method.publicKeyMultibase.slice(1)); // Remove 'z' prefix

      // Check for Ed25519 multicodec prefix (0xed01)
      if (decoded[0] === 0xed && decoded[1] === 0x01) {
        return bytesToHex(decoded.slice(2));
      }

      // No prefix, assume raw key
      return bytesToHex(decoded);
    } catch {
      return null;
    }
  }

  // Handle publicKeyJwk
  if (method.publicKeyJwk) {
    const jwk = method.publicKeyJwk as { crv?: string; x?: string };
    if (jwk.crv === "Ed25519" && jwk.x) {
      try {
        const keyBytes = base64urlDecode(jwk.x);
        return bytesToHex(keyBytes);
      } catch {
        return null;
      }
    }
  }

  return null;
}

// === Utility functions ===

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Base58btc alphabet
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // Convert to base58
  const size = Math.ceil((bytes.length * 138) / 100) + 1;
  const b58 = new Uint8Array(size);

  let length = 0;
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]!;
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 256 * (b58[k] ?? 0);
      b58[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }

  // Skip leading zeros in base58 result
  let start = size - length;
  while (start < size && b58[start] === 0) {
    start++;
  }

  // Build result
  let result = "1".repeat(zeros);
  for (let i = start; i < size; i++) {
    result += BASE58_ALPHABET[b58[i]!];
  }

  return result;
}

function base58btcDecode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  // Count leading '1's (zeros in byte form)
  let zeros = 0;
  while (zeros < str.length && str[zeros] === "1") {
    zeros++;
  }

  // Allocate enough space
  const size = Math.ceil((str.length * 733) / 1000) + 1;
  const bytes = new Uint8Array(size);

  let length = 0;
  for (let i = zeros; i < str.length; i++) {
    const char = str[i]!;
    let carry = BASE58_ALPHABET.indexOf(char);
    if (carry === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }

    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * (bytes[k] ?? 0);
      bytes[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    length = j;
  }

  // Skip leading zeros in result
  let start = size - length;
  while (start < size && bytes[start] === 0) {
    start++;
  }

  // Build final result with leading zeros
  const result = new Uint8Array(zeros + (size - start));
  for (let i = 0; i < zeros; i++) {
    result[i] = 0;
  }
  for (let i = start; i < size; i++) {
    result[zeros + i - start] = bytes[i]!;
  }

  return result;
}

function base64urlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  // Convert base64url to base64
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  // Decode
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
