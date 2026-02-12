import type { AuditReport, DID } from "../types/index.js";
import type { HttpClient } from "../utils/http.js";

/**
 * Client for security/audit endpoints.
 * Stub implementation -- Phase 3.
 */
export class AuditClient {
  constructor(private http: HttpClient) {}

  async requestAudit(_did: DID): Promise<AuditReport> {
    throw new Error("Not implemented: Phase 3");
  }

  async getAuditReport(_reportId: string): Promise<AuditReport> {
    throw new Error("Not implemented: Phase 3");
  }

  async getAuditHistory(
    _did: DID,
  ): Promise<{ items: AuditReport[]; total: number }> {
    throw new Error("Not implemented: Phase 3");
  }
}
