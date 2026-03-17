import { z } from "zod";
import { AgentStatusSchema } from "./agent.js";
import { DIDSchema } from "./did.js";
import { RegistrationModeSchema } from "./registration-mode.js";

export const RegistrationBatchStatusSchema = z.enum([
  "queued",
  "processing",
  "ready_for_signature",
  "submitted",
  "completed",
  "failed",
]);
export type RegistrationBatchStatus = z.infer<
  typeof RegistrationBatchStatusSchema
>;

export const RegistrationBatchItemStatusSchema = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);
export type RegistrationBatchItemStatus = z.infer<
  typeof RegistrationBatchItemStatusSchema
>;

export const RegistrationBatchItemSchema = z.object({
  id: z.string().uuid(),
  batchId: z.string().uuid(),
  inputIndex: z.number().int().nonnegative(),
  manifestUrl: z.string().url(),
  did: DIDSchema.nullable(),
  agentId: z.string().uuid().nullable(),
  status: RegistrationBatchItemStatusSchema,
  error: z.string().nullable(),
  agentStatus: AgentStatusSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RegistrationBatchItem = z.infer<typeof RegistrationBatchItemSchema>;

export const RegistrationBatchCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  queued: z.number().int().nonnegative(),
  processing: z.number().int().nonnegative(),
  ready: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type RegistrationBatchCounts = z.infer<
  typeof RegistrationBatchCountsSchema
>;

export const RegistrationBatchSchema = z.object({
  id: z.string().uuid(),
  ownerAddress: z.string(),
  registrationMode: RegistrationModeSchema,
  status: RegistrationBatchStatusSchema,
  txHash: z.string().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  counts: RegistrationBatchCountsSchema,
  items: z.array(RegistrationBatchItemSchema),
});
export type RegistrationBatch = z.infer<typeof RegistrationBatchSchema>;

export const BatchRegistrationApprovalSchema = z.object({
  dids: z.array(DIDSchema).min(1),
  manifestUrls: z.array(z.string().url()).min(1),
  deadline: z.number().int().positive(),
  nonce: z.number().int().nonnegative(),
  signature: z.string(),
  registryAddress: z.string(),
});
export type BatchRegistrationApproval = z.infer<
  typeof BatchRegistrationApprovalSchema
>;
