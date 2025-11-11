"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";

type Order = {
  id: string;
  deliveryCode: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: string;
  createdAt: string;
  establishment?: { name: string };
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: {
    label: "Recebidos",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "📥",
  },
  ASSIGNED: {
    label: "Despachados",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "📤",
  },
  IN_TRANSIT: {
    label: "Em trânsito",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "🚚",
  },
  DELIVERED: {
    label: "Entregues",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: "✅",
  },
  CANCELLED: {
    label: "Cancelados",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "❌",
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadOrders();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      setError(null);
      api.get<Order[]>("/api/orders")
        .then((response) => setOrders(response.data || []))
        .catch((err) => console.error("Erro ao atualizar pedidos:", err));
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async (showNotification = false) => {
    try {
      if (showNotification) setRefreshing(true);
      setError(null);
      const response = await api.get<Order[]>("/api/orders");
      setOrders(response.data || []);
      if (showNotification) {
        showToast("Pedidos atualizados", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedidos";
      setError(message);
      showToast(message, "error");
      console.error("Erro ao carregar pedidos:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        order.customerName.toLowerCase().includes(searchLower) ||
        order.deliveryAddress.toLowerCase().includes(searchLower) ||
        order.deliveryCode.toLowerCase().includes(searchLower) ||
        order.customerPhone?.toLowerCase().includes(searchLower);
      const matchesStatus = !statusFilter || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [orders]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-50 mb-1">Pedidos</h1>
                <p className="text-sm text-slate-400">
                  {filteredOrders.length} de {orders.length} pedidos
                </p>
              </div>
              <button
                onClick={() => loadOrders(true)}
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

            {/* Toolbar */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="search"
                  placeholder="Buscar por cliente, endereço, código..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
                <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="">Todos os status</option>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.icon} {config.label} ({statusCounts[value] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid de pedidos */}
          {loading ? (
            <div className="text-center text-slate-400 py-20">
              <div className="animate-spin text-6xl mb-4">⟳</div>
              <p className="text-lg">Carregando pedidos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-400 mb-4 text-6xl">⚠</div>
              <div className="text-red-400 mb-6 text-lg">{error}</div>
              <button
                onClick={() => loadOrders(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-slate-400 py-20">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-semibold mb-2">Nenhum pedido encontrado</p>
              <p className="text-sm">
                {search || statusFilter
                  ? "Tente ajustar os filtros de busca"
                  : "Nenhum pedido cadastrado ainda"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status] || {
                  label: order.status,
                  color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
                  icon: "📦",
                };

                return (
                  <div
                    key={order.id}
                    className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-100 text-lg group-hover:text-orange-300 transition-colors">
                          {order.customerName}
                        </div>
                        {order.customerPhone && (
                          <div className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                            <span>📞</span>
                            <span>{order.customerPhone}</span>
                          </div>
                        )}
                        {order.establishment && (
                          <div className="text-xs text-slate-500 mt-1">
                            🏢 {order.establishment.name}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}
                      >
                        {status.icon} {status.label}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                          <span>📍</span>
                          <span>Retirada</span>
                        </div>
                        <div className="text-sm text-slate-300 line-clamp-2">
                          {order.pickupAddress}
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                          <span>🏠</span>
                          <span>Entrega</span>
                        </div>
                        <div className="text-sm text-slate-300 line-clamp-2">
                          {order.deliveryAddress}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div className="text-xs text-slate-500">
                        Código:{" "}
                        <span className="font-mono text-slate-300">{order.deliveryCode}</span>
                      </div>
                      <Link
                        href={`/tracking?code=${order.deliveryCode}`}
                        className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors flex items-center gap-1"
                      >
                        Rastrear <span>→</span>
                      </Link>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-800">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
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
