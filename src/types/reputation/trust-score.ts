import { z } from "zod";
import { DIDSchema } from "../identity/did.js";

export const TrustScoreSchema = z.object({
  did: DIDSchema,
  overall: z.number().min(0).max(100),
  components: z.object({
    volumeWeighted: z.number().min(0).max(100),
    recencyWeighted: z.number().min(0).max(100),
    diversityScore: z.number().min(0).max(100),
    washTradeDiscount: z.number().min(0).max(100),
    trustWeightedInfluence: z.number().min(0).max(100),
  }),
  totalRatings: z.number().int().nonnegative(),
  totalVolume: z.number().nonnegative(),
  lastCalculated: z.coerce.date(),
  epoch: z.string(),
});
export type TrustScore = z.infer<typeof TrustScoreSchema>;
