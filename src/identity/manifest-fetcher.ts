import { AgentManifestSchema, type AgentManifest } from "../types/index.js";

export class ManifestFetcher {
  /**
   * Fetch and validate an agent manifest from a .well-known/agent.json URL.
   */
  async fetch(baseUrl: string): Promise<AgentManifest> {
    const url = new URL("/.well-known/agent.json", baseUrl);
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest from ${url}: HTTP ${response.status}`,
      );
    }

    const data: unknown = await response.json();
    return AgentManifestSchema.parse(data);
  }

  /**
   * Fetch manifest from an arbitrary URL (not necessarily .well-known).
   */
  async fetchFromUrl(manifestUrl: string): Promise<AgentManifest> {
    const response = await fetch(manifestUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch manifest from ${manifestUrl}: HTTP ${response.status}`,
      );
    }

    const data: unknown = await response.json();
    return AgentManifestSchema.parse(data);
  }
}
