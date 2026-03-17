export class HttpClient {
  private authToken: string | null = null;

  constructor(private baseUrl: string) {}

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  private getHeaders(includeBody = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (includeBody) {
      headers["Content-Type"] = "application/json";
    }
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private async throwForError(response: Response): Promise<never> {
    let message = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // Ignore invalid/non-JSON error bodies and fall back to status text.
    }

    throw new Error(message);
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      await this.throwForError(response);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      await this.throwForError(response);
    }
    return response.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: this.getHeaders(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      await this.throwForError(response);
    }
    return response.json() as Promise<T>;
  }
}
