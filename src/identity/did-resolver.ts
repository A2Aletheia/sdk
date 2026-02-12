import {
  DIDDocumentSchema,
  type DID,
  type DIDDocument,
} from "../types/index.js";

export class DIDResolver {
  /**
   * Resolve a did:web DID by fetching https://<domain>/.well-known/did.json
   */
  async resolveWeb(did: DID): Promise<DIDDocument> {
    // did:web:example.com -> https://example.com/.well-known/did.json
    // did:web:example.com:path:to -> https://example.com/path/to/did.json
    const parts = did.split(":").slice(2);
    if (parts.length === 0) {
      throw new Error(`Invalid did:web DID: ${did}`);
    }

    const domain = decodeURIComponent(parts[0]!);
    const pathParts = parts.slice(1).map(decodeURIComponent);

    let url: string;
    if (pathParts.length === 0) {
      url = `https://${domain}/.well-known/did.json`;
    } else {
      url = `https://${domain}/${pathParts.join("/")}/did.json`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to resolve did:web ${did}: HTTP ${response.status}`,
      );
    }

    const data: unknown = await response.json();
    return DIDDocumentSchema.parse(data);
  }

  /**
   * Resolve a did:key DID by constructing a DID Document from the key.
   * Supports Ed25519 and secp256k1 multicodec keys.
   */
  async resolveKey(did: DID): Promise<DIDDocument> {
    const multibaseKey = did.split(":")[2];
    if (!multibaseKey) {
      throw new Error(`Invalid did:key DID: ${did}`);
    }

    // Construct a minimal DID Document
    return {
      "@context": [
        "https://www.w3.org/ns/did/v1",
        "https://w3id.org/security/multikey/v1",
      ],
      id: did,
      verificationMethod: [
        {
          id: `${did}#${multibaseKey}`,
          type: "Multikey",
          controller: did,
          publicKeyMultibase: multibaseKey,
        },
      ],
      authentication: [`${did}#${multibaseKey}`],
      assertionMethod: [`${did}#${multibaseKey}`],
    };
  }

  /**
   * Resolve any supported DID method.
   */
  async resolve(did: DID): Promise<DIDDocument> {
    const parts = did.split(":");
    const method = parts[1];

    switch (method) {
      case "web":
        return this.resolveWeb(did);
      case "key":
        return this.resolveKey(did);
      default:
        throw new Error(`Unsupported DID method: ${method}`);
    }
  }
}
