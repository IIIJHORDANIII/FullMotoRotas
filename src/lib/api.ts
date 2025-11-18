const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("motorotas_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
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
      const errorMessage = error.error?.message || `Erro ${res.status}: ${res.statusText}`;
      
      // Se for erro 401 (não autorizado) e a mensagem indicar token inválido/expirado
      if (res.status === 401) {
        const isTokenError = 
          errorMessage.toLowerCase().includes("token inválido") ||
          errorMessage.toLowerCase().includes("token expirado") ||
          errorMessage.toLowerCase().includes("token de autenticação não encontrado") ||
          errorMessage.toLowerCase().includes("unauthorized");
        
        if (isTokenError && typeof window !== "undefined") {
          // Limpar dados de autenticação
          localStorage.removeItem("motorotas_token");
          localStorage.removeItem("motorotas_user");
          localStorage.removeItem("motorotas_login_time");
          
          // Redirecionar para login
          window.location.href = "/login";
        }
      }
      
      throw new Error(errorMessage);
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
