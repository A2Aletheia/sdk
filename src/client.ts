import type {
  Agent,
  AgentManifest,
  AgentSearchParams,
  AuditReport,
  CreateRatingInput,
  DID,
  DIDDocument,
  PaginatedResponse,
  PoWChallenge,
  Rating,
  TrustScore,
} from "./types/index.js";
import { DIDResolver } from "./identity/did-resolver.js";
import { ManifestFetcher } from "./identity/manifest-fetcher.js";
import {
  verifyAgentMessageWithDID,
  type SignedMessage,
} from "./identity/agent-signer.js";
import { HttpClient } from "./utils/http.js";
import { RatingClient } from "./reputation/rating-client.js";
import { resolveApiUrl } from "./defaults.js";

export interface AletheiaClientConfig {
  apiUrl?: string;
  chainId?: number;
}

export class AletheiaClient {
  private http: HttpClient;
  private didResolver: DIDResolver;
  private manifestFetcher: ManifestFetcher;
  private ratingClient: RatingClient;

  constructor(private config: AletheiaClientConfig = {}) {
    this.http = new HttpClient(resolveApiUrl(config.apiUrl));
    this.didResolver = new DIDResolver();
    this.manifestFetcher = new ManifestFetcher();
    this.ratingClient = new RatingClient(this.http);
  }

  // === Authentication ===

  setAuthToken(token: string | null): void {
    this.http.setAuthToken(token);
  }

  async getNonce(): Promise<string> {
    const result = await this.http.get<{ nonce: string }>("/api/auth/nonce");
    return result.nonce;
  }

  async verifySiwe(
    message: string,
    signature: string,
  ): Promise<{ address: string; sessionToken: string }> {
    return this.http.post<{ address: string; sessionToken: string }>(
      "/api/auth/verify",
      { message, signature },
    );
  }

  // === Identity (Phase 1) ===

  async resolveDID(did: DID) {
    return this.didResolver.resolve(did);
  }

  async fetchManifest(baseUrl: string): Promise<AgentManifest> {
    return this.manifestFetcher.fetch(baseUrl);
  }

  async fetchManifestFromUrl(manifestUrl: string): Promise<AgentManifest> {
    return this.manifestFetcher.fetchFromUrl(manifestUrl);
  }

  async registerAgent(
    manifestUrl: string,
    ownerAddress?: string,
  ): Promise<{
    agent: Agent;
    approval: {
      did: string;
      manifestUrl: string;
      deadline: number;
      nonce: number;
      signature: string;
      registryAddress: string;
    } | null;
  }> {
    return this.http.post<{
      agent: Agent;
      approval: {
        did: string;
        manifestUrl: string;
        deadline: number;
        nonce: number;
        signature: string;
        registryAddress: string;
      } | null;
    }>("/api/agents/register", {
      manifestUrl,
      ownerAddress,
    });
  }

  async getAgent(did: DID): Promise<Agent> {
    return this.http.get<Agent>(`/api/agents/${encodeURIComponent(did)}`);
  }

  async searchAgents(
    params: AgentSearchParams & { page?: number; limit?: number },
  ): Promise<PaginatedResponse<Agent>> {
    const searchParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams[key] = String(value);
      }
    }
    return this.http.get<PaginatedResponse<Agent>>("/api/agents", searchParams);
  }

  async checkLiveness(did: DID): Promise<boolean> {
    const result = await this.http.post<{ isLive: boolean }>(
      `/api/agents/${encodeURIComponent(did)}/liveness`,
      {},
    );
    return result.isLive;
  }

  /**
   * Verify a signed message from an agent.
   * Resolves the signer's DID and verifies the signature.
   *
   * @param signedMessage - The signed message to verify
   * @returns Object with verification result and resolved DID document
   *
   * @example
   * ```typescript
   * const result = await client.verifyAgentMessage(signedMessage);
   * if (!result.valid) {
   *   throw new Error("Message not from claimed agent!");
   * }
   * console.log(`Verified message from ${result.didDocument.id}`);
   * ```
   */
  async verifyAgentMessage<T>(signedMessage: SignedMessage<T>): Promise<{
    valid: boolean;
    didDocument: DIDDocument | null;
    error?: string;
  }> {
    try {
      // Resolve the signer's DID
      const didDocument = await this.didResolver.resolve(signedMessage.signer);

      // Verify the signature
      const valid = await verifyAgentMessageWithDID(signedMessage, didDocument);

      return { valid, didDocument };
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "DID resolution failed";
      return { valid: false, didDocument: null, error };
    }
  }

  async discoverAgents(params: {
    capability?: string;
    query?: string;
    queryEmbedding?: number[];
    minTrustScore?: number;
    isLive?: boolean;
    limit?: number;
  }): Promise<PaginatedResponse<Agent>> {
    // Use POST when queryEmbedding is provided (too large for query string)
    if (params.queryEmbedding) {
      return this.http.post<PaginatedResponse<Agent>>(
        "/api/discover",
        params,
      );
    }

    const searchParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams[key] = String(value);
      }
    }
    return this.http.get<PaginatedResponse<Agent>>(
      "/api/discover",
      searchParams,
    );
  }

  // === Reputation (Phase 2) ===

  /**
   * Request a PoW challenge for rating submission.
   * Requires authentication (call `setAuthToken` first).
   */
  async requestRatingChallenge(targetDid: DID): Promise<PoWChallenge> {
    return this.ratingClient.requestChallenge(targetDid);
  }

  /**
   * Submit a rating with PoW proof and interaction proofs.
   * Requires authentication (call `setAuthToken` first).
   */
  async submitRating(input: CreateRatingInput): Promise<Rating> {
    return this.ratingClient.submitRating(input);
  }

  /**
   * Get the trust score for an agent.
   */
  async getTrustScore(did: DID): Promise<TrustScore> {
    return this.ratingClient.getTrustScore(did);
  }

  /**
   * Get paginated ratings received by an agent.
   */
  async getRatingsForAgent(
    did: DID,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Rating>> {
    return this.ratingClient.getRatingsForAgent(did, page, limit);
  }

  /**
   * Check cooldown status for a rating pair.
   */
  async checkCooldown(
    fromDid: DID,
    toDid: DID,
  ): Promise<{ allowed: boolean; expiresAt?: string }> {
    return this.ratingClient.checkCooldown(fromDid, toDid);
  }

  // === Security (Phase 3 -- Stubs) ===

  async requestAudit(_did: DID): Promise<AuditReport> {
    throw new Error("Not implemented: Phase 3");
  }

  async getAuditReport(_reportId: string): Promise<AuditReport> {
    throw new Error("Not implemented: Phase 3");
  }
}
