import { z } from "zod";
import { DIDSchema } from "../identity/did.js";

export const PoWChallengeSchema = z.object({
  id: z.string().uuid(),
  challenge: z.string(),
  difficulty: z.number().int(),
  expiresAt: z.coerce.date(),
  raterDid: DIDSchema,
  targetDid: DIDSchema,
});
export type PoWChallenge = z.infer<typeof PoWChallengeSchema>;
