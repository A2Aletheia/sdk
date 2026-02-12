import { z } from "zod";
import { DIDSchema } from "../identity/did.js";

export const RatingSchema = z.object({
  id: z.string().uuid(),
  fromDid: DIDSchema,
  toDid: DIDSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1024).optional(),
  txHash: z.string().optional(),
  chainId: z.number().int().optional(),
  epochId: z.string(),
  signature: z.string(),
  createdAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  isVerified: z.boolean(),
  isWashTrade: z.boolean().nullable(),
  // PoW fields
  powNonce: z.string(),
  powHash: z.string(),
  powDifficulty: z.number().int(),
  // Interaction proof fields
  interactionCount: z.number().int().min(3),
  interactionWindowStart: z.coerce.date(),
  interactionCumulativeValue: z.number().nonnegative(),
  // Trust-weighted influence
  raterTrustScore: z.number().min(0).max(100).nullable(),
  weightedScore: z.number().nullable(),
});
export type Rating = z.infer<typeof RatingSchema>;

export const CreateRatingInputSchema = z.object({
  toDid: DIDSchema,
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1024).optional(),
  signature: z.string(),
  // PoW proof
  powNonce: z.string(),
  powHash: z.string(),
  challengeId: z.string().uuid(),
  // Interaction proof (on-chain tx hashes proving prior interaction)
  interactionProofs: z.array(z.string()).min(3),
  interactionChainId: z.number().int(),
});
export type CreateRatingInput = z.infer<typeof CreateRatingInputSchema>;
