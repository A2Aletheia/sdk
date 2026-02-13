import { z } from "zod";
import { DIDSchema } from "./did.js";

/**
 * A2A-compliant Skill schema (replaces old Capability for task definitions).
 * Describes a specific skill/capability the agent can perform.
 */
export const SkillSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  tags: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  inputModes: z.array(z.string()).optional(),
  outputModes: z.array(z.string()).optional(),
  inputSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

/**
 * A2A-compliant Capabilities schema (protocol features).
 * Describes what protocol features the agent supports.
 */
export const CapabilitiesSchema = z.object({
  streaming: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  stateTransitionHistory: z.boolean().optional(),
});
export type Capabilities = z.infer<typeof CapabilitiesSchema>;

// Keep backward compatibility alias
export const CapabilitySchema = SkillSchema;
export type Capability = Skill;

/**
 * A2A-compliant AgentManifest schema.
 *
 * Core A2A fields: name, description, version, url, skills, capabilities, provider
 * Aletheia-specific fields are in aletheiaExtensions: did, owner, registry info
 */
export const AgentManifestSchema = z.object({
  // Core A2A fields
  name: z.string().min(1).max(256),
  description: z.string().max(2048).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  url: z.string().url(),

  // A2A skills (what the agent can do)
  skills: z.array(SkillSchema).min(1),

  // A2A capabilities (protocol features)
  capabilities: CapabilitiesSchema.optional(),

  // A2A input/output modes
  defaultInputModes: z.array(z.string()).optional(),
  defaultOutputModes: z.array(z.string()).optional(),

  // Provider info (A2A compatible)
  provider: z
    .object({
      organization: z.string(),
      url: z.string().url().optional(),
      contact: z.string().email().optional(),
    })
    .optional(),

  // Security (A2A compatible)
  securitySchemes: z.record(z.unknown()).optional(),
  security: z.array(z.record(z.array(z.string()))).optional(),

  // Extended agent card support
  supportsAuthenticatedExtendedCard: z.boolean().optional(),

  // Aletheia-specific extensions
  aletheiaExtensions: z
    .object({
      // DID for identity verification
      did: DIDSchema.optional(),
      // Owner ETH address - required for claiming/registering the agent
      owner: z
        .string()
        .regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address")
        .optional(),
      // Registry info
      registryChain: z.string().optional(),
      registryAddress: z.string().optional(),
      // ERC-8004 token ID (uint256 as string) — links agent to on-chain NFT identity
      tokenId: z.string().regex(/^\d+$/, "Must be a uint256 string").optional(),
      livenessPingUrl: z.string().url().optional(),
    })
    .optional(),
});
export type AgentManifest = z.infer<typeof AgentManifestSchema>;
