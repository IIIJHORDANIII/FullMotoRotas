const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("motorotas_token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: `Erro ${res.status}` } }));
      throw new Error(error.error?.message || `Erro ${res.status}: ${res.statusText}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erro de conexão com o servidor");
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
};
