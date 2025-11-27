/**
 * Cliente para integração com a API do Pagar.me
 * Documentação: https://docs.pagar.me/v3/docs/getting-started
 */

const PAGARME_API_BASE_URL = "https://api.pagar.me/1";

export interface PagarmePlan {
  id: string;
  name: string;
  amount: number; // em centavos
  days: number;
  payment_methods: string[];
  trial_days?: number;
  installments?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePlanRequest {
  name: string;
  amount: number; // em centavos
  days: number;
  payment_methods?: string[];
  trial_days?: number;
  installments?: number;
}

export interface PagarmeSubscription {
  id: string;
  plan_id: string;
  customer_id: string;
  payment_method: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  customer_id: string;
  payment_method: string;
  card_id?: string;
  card_hash?: string;
}

class PagarmeClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("PAGARME_API_KEY não está configurada");
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const isGet = options.method === "GET" || !options.method;
    const url = new URL(`${PAGARME_API_BASE_URL}${endpoint}`);
    
    // Para GET, api_key vai na query string
    if (isGet) {
      url.searchParams.append("api_key", this.apiKey);
    }

    // Para POST/PUT, api_key vai no body
    let body = options.body;
    if (!isGet && body) {
      const bodyData = typeof body === "string" ? JSON.parse(body) : body;
      body = JSON.stringify({
        ...bodyData,
        api_key: this.apiKey,
      });
    }
    
    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `Erro na API do Pagar.me: ${response.statusText}`,
      }));
      throw new Error(
        error.message || `Erro na API do Pagar.me: ${response.status}`
      );
    }

    return response.json();
  }

  /**
   * Cria um novo plano de assinatura
   */
  async createPlan(data: CreatePlanRequest): Promise<PagarmePlan> {
    return this.request<PagarmePlan>("/plans", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        amount: data.amount,
        days: data.days,
        payment_methods: data.payment_methods || ["credit_card", "boleto"],
        trial_days: data.trial_days,
        installments: data.installments,
      }),
    });
  }

  /**
   * Lista todos os planos
   */
  async listPlans(): Promise<PagarmePlan[]> {
    const response = await this.request<PagarmePlan[] | { plans: PagarmePlan[] }>("/plans", {
      method: "GET",
    });
    // A API pode retornar um array diretamente ou um objeto com plans
    return Array.isArray(response) ? response : response.plans || [];
  }

  /**
   * Busca um plano por ID
   */
  async getPlan(planId: string): Promise<PagarmePlan> {
    return this.request<PagarmePlan>(`/plans/${planId}`, {
      method: "GET",
    });
  }

  /**
   * Atualiza um plano existente
   */
  async updatePlan(
    planId: string,
    data: Partial<CreatePlanRequest>
  ): Promise<PagarmePlan> {
    return this.request<PagarmePlan>(`/plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * Cria uma nova assinatura
   */
  async createSubscription(
    data: CreateSubscriptionRequest
  ): Promise<PagarmeSubscription> {
    return this.request<PagarmeSubscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: data.plan_id,
        customer_id: data.customer_id,
        payment_method: data.payment_method,
        card_id: data.card_id,
        card_hash: data.card_hash,
      }),
    });
  }

  /**
   * Busca uma assinatura por ID
   */
  async getSubscription(subscriptionId: string): Promise<PagarmeSubscription> {
    return this.request<PagarmeSubscription>(`/subscriptions/${subscriptionId}`, {
      method: "GET",
    });
  }

  /**
   * Cancela uma assinatura
   */
  async cancelSubscription(subscriptionId: string): Promise<PagarmeSubscription> {
    return this.request<PagarmeSubscription>(
      `/subscriptions/${subscriptionId}/cancel`,
      {
        method: "POST",
      }
    );
  }
}

let pagarmeClientInstance: PagarmeClient | null = null;

/**
 * Obtém uma instância do cliente Pagar.me
 */
export function getPagarmeClient(): PagarmeClient {
  const apiKey = process.env.PAGARME_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "PAGARME_API_KEY não está configurada nas variáveis de ambiente"
    );
  }

  if (!pagarmeClientInstance) {
    pagarmeClientInstance = new PagarmeClient(apiKey);
  }

  return pagarmeClientInstance;
}

