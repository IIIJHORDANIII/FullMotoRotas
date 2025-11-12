"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import Link from "next/link";

type Order = {
  id: string;
  deliveryCode: string;
  customerName: string;
  deliveryAddress: string;
  pickupAddress: string;
  status: string;
  assignments: Array<{
    id: string;
    status: string;
    assignedAt: string;
    motoboy: {
      id: string;
      fullName: string;
    };
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

export default function InboxPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    loadAssignments();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      loadAssignments();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadAssignments]);

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

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-50 mb-1">Minhas Corridas</h1>
                <p className="text-sm text-slate-400">
                  {activeOrders} {activeOrders === 1 ? "corrida ativa" : "corridas ativas"}
                </p>
              </div>
              <button
                onClick={() => loadAssignments(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>Atualizando...</span>
                  </>
                ) : (
                  <>
                    <span>⟳</span>
                    <span>Atualizar</span>
                  </>
                )}
              </button>
            </div>
          </div>

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
                    className={`p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all ${
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

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
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
    </ProtectedRoute>
  );
}
