import { z } from "zod";
import { DIDSchema } from "../identity/did.js";

export const AuditSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

export const AuditFindingSchema = z.object({
  id: z.string().uuid(),
  vectorId: z.string(),
  severity: AuditSeveritySchema,
  title: z.string(),
  description: z.string(),
  evidence: z.string().optional(),
  mitigated: z.boolean(),
});
export type AuditFinding = z.infer<typeof AuditFindingSchema>;

export const AuditStatusSchema = z.enum(["running", "completed", "failed"]);
export type AuditStatus = z.infer<typeof AuditStatusSchema>;

export const AuditReportSchema = z.object({
  id: z.string().uuid(),
  agentDid: DIDSchema,
  runAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  status: AuditStatusSchema,
  findings: z.array(AuditFindingSchema),
  overallRisk: AuditSeveritySchema.nullable(),
  battleTestedAwarded: z.boolean(),
  encryptedReport: z.string().optional(),
});
export type AuditReport = z.infer<typeof AuditReportSchema>;
