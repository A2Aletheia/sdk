import { describe, it, expect } from "vitest";
import { solvePoWChallenge } from "../reputation/pow-solver.js";

describe("PoW Solver", () => {
  it("solves a challenge with low difficulty", async () => {
    const result = await solvePoWChallenge("test-challenge", 8);

    expect(result.nonce).toBeDefined();
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);

    // Verify 8 leading zero bits (first 2 hex chars must be "00")
    const hex = result.hash.slice(2);
    expect(hex.slice(0, 2)).toBe("00");
  });

  it("returns valid hash format", async () => {
    const result = await solvePoWChallenge("another-challenge", 4);

    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(typeof result.nonce).toBe("string");
  });

  it("hash meets the specified difficulty", async () => {
    const difficulty = 12;
    const result = await solvePoWChallenge("difficulty-test", difficulty);

    // 12 bits = first 3 hex chars must represent values with 12 leading zero bits
    // That means first byte (2 hex chars) = 0x00, second byte top 4 bits = 0
    const hex = result.hash.slice(2);
    const firstByte = parseInt(hex.slice(0, 2), 16);
    const secondByte = parseInt(hex.slice(2, 4), 16);

    expect(firstByte).toBe(0);
    expect(secondByte >> 4).toBe(0); // top 4 bits of second byte = 0
  });

  it("different challenges produce different results", async () => {
    const result1 = await solvePoWChallenge("challenge-a", 4);
    const result2 = await solvePoWChallenge("challenge-b", 4);

    // Hashes should differ (extremely unlikely to match)
    expect(result1.hash).not.toBe(result2.hash);
  });
});
