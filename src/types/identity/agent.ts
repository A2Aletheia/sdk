import { z } from "zod";
import { DIDSchema } from "./did.js";

export const AgentStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "pending",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentSchema = z.object({
  id: z.string().uuid(),
  did: DIDSchema,
  name: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  manifestUrl: z.string().url(),
  status: AgentStatusSchema,
  trustScore: z.number().min(0).max(100).nullable(),
  totalRatings: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  lastLivenessCheck: z.coerce.date().nullable(),
  isLive: z.boolean(),
  isBattleTested: z.boolean(),
  registeredAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  chainId: z.number().int().optional(),
  registryTxHash: z.string().optional(),
  ownerAddress: z.string().optional(),
  erc8004TokenId: z.string().optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const AgentSearchParamsSchema = z.object({
  status: AgentStatusSchema.optional(),
  search: z.string().optional(),
  minTrustScore: z.coerce.number().optional(),
  capability: z.string().optional(),
  isLive: z.coerce.boolean().optional(),
  isBattleTested: z.coerce.boolean().optional(),
});
export type AgentSearchParams = z.infer<typeof AgentSearchParamsSchema>;
