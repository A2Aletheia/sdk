import { z } from "zod";

export const RegistrationModeSchema = z.enum(["onchain", "offchain"]);
export type RegistrationMode = z.infer<typeof RegistrationModeSchema>;
