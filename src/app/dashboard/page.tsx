"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";

// Importar mapa dinamicamente para evitar problemas de SSR
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
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
  status: string;
  createdAt: string;
  customerPhone?: string;
};

type Motoboy = {
  id: string;
  fullName: string;
  currentLat: number | null;
  currentLng: number | null;
  isAvailable: boolean;
  vehicleType: string;
  phone?: string;
};

type OrderStatus = "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Recebidos",
  ASSIGNED: "Despachados",
  IN_TRANSIT: "Em trânsito",
  DELIVERED: "Entregues",
  CANCELLED: "Cancelados",
};

const statusColors: Record<OrderStatus, string> = {
  PENDING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ASSIGNED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  IN_TRANSIT: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  DELIVERED: "bg-green-500/20 text-green-300 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [filteredStatus, setFilteredStatus] = useState<OrderStatus | "ALL">("ALL");
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const loadOrders = async (showLoading = false) => {
    try {
      if (showLoading) setRefreshing(true);
      setError(null);
      const response = await api.get<Order[]>("/api/orders");
      setOrders(response.data || []);
      if (showLoading) {
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

  const loadMotoboys = async () => {
    try {
      const response = await api.get<Motoboy[]>("/api/motoboys");
      // Filtrar apenas motoboys com localização
      const motoboysWithLocation = (response.data || []).filter(
        (m) => m.currentLat !== null && m.currentLng !== null
      );
      setMotoboys(motoboysWithLocation);
    } catch (err) {
      console.error("Erro ao carregar motoboys:", err);
    }
  };

  useEffect(() => {
    loadOrders();
    loadMotoboys();
    // Auto-refresh a cada 15 segundos para atualizar posições dos motoboys
    // Isso garante que as localizações atualizadas pelos motoboys apareçam no mapa
    const interval = setInterval(() => {
      loadMotoboys();
      setError(null);
      api.get<Order[]>("/api/orders")
        .then((response) => setOrders(response.data || []))
        .catch((err) => console.error("Erro ao atualizar pedidos:", err));
    }, 15000); // 15 segundos para sincronizar com atualização dos motoboys (30s / 2)
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders =
    filteredStatus === "ALL"
      ? orders
      : orders.filter((order) => order.status === filteredStatus);

  const statusCounts = {
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    ASSIGNED: orders.filter((o) => o.status === "ASSIGNED").length,
    IN_TRANSIT: orders.filter((o) => o.status === "IN_TRANSIT").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  const totalOrders = orders.length;
  const availableMotoboys = motoboys.filter((m) => m.isAvailable).length;

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["ADMIN", "ESTABLISHMENT"]}>
        <AppLayout>
        <div className="relative h-full flex flex-col">
          {/* Header com estatísticas */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-50 mb-1">Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-400">Visão geral das entregas e motoboys em tempo real</p>
              </div>
              <button
                onClick={() => {
                  loadOrders(true);
                  loadMotoboys();
                }}
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-slate-400 mb-1">Total de Pedidos</div>
                <div className="text-lg sm:text-2xl font-bold text-slate-50">{totalOrders}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-blue-300 mb-1">Recebidos</div>
                <div className="text-lg sm:text-2xl font-bold text-blue-300">{statusCounts.PENDING}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-amber-300 mb-1">Em Trânsito</div>
                <div className="text-lg sm:text-2xl font-bold text-amber-300">{statusCounts.IN_TRANSIT}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-green-300 mb-1">Entregues</div>
                <div className="text-lg sm:text-2xl font-bold text-green-300">{statusCounts.DELIVERED}</div>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 sm:p-4">
                <div className="text-xs sm:text-sm text-orange-300 mb-1">Motoboys Ativos</div>
                <div className="text-lg sm:text-2xl font-bold text-orange-300">{availableMotoboys}</div>
              </div>
            </div>
          </div>

          {/* Mapa */}
          <div className="flex-1 relative bg-slate-900 min-h-[300px] sm:min-h-[500px]">
            <MapComponent
              motoboys={motoboys}
              center={[-23.5505, -46.6333]} // São Paulo como padrão
              zoom={12}
            />

            {/* Mensagem quando não há motoboys */}
            {motoboys.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
                <div className="text-center text-slate-400 bg-slate-900/80 backdrop-blur-sm rounded-lg p-6 border border-slate-800 animate-fade-in">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-lg font-semibold text-slate-200">Mapa de Motoboys</p>
                  <p className="text-sm mt-2 text-slate-400">
                    {loading ? "Carregando..." : "Nenhum motoboy com localização disponível"}
                  </p>
                </div>
              </div>
            )}

            {/* Legenda do Mapa */}
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-2 sm:p-4 z-[1000] shadow-xl max-w-[calc(100%-1rem)] sm:max-w-none">
              <div className="text-xs sm:text-sm font-semibold text-slate-50 mb-1 sm:mb-2">Legenda</div>
              <div className="space-y-1 sm:space-y-2 text-xs">
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 border-2 border-white"></div>
                  <span className="text-slate-300">Disponível</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 border-2 border-white"></div>
                  <span className="text-slate-300">Indisponível</span>
                </div>
                <div className="pt-1 sm:pt-2 border-t border-slate-700 text-slate-400 text-xs">
                  {motoboys.length} motoboy{motoboys.length !== 1 ? "s" : ""} no mapa
                </div>
              </div>
            </div>

            {/* FAB Status */}
            <button
              onClick={() => setStatusPanelOpen(!statusPanelOpen)}
              className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 sm:w-16 sm:h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-lg shadow-orange-500/50 flex items-center justify-center text-xl sm:text-2xl z-[1000] transition-all hover:scale-110 hover:shadow-xl"
              aria-label="Abrir status"
            >
              📦
            </button>
          </div>

          {/* Painel de Status */}
          <aside
            className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-slate-900 border-l border-slate-800 transform transition-transform duration-300 z-20 shadow-xl ${
              statusPanelOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-50">Status de Entregas</h3>
                  <button
                    onClick={() => setStatusPanelOpen(false)}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 hover:bg-slate-700 rounded text-xl sm:text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Filtros */}
              <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-800/30">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setFilteredStatus("ALL")}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      filteredStatus === "ALL"
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Todos ({totalOrders})
                  </button>
                  {(Object.keys(statusLabels) as OrderStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilteredStatus(status)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                        filteredStatus === status
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/50"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {statusLabels[status]} ({statusCounts[status]})
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de pedidos */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {loading ? (
                  <div className="text-center text-slate-400 py-12">
                    <div className="animate-spin text-4xl mb-4">⟳</div>
                    <p>Carregando pedidos...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="text-red-400 mb-4 text-4xl">⚠</div>
                    <div className="text-red-400 mb-4">{error}</div>
                    <button
                      onClick={() => loadOrders(true)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center text-slate-400 py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-lg">Nenhum pedido encontrado</p>
                    <p className="text-sm mt-2">Tente ajustar os filtros</p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    {filteredOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders?order=${order.id}`}
                        className="block p-3 sm:p-4 bg-slate-800 border border-slate-700 rounded-lg hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-100 group-hover:text-orange-300 transition-colors">
                              {order.customerName}
                            </div>
                            <div className="text-sm text-slate-400 mt-1 line-clamp-1">
                              {order.deliveryAddress}
                            </div>
                            {order.customerPhone && (
                              <div className="text-xs text-slate-500 mt-1">
                                📞 {order.customerPhone}
                              </div>
                            )}
                          </div>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium border ${
                              statusColors[order.status as OrderStatus] ||
                              "bg-slate-500/20 text-slate-300 border-slate-500/30"
                            }`}
                          >
                            {statusLabels[order.status as OrderStatus] || order.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <div className="text-xs text-slate-500">
                            Código: <span className="font-mono text-slate-300">{order.deliveryCode}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </AppLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}
