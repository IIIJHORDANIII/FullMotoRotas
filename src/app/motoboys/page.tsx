"use client";

import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";

type Motoboy = {
  id: string;
  fullName: string;
  cpf: string;
  cnhNumber: string;
  vehicleType: string;
  phone?: string;
  isAvailable: boolean;
  user: {
    email: string;
    isActive: boolean;
  };
  metrics: {
    assignments: Record<string, number>;
    averageRating: number | null;
    ratingCount: number;
  };
  _count: {
    assignments: number;
  };
};

export default function MotoboysPage() {
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadMotoboys();
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      setError(null);
      api.get<Motoboy[]>("/api/motoboys")
        .then((response) => setMotoboys(response.data || []))
        .catch((err) => console.error("Erro ao atualizar motoboys:", err));
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMotoboys = async (showNotification = false) => {
    try {
      if (showNotification) setRefreshing(true);
      setError(null);
      const response = await api.get<Motoboy[]>("/api/motoboys");
      setMotoboys(response.data || []);
      if (showNotification) {
        showToast("Motoboys atualizados", "success");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar motoboys";
      setError(message);
      showToast(message, "error");
      console.error("Erro ao carregar motoboys:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredMotoboys = useMemo(() => {
    return motoboys.filter((motoboy) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        motoboy.fullName.toLowerCase().includes(searchLower) ||
        motoboy.user.email.toLowerCase().includes(searchLower) ||
        motoboy.cpf.toLowerCase().includes(searchLower) ||
        motoboy.phone?.toLowerCase().includes(searchLower);
      
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && motoboy.isAvailable) ||
        (availabilityFilter === "unavailable" && !motoboy.isAvailable);

      return matchesSearch && matchesAvailability;
    });
  }, [motoboys, search, availabilityFilter]);

  const stats = useMemo(() => {
    return {
      total: motoboys.length,
      available: motoboys.filter((m) => m.isAvailable).length,
      unavailable: motoboys.filter((m) => !m.isAvailable).length,
      active: motoboys.filter((m) => m.user.isActive).length,
    };
  }, [motoboys]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-50 mb-1">Motoboys</h1>
                <p className="text-sm text-slate-400">
                  {filteredMotoboys.length} de {motoboys.length} motoboys cadastrados
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => loadMotoboys(true)}
                  disabled={refreshing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Total</div>
                <div className="text-2xl font-bold text-slate-50">{stats.total}</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm text-green-300 mb-1">Disponíveis</div>
                <div className="text-2xl font-bold text-green-300">{stats.available}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="text-sm text-amber-300 mb-1">Indisponíveis</div>
                <div className="text-2xl font-bold text-amber-300">{stats.unavailable}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm text-blue-300 mb-1">Ativos</div>
                <div className="text-2xl font-bold text-blue-300">{stats.active}</div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <input
                  type="search"
                  placeholder="Buscar por nome, email, CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
                <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
              </div>

              <select
                value={availabilityFilter}
                onChange={(e) =>
                  setAvailabilityFilter(e.target.value as "all" | "available" | "unavailable")
                }
                className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="all">Todos</option>
                <option value="available">Disponíveis</option>
                <option value="unavailable">Indisponíveis</option>
              </select>
            </div>
          </div>

          {/* Grid de motoboys */}
          {loading ? (
            <div className="text-center text-slate-400 py-20">
              <div className="animate-spin text-6xl mb-4">⟳</div>
              <p className="text-lg">Carregando motoboys...</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-400 mb-4 text-6xl">⚠</div>
              <div className="text-red-400 mb-6 text-lg">{error}</div>
              <button
                onClick={() => loadMotoboys(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredMotoboys.length === 0 ? (
            <div className="text-center text-slate-400 py-20">
              <div className="text-6xl mb-4">🛵</div>
              <p className="text-lg font-semibold mb-2">Nenhum motoboy encontrado</p>
              <p className="text-sm">
                {search || availabilityFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Nenhum motoboy cadastrado ainda"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {filteredMotoboys.map((motoboy) => {
                const completedAssignments =
                  motoboy.metrics.assignments.COMPLETED || 0;
                const averageRating = motoboy.metrics.averageRating;

                return (
                  <div
                    key={motoboy.id}
                    className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-100 text-lg group-hover:text-orange-300 transition-colors mb-1">
                          {motoboy.fullName}
                        </div>
                        <div className="text-sm text-slate-400 flex items-center gap-1">
                          <span>📧</span>
                          <span>{motoboy.user.email}</span>
                        </div>
                        {motoboy.phone && (
                          <div className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                            <span>📞</span>
                            <span>{motoboy.phone}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          motoboy.isAvailable
                            ? "bg-green-500/20 text-green-300 border-green-500/30"
                            : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}
                      >
                        {motoboy.isAvailable ? "✓ Disponível" : "✗ Indisponível"}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">Documentação</div>
                        <div className="text-sm text-slate-300">
                          <div>CPF: <span className="font-mono">{motoboy.cpf}</span></div>
                          <div className="mt-1">CNH: <span className="font-mono">{motoboy.cnhNumber}</span></div>
                        </div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-1">Veículo</div>
                        <div className="text-sm text-slate-300 flex items-center gap-2">
                          <span>
                            {motoboy.vehicleType === "moto"
                              ? "🏍️"
                              : motoboy.vehicleType === "bike"
                              ? "🚲"
                              : "🚗"}
                          </span>
                          <span className="capitalize">{motoboy.vehicleType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Entregas</div>
                        <div className="text-lg font-bold text-slate-50">
                          {completedAssignments}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Avaliação</div>
                        <div className="text-lg font-bold text-slate-50 flex items-center gap-1">
                          {averageRating ? (
                            <>
                              <span>⭐</span>
                              <span>{averageRating.toFixed(1)}</span>
                              <span className="text-xs text-slate-500">
                                ({motoboy.metrics.ratingCount})
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!motoboy.user.isActive && (
                      <div className="mt-3 pt-3 border-t border-slate-800">
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <span>⚠</span>
                          <span>Conta inativa</span>
                        </span>
                      </div>
                    )}
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

