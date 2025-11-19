"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";

// Importar mapa dinamicamente para evitar problemas de SSR
const MotoboyLocationMap = dynamic(() => import("@/components/MotoboyLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
      <div className="text-center text-slate-400">
        <div className="animate-spin text-4xl mb-4">⟳</div>
        <p>Carregando mapa...</p>
      </div>
    </div>
  ),
});

type Order = {
  id: string;
  deliveryCode: string;
  customerName: string;
  deliveryAddress: string;
  pickupAddress: string;
  status: string;
  createdAt: string;
  assignments: Array<{
    id: string;
    status: string;
    assignedAt: string;
  }>;
};

const assignmentStatusConfig: Record<string, { label: string; color: string; icon: string }> = {
  ASSIGNED: {
    label: "Atribuída",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "📬",
  },
  ACCEPTED: {
    label: "Aceita",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "✅",
  },
  IN_TRANSIT: {
    label: "Em trânsito",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "🚚",
  },
  COMPLETED: {
    label: "Completa",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: "🎉",
  },
  REJECTED: {
    label: "Rejeitada",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "❌",
  },
};

type MotoboyProfile = {
  id: string;
  fullName: string;
  currentLat: number | null;
  currentLng: number | null;
  isAvailable: boolean;
  vehicleType: string;
};

