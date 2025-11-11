"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

type TrackingData = {
  id: string;
  status: string;
  deliveryAddress: string;
  deliveryCode: string;
  customerName?: string;
  events: Array<{
    id: string;
    status: string;
    message?: string;
    createdAt: string;
  }>;
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: {
    label: "Recebido",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "📥",
  },
  ASSIGNED: {
    label: "Despachado",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "📤",
  },
  IN_TRANSIT: {
    label: "Em trânsito",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "🚚",
  },
  DELIVERED: {
    label: "Entregue",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: "✅",
  },
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "❌",
  },
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  const [code, setCode] = useState(codeFromUrl || "");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) {
      showToast("Por favor, insira um código de rastreamento", "warning");
      return;
    }

    setLoading(true);
    setError("");
    setTrackingData(null);

    try {
      const response = await api.get<TrackingData>(`/api/tracking/${code.trim()}`);
      setTrackingData(response.data);
      showToast("Pedido encontrado!", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Pedido não encontrado";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeFromUrl) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  const currentStatus = trackingData
    ? statusConfig[trackingData.status] || {
        label: trackingData.status,
        color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
        icon: "📦",
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl animate-fade-in">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Acompanhar Entrega</h1>
            <p className="text-sm text-slate-400">Digite o código de rastreamento para acompanhar seu pedido</p>
          </div>

          {/* Form de busca */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código (ex: ABC123)"
                  className="w-full px-4 py-3 pl-12 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-mono text-lg"
                  required
                  disabled={loading}
                />
                <span className="absolute left-4 top-3.5 text-slate-500 text-xl">🔍</span>
              </div>
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <span>🔎</span>
                    <span>Rastrear</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin text-6xl mb-4">⟳</div>
              <p className="text-slate-400">Buscando informações do pedido...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-12 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="text-red-400 mb-4 text-6xl">⚠</div>
              <p className="text-red-400 text-lg mb-2">{error}</p>
              <p className="text-slate-400 text-sm">Verifique se o código está correto e tente novamente</p>
            </div>
          )}

          {/* Tracking Data */}
          {trackingData && !loading && (
            <div className="space-y-6 animate-fade-in">
              {/* Status atual */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Status Atual</div>
                    <div className="text-2xl font-bold text-slate-50 flex items-center gap-2">
                      <span>{currentStatus?.icon}</span>
                      <span>{currentStatus?.label}</span>
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${currentStatus?.color}`}
                  >
                    {trackingData.deliveryCode}
                  </span>
                </div>
                {trackingData.customerName && (
                  <div className="text-sm text-slate-400 mt-2">
                    Cliente: <span className="text-slate-300">{trackingData.customerName}</span>
                  </div>
                )}
                <div className="text-sm text-slate-400 mt-1">
                  Endereço: <span className="text-slate-300">{trackingData.deliveryAddress}</span>
                </div>
              </div>

              {/* Timeline */}
              {trackingData.events && trackingData.events.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-semibold text-slate-50 mb-6 flex items-center gap-2">
                    <span>📋</span>
                    <span>Histórico de Atualizações</span>
                  </h3>
                  <div className="space-y-4">
                    {trackingData.events.map((event, index) => {
                      const eventStatus = statusConfig[event.status] || {
                        label: event.status,
                        color: "bg-slate-500/20 text-slate-300",
                        icon: "📦",
                      };
                      const isLast = index === trackingData.events!.length - 1;

                      return (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                isLast
                                  ? "bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/50"
                                  : "bg-slate-600 border-slate-600"
                              }`}
                            />
                            {index < trackingData.events!.length - 1 && (
                              <div className="w-0.5 h-full bg-slate-700 mt-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{eventStatus.icon}</span>
                                <span className="font-semibold text-slate-100">{eventStatus.label}</span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(event.createdAt).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            {event.message && (
                              <p className="text-sm text-slate-400 mt-1">{event.message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-slate-800 mt-8">
            <Link
              href="/"
              className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors inline-flex items-center gap-2"
            >
              <span>←</span>
              <span>Voltar para a página inicial</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⟳</div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    }>
      <TrackingContent />
    </Suspense>
  );
}
