/**
 * Client-side SHA-256 Proof of Work solver.
 *
 * Iteratively hashes `challenge + nonce` until the result has enough
 * leading zero bits to meet the specified difficulty.
 *
 * @example
 * ```typescript
 * const challenge = await client.requestRatingChallenge(targetDid);
 * const { nonce, hash } = await solvePoWChallenge(
 *   challenge.challenge,
 *   challenge.difficulty,
 * );
 * ```
 */
export async function solvePoWChallenge(
  challenge: string,
  difficulty: number,
): Promise<{ nonce: string; hash: string }> {
  let nonce = 0n;

  while (true) {
    const nonceHex = nonce.toString(16);
    const input = new TextEncoder().encode(challenge + nonceHex);
    const hashBuffer = await crypto.subtle.digest("SHA-256", input);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hasLeadingZeros(hashHex, difficulty)) {
      return { nonce: nonceHex, hash: "0x" + hashHex };
    }

    nonce++;
  }
}

function hasLeadingZeros(hex: string, bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  const remainingBits = bits % 8;

  for (let i = 0; i < fullBytes; i++) {
    if (hex[i * 2] !== "0" || hex[i * 2 + 1] !== "0") return false;
  }

  if (remainingBits > 0) {
    const byte = parseInt(
      hex.substring(fullBytes * 2, fullBytes * 2 + 2),
      16,
    );
    if (byte >= 1 << (8 - remainingBits)) return false;
  }

  return true;
}
