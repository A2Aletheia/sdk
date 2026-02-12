export { DIDResolver } from "./did-resolver.js";
export { ManifestFetcher } from "./manifest-fetcher.js";
export {
  generateAgentKeyPair,
  signAgentMessage,
  verifyAgentSignature,
  verifyAgentMessageWithDID,
  type AgentKeyPair,
  type SignedMessage,
} from "./agent-signer.js";
