/**
 * Default configuration for connecting to the Aletheia staging network.
 *
 * Override per-field via constructor args or the `ALETHEIA_API_URL` env var.
 */
export const ALETHEIA_DEFAULTS = {
  /** Aletheia REST API (backend). */
  API_URL: "https://aletheia-api.vercel.app",
  /** Aletheia web registry (frontend). */
  REGISTRY_URL: "https://aletheia-psi.vercel.app",
  /** Base Sepolia testnet. */
  CHAIN_ID: 84532,
} as const;

/**
 * Resolve the API URL with the following precedence:
 *   1. Explicit argument (constructor param)
 *   2. `ALETHEIA_API_URL` environment variable
 *   3. Built-in default ({@link ALETHEIA_DEFAULTS.API_URL})
 *
 * The `typeof process` guard keeps this safe in browser bundles.
 */
export function resolveApiUrl(explicit?: string): string {
  if (explicit) return explicit;
  try {
    const fromEnv =
      typeof process !== "undefined"
        ? process.env?.ALETHEIA_API_URL
        : undefined;
    if (fromEnv) return fromEnv;
  } catch {
    /* browser / edge runtime — fall through */
  }
  return ALETHEIA_DEFAULTS.API_URL;
}
