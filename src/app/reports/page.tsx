"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";

type ReportSummary = {
  totals: {
    users: number;
    motoboys: number;
    establishments: number;
  };
  orders: Record<string, number>;
  ratings: {
    average: number | null;
    count: number;
  };
};

const statusLabels: Record<string, string> = {
  PENDING: "Recebidos",
  ASSIGNED: "Despachados",
  IN_TRANSIT: "Em trânsito",
  DELIVERED: "Entregues",
  CANCELLED: "Cancelados",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-blue-500",
  ASSIGNED: "bg-purple-500",
  IN_TRANSIT: "bg-amber-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadReport();
    // Auto-refresh a cada 60 segundos
    const interval = setInterval(() => {
      setError(null);
      api.get<ReportSummary>("/api/reports/summary")
        .then((response) => setReport(response.data))
        .catch((err) => console.error("Erro ao atualizar relatório:", err));
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadReport = async (showNotification = false) => {
    try {
      if (showNotification) setRefreshing(true);
      setError(null);
      const response = await api.get<ReportSummary>("/api/reports/summary");
      setReport(response.data);
      if (showNotification) {
        showToast("Relatório atualizado", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar relatório";
      setError(message);
      showToast(message, "error");
      console.error("Erro ao carregar relatório:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalOrders = report
    ? Object.values(report.orders).reduce((sum, count) => sum + count, 0)
    : 0;

  const orderEntries = report
    ? Object.entries(report.orders).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-50 mb-1">Relatórios</h1>
                <p className="text-sm text-slate-400">Visão consolidada do sistema</p>
              </div>
              <button
                onClick={() => loadReport(true)}
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
              <p className="text-lg">Carregando relatórios...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-400 mb-4 text-6xl">⚠</div>
              <div className="text-red-400 mb-6 text-lg">{error}</div>
              <button
                onClick={() => loadReport(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : report ? (
            <div className="space-y-6 animate-fade-in">
              {/* Cards de Totais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-slate-400">Total de Usuários</div>
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-50">{report.totals.users}</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-blue-300">Estabelecimentos</div>
                    <div className="text-2xl">🏢</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-300">{report.totals.establishments}</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-green-300">Motoboys</div>
                    <div className="text-2xl">🛵</div>
                  </div>
                  <div className="text-3xl font-bold text-green-300">{report.totals.motoboys}</div>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-orange-300">Total de Pedidos</div>
                    <div className="text-2xl">📦</div>
                  </div>
                  <div className="text-3xl font-bold text-orange-300">{totalOrders}</div>
                </div>
              </div>

              {/* Gráfico de Pedidos por Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-slate-50 mb-6 flex items-center gap-2">
                  <span>📊</span>
                  <span>Pedidos por Status</span>
                </h2>
                {orderEntries.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    Nenhum pedido registrado ainda
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orderEntries.map(([status, count]) => {
                      const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full ${statusColors[status] || "bg-slate-500"}`}
                              />
                              <span className="text-sm font-medium text-slate-300">
                                {statusLabels[status] || status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-slate-400">{count} pedidos</span>
                              <span className="text-sm font-semibold text-slate-300 w-12 text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-full ${statusColors[status] || "bg-slate-500"} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Avaliações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                    <span>⭐</span>
                    <span>Avaliações</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Média Geral</div>
                      <div className="text-3xl font-bold text-slate-50 flex items-center gap-2">
                        {report.ratings.average ? (
                          <>
                            <span>⭐</span>
                            <span>{report.ratings.average.toFixed(1)}</span>
                            <span className="text-lg text-slate-400">/ 5.0</span>
                          </>
                        ) : (
                          <span className="text-slate-500">Sem avaliações</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Total de Avaliações</div>
                      <div className="text-2xl font-bold text-slate-50">{report.ratings.count}</div>
                    </div>
                  </div>
                </div>

                {/* Resumo de Status */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                    <span>📈</span>
                    <span>Resumo de Status</span>
                  </h3>
                  <div className="space-y-2">
                    {orderEntries.slice(0, 5).map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${statusColors[status] || "bg-slate-500"}`}
                          />
                          <span className="text-sm text-slate-300">
                            {statusLabels[status] || status}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-50">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estatísticas Adicionais */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-slate-50 mb-4 flex items-center gap-2">
                  <span>📋</span>
                  <span>Estatísticas do Sistema</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Taxa de Entrega</div>
                    <div className="text-2xl font-bold text-slate-50">
                      {totalOrders > 0
                        ? (
                            ((report.orders.DELIVERED || 0) / totalOrders) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Taxa de Cancelamento</div>
                    <div className="text-2xl font-bold text-red-400">
                      {totalOrders > 0
                        ? (
                            ((report.orders.CANCELLED || 0) / totalOrders) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-sm text-slate-400 mb-1">Pedidos em Andamento</div>
                    <div className="text-2xl font-bold text-amber-400">
                      {(report.orders.ASSIGNED || 0) + (report.orders.IN_TRANSIT || 0)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

