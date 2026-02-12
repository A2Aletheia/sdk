/**
 * EIP-712 signing helpers for rating payloads.
 *
 * Uses viem for typed-data signing and verification.
 */

import {
  hashTypedData,
  recoverTypedDataAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// EIP-712 domain for Aletheia Reputation (chainId required to prevent cross-chain replay)
const getDomain = (chainId: number) =>
  ({
    name: "Aletheia Reputation",
    version: "1",
    chainId,
  }) as const;

// Rating payload type definitions for EIP-712
const RATING_TYPES = {
  RatingPayload: [
    { name: "fromDid", type: "string" },
    { name: "toDid", type: "string" },
    { name: "score", type: "uint8" },
    { name: "chainId", type: "uint256" },
    { name: "powNonce", type: "string" },
    { name: "powHash", type: "string" },
    { name: "challengeId", type: "string" },
  ],
} as const;

export interface RatingPayloadMessage {
  fromDid: string;
  toDid: string;
  score: number;
  chainId: number | bigint;
  powNonce: string;
  powHash: string;
  challengeId: string;
}

export interface SignedPayload {
  payload: string;
  signature: string;
  signer: string;
}

/**
 * Sign a rating payload using EIP-712 typed data signing.
 *
 * @param payload - The rating payload fields
 * @param privateKey - Hex-encoded private key (with 0x prefix)
 * @returns SignedPayload with JSON-encoded payload, signature, and signer address
 */
export async function signRatingPayload(
  payload: RatingPayloadMessage,
  privateKey: string,
): Promise<SignedPayload> {
  const account = privateKeyToAccount(privateKey as Hex);

  const signature = await account.signTypedData({
    domain: getDomain(Number(payload.chainId)),
    types: RATING_TYPES,
    primaryType: "RatingPayload",
    message: { ...payload, chainId: BigInt(payload.chainId) },
  });

  return {
    payload: JSON.stringify(payload),
    signature,
    signer: account.address,
  };
}

/**
 * Verify an EIP-712 signed rating payload.
 *
 * @param payload - JSON-encoded rating payload
 * @param signature - Hex-encoded signature
 * @param expectedSigner - Expected Ethereum address of the signer
 * @returns true if the signature is valid and matches the expected signer
 */
export async function verifyRatingSignature(
  payload: string,
  signature: string,
  expectedSigner: string,
): Promise<boolean> {
  const message = JSON.parse(payload) as RatingPayloadMessage;

  const recoveredAddress = await recoverTypedDataAddress({
    domain: getDomain(Number(message.chainId)),
    types: RATING_TYPES,
    primaryType: "RatingPayload",
    message: { ...message, chainId: BigInt(message.chainId) },
    signature: signature as Hex,
  });

  return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
}

/**
 * Hash a rating payload using EIP-712 typed data hashing.
 * Useful for on-chain verification where only the hash is needed.
 */
export function hashRatingPayload(payload: RatingPayloadMessage): Hex {
  return hashTypedData({
    domain: getDomain(Number(payload.chainId)),
    types: RATING_TYPES,
    primaryType: "RatingPayload",
    message: { ...payload, chainId: BigInt(payload.chainId) },
  });
}
