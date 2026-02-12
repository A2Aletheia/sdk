import { describe, it, expect } from "vitest";
import { generatePrivateKey } from "viem/accounts";
import {
  signRatingPayload,
  verifyRatingSignature,
  hashRatingPayload,
  type RatingPayloadMessage,
} from "../utils/signing.js";

const TEST_PAYLOAD: RatingPayloadMessage = {
  fromDid: "did:pkh:eip155:1:0x1234567890abcdef1234567890abcdef12345678",
  toDid: "did:web:agent.example.com",
  score: 4,
  chainId: 1,
  powNonce: "ff",
  powHash: "0x0000abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
  challengeId: "test-challenge-id",
};

describe("EIP-712 Rating Signing", () => {
  it("signRatingPayload + verifyRatingSignature round-trip", async () => {
    const privateKey = generatePrivateKey();
    const signed = await signRatingPayload(TEST_PAYLOAD, privateKey);

    expect(signed.payload).toBeDefined();
    expect(signed.signature).toMatch(/^0x[0-9a-fA-F]+$/);
    expect(signed.signer).toMatch(/^0x[0-9a-fA-F]{40}$/);

    const valid = await verifyRatingSignature(
      signed.payload,
      signed.signature,
      signed.signer,
    );
    expect(valid).toBe(true);
  });

  it("verifyRatingSignature rejects wrong signer", async () => {
    const privateKey = generatePrivateKey();
    const signed = await signRatingPayload(TEST_PAYLOAD, privateKey);

    // Use a different address as expected signer
    const wrongSigner = "0x0000000000000000000000000000000000000001";
    const valid = await verifyRatingSignature(
      signed.payload,
      signed.signature,
      wrongSigner,
    );
    expect(valid).toBe(false);
  });

  it("hashRatingPayload returns consistent hash", () => {
    const hash1 = hashRatingPayload(TEST_PAYLOAD);
    const hash2 = hashRatingPayload(TEST_PAYLOAD);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  it("hashRatingPayload changes with different inputs", () => {
    const hash1 = hashRatingPayload(TEST_PAYLOAD);
    const hash2 = hashRatingPayload({ ...TEST_PAYLOAD, score: 3 });

    expect(hash1).not.toBe(hash2);
  });

  it("includes chainId in signature verification", async () => {
    const privateKey = generatePrivateKey();
    const signed = await signRatingPayload(TEST_PAYLOAD, privateKey);

    // Tamper with chainId in the payload
    const parsed = JSON.parse(signed.payload);
    parsed.chainId = 999;
    const tampered = JSON.stringify(parsed);

    const valid = await verifyRatingSignature(
      tampered,
      signed.signature,
      signed.signer,
    );
    expect(valid).toBe(false);
  });

  it("signature changes with different chainId", async () => {
    const privateKey = generatePrivateKey();
    const signed1 = await signRatingPayload(TEST_PAYLOAD, privateKey);
    const signed2 = await signRatingPayload(
      { ...TEST_PAYLOAD, chainId: 137 },
      privateKey,
    );

    expect(signed1.signature).not.toBe(signed2.signature);
  });
});
