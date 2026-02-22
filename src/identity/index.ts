export { DIDResolver } from "./did-resolver.js";
export { ManifestFetcher, AGENT_CARD_PATH } from "./manifest-fetcher.js";
export {
  generateAgentKeyPair,
  signAgentMessage,
  verifyAgentSignature,
  verifyAgentMessageWithDID,
  type AgentKeyPair,
  type SignedMessage,
} from "./agent-signer.js";
