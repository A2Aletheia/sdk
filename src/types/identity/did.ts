import { z } from "zod";

export const DIDMethodSchema = z.enum(["web", "key", "ethr", "pkh"]);
export type DIDMethod = z.infer<typeof DIDMethodSchema>;

export const DIDSchema = z
  .string()
  .regex(/^did:(web|key|ethr|pkh):.+$/, "Must be a valid DID string");
export type DID = z.infer<typeof DIDSchema>;

export const VerificationMethodSchema = z.object({
  id: z.string(),
  type: z.string(),
  controller: z.string(),
  publicKeyMultibase: z.string().optional(),
  publicKeyJwk: z.record(z.unknown()).optional(),
});
export type VerificationMethod = z.infer<typeof VerificationMethodSchema>;

export const DIDServiceSchema = z.object({
  id: z.string(),
  type: z.string(),
  serviceEndpoint: z.string().url(),
});
export type DIDService = z.infer<typeof DIDServiceSchema>;

export const DIDDocumentSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string(),
  controller: z.string().optional(),
  verificationMethod: z.array(VerificationMethodSchema).optional(),
  authentication: z.array(z.string()).optional(),
  assertionMethod: z.array(z.string()).optional(),
  service: z.array(DIDServiceSchema).optional(),
});
export type DIDDocument = z.infer<typeof DIDDocumentSchema>;
