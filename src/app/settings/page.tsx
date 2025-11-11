"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type UserProfile = {
  id: string;
  email: string;
  role: "ADMIN" | "ESTABLISHMENT" | "MOTOBOY";
};

export default function SettingsPage() {
  const { logout } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "preferences">("profile");

  // Form states
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadProfile = async () => {
    try {
      const response = await api.get<UserProfile>("/api/auth/me");
      setProfile(response.data);
      setEmail(response.data.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar perfil";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Aqui você pode adicionar uma API para atualizar o perfil quando disponível
      showToast("Perfil atualizado com sucesso!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar perfil";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("As senhas não coincidem", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast("A senha deve ter no mínimo 8 caracteres", "error");
      return;
    }

    setSaving(true);

    try {
      // Aqui você pode adicionar uma API para alterar senha quando disponível
      showToast("Senha alterada com sucesso!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao alterar senha";
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    showToast("Sessão encerrada", "info");
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin text-6xl mb-4">⟳</div>
              <p className="text-slate-400">Carregando configurações...</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-50 mb-1">Configurações</h1>
            <p className="text-sm text-slate-400">Gerencie suas preferências e dados da conta</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-800">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "profile"
                  ? "text-orange-400 border-b-2 border-orange-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              👤 Perfil
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "security"
                  ? "text-orange-400 border-b-2 border-orange-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              🔐 Segurança
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "preferences"
                  ? "text-orange-400 border-b-2 border-orange-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              ⚙️ Preferências
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-6 animate-fade-in">
            {/* Perfil */}
            {activeTab === "profile" && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-6">Dados do Perfil</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      disabled
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      O e-mail não pode ser alterado por questões de segurança
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tipo de Conta
                    </label>
                    <input
                      type="text"
                      value={
                        profile?.role === "ADMIN"
                          ? "Administrador"
                          : profile?.role === "ESTABLISHMENT"
                          ? "Estabelecimento"
                          : "Motoboy"
                      }
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                      disabled
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Segurança */}
            {activeTab === "security" && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-semibold text-slate-50 mb-6">Alterar Senha</h2>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Mínimo de 8 caracteres
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          <span>Alterando...</span>
                        </>
                      ) : (
                        <>
                          <span>🔐</span>
                          <span>Alterar Senha</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Preferências */}
            {activeTab === "preferences" && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-slate-50 mb-4">Preferências</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-100">Notificações por E-mail</div>
                        <div className="text-sm text-slate-400">
                          Receba atualizações sobre seus pedidos
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-100">Auto-refresh</div>
                        <div className="text-sm text-slate-400">
                          Atualizar dados automaticamente
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sessão */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-xl font-semibold text-slate-50 mb-4">Sessão</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="font-medium text-slate-100 mb-1">Sessão Atual</div>
                      <div className="text-sm text-slate-400">
                        Você está logado como <span className="text-slate-300">{profile?.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🚪</span>
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

