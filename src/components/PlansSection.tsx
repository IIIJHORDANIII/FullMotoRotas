"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface PagarmePlan {
  id: string | number;
  name: string;
  amount: number; // em centavos
  days: number;
  payment_methods?: string[];
  trial_days?: number;
  isPerDelivery?: boolean;
  description?: string;
  note?: string;
  isPopular?: boolean;
}

export default function PlansSection() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuth();
  const [plans, setPlans] = useState<PagarmePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/plans");
      
      if (!response.ok) {
        throw new Error("Erro ao carregar planos");
      }

      const data = await response.json();
      // A API retorna { data: { plans: [...] } }
      const plansData = data.data?.plans || data.plans || [];
      setPlans(plansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      console.error("Erro ao buscar planos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    // Verificar se o usuário está autenticado
    if (!isAuthenticated || !token) {
      router.push("/login");
      return;
    }

    // Verificar se o usuário é ESTABLISHMENT ou ADMIN
    if (user?.role !== "ESTABLISHMENT" && user?.role !== "ADMIN") {
      alert("Apenas estabelecimentos podem assinar planos.");
      return;
    }

    try {
      setSubscribingPlanId(planId);
      
      // Buscar planos do Pagar.me para mapear
      let pagarmePlanId = planId;
      
      // Se o plano for um dos originais, buscar o plano correspondente no Pagar.me
      if (planId === "basic" || planId === "professional" || planId === "enterprise") {
        const plansResponse = await fetch("/api/plans");
        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          const pagarmePlans = plansData.data?.plans || plansData.plans || [];
          
          // Mapear planos originais para planos do Pagar.me
          // Plano Básico -> primeiro plano do Pagar.me (ou o mais barato)
          // Plano Profissional -> segundo plano do Pagar.me
          // Plano Empresarial -> terceiro plano do Pagar.me (ou o mais caro)
          if (planId === "basic" && pagarmePlans.length > 0) {
            pagarmePlanId = String(pagarmePlans[0].id);
          } else if (planId === "professional" && pagarmePlans.length > 1) {
            pagarmePlanId = String(pagarmePlans[1].id);
          } else if (planId === "enterprise" && pagarmePlans.length > 0) {
            // Pegar o plano mais caro para empresarial
            const sortedPlans = [...pagarmePlans].sort((a, b) => b.amount - a.amount);
            pagarmePlanId = String(sortedPlans[0].id);
          }
        }
      }
      
      // Buscar o estabelecimento do usuário
      const establishmentsResponse = await fetch("/api/establishments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!establishmentsResponse.ok) {
        throw new Error("Erro ao buscar estabelecimento");
      }

      const establishmentsData = await establishmentsResponse.json();
      const establishments = establishmentsData.data?.establishments || [];
      
      if (establishments.length === 0) {
        alert("Você precisa ter um estabelecimento cadastrado para assinar um plano. Redirecionando para cadastro...");
        router.push("/register");
        return;
      }

      const establishment = establishments[0];

      // Criar assinatura
      const subscriptionResponse = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          establishmentId: establishment.id,
          planId: pagarmePlanId,
          payment_method: "credit_card", // Por padrão, pode ser alterado depois
        }),
      });

      if (!subscriptionResponse.ok) {
        const errorData = await subscriptionResponse.json();
        throw new Error(errorData.error?.message || "Erro ao criar assinatura");
      }

      const subscriptionData = await subscriptionResponse.json();
      
      alert("Assinatura criada com sucesso! Você será redirecionado para o dashboard.");
      router.push("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao processar assinatura";
      alert(errorMessage);
      console.error("Erro ao assinar plano:", err);
    } finally {
      setSubscribingPlanId(null);
    }
  };

  // Planos originais da landing page
  const originalPlans = [
    {
      id: "basic",
      name: "Plano Básico",
      amount: 70, // R$ 0,70 por entrega
      days: 0, // Não é mensal, é por entrega
      payment_methods: ["credit_card", "boleto"],
      isPerDelivery: true,
      description: "Até 200 entregas: R$ 0,70 por entrega\nAcima de 200: R$ 0,85 por entrega adicional",
    },
    {
      id: "professional",
      name: "Plano Profissional",
      amount: 16990, // R$ 169,90 / mês
      days: 30,
      payment_methods: ["credit_card", "boleto"],
      isPerDelivery: false,
      description: "Inclui até 400 entregas\nAcima de 400: R$ 0,85 por entrega adicional",
      isPopular: true,
    },
    {
      id: "enterprise",
      name: "Plano Empresarial",
      amount: 19990, // R$ 199,90 / mês
      days: 30,
      payment_methods: ["credit_card", "boleto"],
      isPerDelivery: false,
      description: "Inclui entregas ilimitadas acima de 400",
      note: "Indicado para restaurantes com alto volume",
    },
  ];

  // Usar planos originais (os planos do Pagar.me podem ser usados para assinatura, mas exibimos os originais)
  const displayPlans = originalPlans;

  return (
    <section className="relative z-10 py-20 lg:py-28 border-t border-slate-800">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
            Escolha o <span className="text-orange-500">plano ideal</span> para você
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Planos flexíveis que se adaptam ao tamanho do seu negócio
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            <p className="mt-4 text-slate-400">Carregando planos...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchPlans}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {displayPlans.map((plan, index) => {
              const isPopular = plan.isPopular || index === 1;
              const price = (plan.amount / 100).toFixed(2).replace(".", ",");
              const isSubscribing = subscribingPlanId === String(plan.id);

              return (
                <div
                  key={plan.id}
                  className={`p-8 rounded-xl transition-all hover:shadow-lg ${
                    isPopular
                      ? "bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-500/50 hover:border-orange-500 hover:shadow-orange-500/20 relative"
                      : "bg-slate-900/50 border border-slate-800 hover:border-orange-500/50 hover:shadow-orange-500/10"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      POPULAR
                    </div>
                  )}
                  
                  <div className="text-4xl mb-4">
                    {index === 0 ? "📦" : index === 1 ? "🚀" : "🏆"}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-50 mb-2">{plan.name}</h3>
                  
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-orange-500">R$ {price}</span>
                    <span className="text-slate-400 ml-2">
                      {plan.isPerDelivery ? "por entrega" : "/mês"}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.description?.split("\n").map((line, idx) => (
                      <li key={idx} className="text-slate-300 flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                    {plan.note && (
                      <li className="text-slate-400 text-sm italic mt-4">
                        {plan.note}
                      </li>
                    )}
                  </ul>

                  {/* Mostrar botão de assinar apenas se estiver autenticado como ESTABLISHMENT */}
                  {isAuthenticated && user?.role === "ESTABLISHMENT" && (
                    <button
                      onClick={() => handleSubscribe(String(plan.id))}
                      disabled={isSubscribing}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                        isPopular
                          ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-50 border border-slate-700"
                      } ${isSubscribing ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isSubscribing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          Processando...
                        </span>
                      ) : (
                        "Assinar Agora"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

