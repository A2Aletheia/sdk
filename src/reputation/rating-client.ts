import type {
  Rating,
  CreateRatingInput,
  TrustScore,
  PoWChallenge,
  DID,
  PaginatedResponse,
} from "../types/index.js";
import type { HttpClient } from "../utils/http.js";

/**
 * Client for the Aletheia reputation API.
 */
export class RatingClient {
  constructor(private http: HttpClient) {}

  /**
   * Request a PoW challenge for rating submission.
   * Requires authentication.
   */
  async requestChallenge(targetDid: DID): Promise<PoWChallenge> {
    return this.http.post<PoWChallenge>("/api/ratings/challenge", {
      targetDid,
    });
  }

  /**
   * Submit a rating with PoW proof and interaction proofs.
   * Requires authentication.
   */
  async submitRating(input: CreateRatingInput): Promise<Rating> {
    return this.http.post<Rating>("/api/ratings", input);
  }

  /**
   * Get the trust score for an agent.
   */
  async getTrustScore(did: DID): Promise<TrustScore> {
    return this.http.get<TrustScore>(
      `/api/ratings/${encodeURIComponent(did)}/score`,
    );
  }

  /**
   * Get paginated ratings received by an agent.
   */
  async getRatingsForAgent(
    did: DID,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponse<Rating>> {
    const params: Record<string, string> = { did };
    if (page !== undefined) params.page = String(page);
    if (limit !== undefined) params.limit = String(limit);
    return this.http.get<PaginatedResponse<Rating>>("/api/ratings", params);
  }

  /**
   * Check cooldown status for a rating pair.
   */
  async checkCooldown(
    fromDid: DID,
    toDid: DID,
  ): Promise<{ allowed: boolean; expiresAt?: string }> {
    return this.http.get(`/api/ratings/${encodeURIComponent(toDid)}/cooldown`, {
      fromDid,
    });
  }
}