export default function MotoboyDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [motoboyProfile, setMotoboyProfile] = useState<MotoboyProfile | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadAssignments = useCallback(async (shouldShowToast = false) => {
    try {
      if (shouldShowToast) setRefreshing(true);
      setError(null);
      const response = await api.get<Order[]>("/api/orders");
      setOrders(response.data || []);
      if (shouldShowToast) {
        showToast("Corridas atualizadas", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar corridas";
      setError(message);
      showToast(message, "error");
      console.error("Erro ao carregar corridas:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  // Carregar perfil do motoboy
  const loadMotoboyProfile = useCallback(async () => {
    try {
      const response = await api.get<MotoboyProfile>("/api/motoboys/me");
      setMotoboyProfile(response.data);
      
      // Se já tem localização salva, usar ela
      if (response.data.currentLat && response.data.currentLng) {
        setLocation({
          lat: response.data.currentLat,
          lng: response.data.currentLng,
        });
      }
    } catch (err) {
      console.error("Erro ao carregar perfil do motoboy:", err);
    }
  }, []);

  // Atualizar localização no servidor (com throttling)
  // Usar useRef para evitar recriação da função e manter GPS sempre ativo
  const motoboyProfileRef = useRef<MotoboyProfile | null>(null);
  
  useEffect(() => {
    motoboyProfileRef.current = motoboyProfile;
  }, [motoboyProfile]);

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await api.patch("/api/motoboys/me", {
        currentLat: lat,
        currentLng: lng,
      });
      // Atualizar perfil usando ref para evitar dependência circular
      if (motoboyProfileRef.current) {
        setMotoboyProfile({
          ...motoboyProfileRef.current,
          currentLat: lat,
          currentLng: lng,
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar localização:", err);
      // Não interromper o GPS mesmo se houver erro na atualização
    }
  }, []); // Sem dependências - função estável que não será recriada

  // Obter geolocalização do navegador (apenas no cliente)
  // Usar useRef para manter referência estável e evitar recriação do watch
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  
  useEffect(() => {
    // Verificar se está no cliente
    if (typeof window === "undefined") return;
    
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada pelo navegador");
      return;
    }

    // Limpar watch anterior se existir
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const UPDATE_INTERVAL = 15000; // Atualizar no servidor a cada 15 segundos (mais frequente)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const now = Date.now();
        
        // Sempre atualizar o estado local para o mapa
        setLocation({ lat: latitude, lng: longitude });
        setLocationError(null);
        
        // Atualizar no servidor a cada intervalo
        if (now - lastUpdateTimeRef.current >= UPDATE_INTERVAL) {
          lastUpdateTimeRef.current = now;
          updateLocation(latitude, longitude).catch((err) => {
            console.error("Erro ao atualizar localização no servidor:", err);
            // Continuar tentando mesmo se houver erro
          });
        }
      },
      (error) => {
        let message = "Erro ao obter localização";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Permissão de localização negada. Por favor, permita o acesso à localização.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Localização indisponível.";
            break;
          case error.TIMEOUT:
            message = "Tempo esgotado ao obter localização.";
            break;
        }
        setLocationError(message);
        console.error("Erro de geolocalização:", error);
        // Não limpar o watch em caso de erro - continuar tentando
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Aumentar timeout para 15 segundos
        maximumAge: 0, // Sempre obter posição mais recente possível
      }
    );

    // Cleanup apenas quando o componente for desmontado
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Limpar localização no servidor ao sair da página
      const token = localStorage.getItem("motorotas_token");
      if (token) {
        // Limpar localização de forma assíncrona sem bloquear
        fetch("/api/motoboys/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentLat: null,
            currentLng: null,
            isAvailable: false,
          }),
        }).catch((err) => {
          console.error("[Motoboy Dashboard] Erro ao limpar localização:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // updateLocation é estável (useCallback sem dependências), não precisa estar nas deps

  useEffect(() => {
    loadAssignments();
    loadMotoboyProfile();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      loadAssignments();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAssignments, loadMotoboyProfile]);

  const handleAccept = async (orderId: string) => {
    setProcessing((prev) => new Set(prev).add(orderId));
    try {
      await api.patch(`/api/orders/${orderId}/assign`, {
        status: "ACCEPTED",
      });
      showToast("Corrida aceita com sucesso!", "success");
      await loadAssignments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao aceitar corrida";
      showToast(message, "error");
      console.error("Erro ao aceitar corrida:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleReject = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja rejeitar esta corrida?")) return;

    setProcessing((prev) => new Set(prev).add(orderId));
    try {
      await api.patch(`/api/orders/${orderId}/assign`, {
        status: "REJECTED",
      });
      showToast("Corrida rejeitada", "info");
      await loadAssignments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao rejeitar corrida";
      showToast(message, "error");
      console.error("Erro ao rejeitar corrida:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleComplete = async (orderId: string) => {
    if (!confirm("Confirmar entrega? Esta ação não pode ser desfeita.")) return;

    setProcessing((prev) => new Set(prev).add(orderId));
    try {
      await api.patch(`/api/orders/${orderId}/assign`, {
        status: "COMPLETED",
      });
      showToast("Entrega confirmada! 🎉", "success");
      await loadAssignments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao completar corrida";
      showToast(message, "error");
      console.error("Erro ao completar corrida:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const activeOrders = orders.filter(
    (order) => order.assignments?.[0]?.status !== "COMPLETED" && order.assignments?.[0]?.status !== "REJECTED"
  ).length;

  const pendingOrders = orders.filter(
    (order) => order.assignments?.[0]?.status === "ASSIGNED"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.assignments?.[0]?.status === "COMPLETED"
  ).length;

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["MOTOBOY"]}>
        <AppLayout>
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-1">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-400">Suas corridas e entregas em tempo real</p>
                </div>
                <button
                  onClick={() => loadAssignments(true)}
                  disabled={refreshing}
                  className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                  {refreshing ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span className="hidden sm:inline">Atualizando...</span>
                      <span className="sm:hidden">Atualizando</span>
                    </>
                  ) : (
                    <>
                      <span>⟳</span>
                      <span>Atualizar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Cards de estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 sm:p-4">
                  <div className="text-xs sm:text-sm text-slate-400 mb-1">Corridas Ativas</div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-50">{activeOrders}</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 sm:p-4">
                  <div className="text-xs sm:text-sm text-blue-300 mb-1">Pendentes</div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-300">{pendingOrders}</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 sm:p-4">
                  <div className="text-xs sm:text-sm text-green-300 mb-1">Completas</div>
                  <div className="text-lg sm:text-2xl font-bold text-green-300">{completedOrders}</div>
                </div>
              </div>
            </div>

            {/* Mapa com localização */}
            {location ? (
              <div className="mb-4 sm:mb-6">
                <div className="mb-2 sm:mb-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-50 mb-1">Sua Localização</h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Sua localização está sendo atualizada automaticamente
                  </p>
                </div>
                <div className="h-[300px] sm:h-[400px] lg:h-[500px]">
                  <MotoboyLocationMap
                    lat={location.lat}
                    lng={location.lng}
                    fullName={motoboyProfile?.fullName || "Você"}
                  />
                </div>
              </div>
            ) : locationError ? (
              <div className="mb-4 sm:mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-yellow-300 mb-1">Localização não disponível</div>
                    <div className="text-xs text-yellow-200/80">{locationError}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 sm:mb-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-spin">⟳</span>
                  <div className="text-sm text-slate-400">Obtendo sua localização...</div>
                </div>
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="text-center text-slate-400 py-20">
                <div className="animate-spin text-6xl mb-4">⟳</div>
                <p className="text-lg">Carregando corridas...</p>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="text-red-400 mb-4 text-6xl">⚠</div>
                <div className="text-red-400 mb-6 text-lg">{error}</div>
                <button
                  onClick={() => loadAssignments(true)}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center text-slate-400 py-20">
                <div className="text-6xl mb-4">📬</div>
                <p className="text-lg font-semibold mb-2">Nenhuma corrida disponível</p>
                <p className="text-sm">Novas corridas aparecerão aqui quando atribuídas a você</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {orders.map((order) => {
                  const assignment = order.assignments?.[0];
                  if (!assignment) return null;

                  const statusConfig =
                    assignmentStatusConfig[assignment.status] || {
                      label: assignment.status,
                      color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                      icon: "📦",
                    };

                  const isProcessing = processing.has(order.id);

                  return (
                    <div
                      key={order.id}
                      className={`p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all ${
                        isProcessing ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-100 text-lg mb-1">
                            {order.customerName}
                          </div>
                          <div className="text-sm text-slate-400">
                            Código: <span className="font-mono">{order.deliveryCode}</span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}
                        >
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <span>📍</span>
                            <span>Retirada</span>
                          </div>
                          <div className="text-sm text-slate-300">{order.pickupAddress}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <span>🏠</span>
                            <span>Entrega</span>
                          </div>
                          <div className="text-sm text-slate-300">{order.deliveryAddress}</div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-800">
                        <div className="text-xs text-slate-500">
                          Atribuída em: {new Date(assignment.assignedAt).toLocaleString("pt-BR")}
                        </div>
                        <div className="flex gap-2">
                          {assignment.status === "ASSIGNED" && (
                            <>
                              <button
                                onClick={() => handleAccept(order.id)}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="animate-spin">⟳</span>
                                    <span>Processando...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>✓</span>
                                    <span>Aceitar</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(order.id)}
                                disabled={isProcessing}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded-lg border border-red-500/30 transition-colors disabled:opacity-50"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {assignment.status === "ACCEPTED" && (
                            <button
                              onClick={() => handleComplete(order.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isProcessing ? (
                                <>
                                  <span className="animate-spin">⟳</span>
                                  <span>Processando...</span>
                                </>
                              ) : (
                                <>
                                  <span>✓</span>
                                  <span>Confirmar Entrega</span>
                                </>
                              )}
                            </button>
                          )}
                          {assignment.status === "COMPLETED" && (
                            <Link
                              href={`/tracking?code=${order.deliveryCode}`}
                              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                            >
                              Ver Detalhes
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </AppLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}

