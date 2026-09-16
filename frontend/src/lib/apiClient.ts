// ─────────────────────────────────────────────────────────────
// fetch 래퍼. API 키는 절대 frontend 에 두지 않는다 (모든 LLM 호출은 backend 에서 처리).
// ─────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.timeoutMs ?? 200_000),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "서버에 연결할 수 없어요.");
  }

  if (response.status === 204) return undefined as T;

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    const error = (data ?? {}) as { error?: string; message?: string };
    throw new ApiError(response.status, error.error ?? "HTTP_ERROR", error.message ?? `요청에 실패했어요 (HTTP ${response.status})`);
  }
  return data as T;
}

export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body: body ?? {} }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
