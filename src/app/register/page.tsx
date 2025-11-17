"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import Link from "next/link";

type Role = "ESTABLISHMENT" | "MOTOBOY";

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("ESTABLISHMENT");
  const { isAuthenticated, register } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    // Empresa
    bizName: "",
    cnpj: "",
    cep: "",
    address: "",
    city: "",
    state: "",
    // Motoboy
    cpf: "",
    cnh: "",
    vehicleType: "moto",
    plate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateField = (name: string, value: string) => {
    const newErrors: Record<string, string> = {};

    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) newErrors.email = "E-mail é obrigatório";
      else if (!emailRegex.test(value)) newErrors.email = "E-mail inválido";
    }

    if (name === "password") {
      if (!value) newErrors.password = "Senha é obrigatória";
      else if (value.length < 8) newErrors.password = "Senha deve ter no mínimo 8 caracteres";
    }

    if (name === "confirmPassword") {
      if (!value) newErrors.confirmPassword = "Confirmação de senha é obrigatória";
      else if (value !== formData.password) newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validações
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "E-mail é obrigatório";
    if (!formData.password) newErrors.password = "Senha é obrigatória";
    if (formData.password.length < 8) newErrors.password = "Senha deve ter no mínimo 8 caracteres";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }
    if (!formData.name) newErrors.name = "Nome é obrigatório";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Por favor, corrija os erros no formulário", "warning");
      return;
    }

    setLoading(true);

    try {
      const profile =
        role === "ESTABLISHMENT"
          ? {
              name: formData.bizName || formData.name,
              cnpj: formData.cnpj.replace(/\D/g, ""),
              contactEmail: formData.email,
              contactPhone: formData.phone,
              addressLine1: formData.address,
              city: formData.city,
              state: formData.state,
              postalCode: formData.cep.replace(/\D/g, ""),
            }
          : {
              fullName: formData.name,
              cpf: formData.cpf.replace(/\D/g, ""),
              cnhNumber: formData.cnh,
              cnhCategory: "AB",
              vehicleType: formData.vehicleType,
              phone: formData.phone,
            };

      await register({
        email: formData.email,
        password: formData.password,
        role,
        profile,
      });

      showToast("Conta criada com sucesso! 🎉", "success");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao criar conta";
      showToast(message, "error");
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  // Não renderizar se já estiver autenticado (evita flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Image
              src="/Logo.png"
              alt="MOTO ROTAS"
              width={150}
              height={50}
              className="h-10 sm:h-12 w-auto mx-auto"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">Criar conta</h1>
          <p className="text-sm sm:text-base text-slate-400">Preencha os dados para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl animate-fade-in">
          {/* Seleção de papel */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-300 mb-3">Eu sou</legend>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="ESTABLISHMENT"
                  checked={role === "ESTABLISHMENT"}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="sr-only"
                />
                <div
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      role === "ESTABLISHMENT"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-slate-700 bg-slate-800/50"
                    }`}
                >
                  <div className="text-2xl mb-2">🏢</div>
                  <div className="text-sm font-medium text-slate-200">Empresa / Restaurante</div>
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="MOTOBOY"
                  checked={role === "MOTOBOY"}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="sr-only"
                />
                <div
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      role === "MOTOBOY"
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-slate-700 bg-slate-800/50"
                    }`}
                >
                  <div className="text-2xl mb-2">🛵</div>
                  <div className="text-sm font-medium text-slate-200">Motoboy</div>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Campos comuns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nome completo</label>
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                onBlur={() => validateField("name", formData.name)}
                required
                className={`w-full px-4 py-3 bg-slate-950 border rounded-lg text-slate-100 transition-all ${
                  errors.name ? "border-red-500" : "border-slate-800 focus:ring-2 focus:ring-orange-500"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <span>⚠</span>
                  <span>{errors.name}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Telefone</label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">E-mail</label>
            <div className="relative">
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => validateField("email", formData.email)}
                required
                className={`w-full px-4 py-3 pl-11 bg-slate-950 border rounded-lg text-slate-100 transition-all ${
                  errors.email ? "border-red-500" : "border-slate-800 focus:ring-2 focus:ring-orange-500"
                }`}
              />
              <span className="absolute left-3 top-3.5 text-slate-500">📧</span>
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                <span>⚠</span>
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => validateField("password", formData.password)}
                  required
                  minLength={8}
                  className={`w-full px-4 py-3 pl-11 pr-11 bg-slate-950 border rounded-lg text-slate-100 transition-all ${
                    errors.password ? "border-red-500" : "border-slate-800 focus:ring-2 focus:ring-orange-500"
                  }`}
                />
                <span className="absolute left-3 top-3.5 text-slate-500">🔒</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <span>⚠</span>
                  <span>{errors.password}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirmar senha</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => validateField("confirmPassword", formData.confirmPassword)}
                  required
                  minLength={8}
                  className={`w-full px-4 py-3 pl-11 pr-11 bg-slate-950 border rounded-lg text-slate-100 transition-all ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : "border-slate-800 focus:ring-2 focus:ring-orange-500"
                  }`}
                />
                <span className="absolute left-3 top-3.5 text-slate-500">🔒</span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <span>⚠</span>
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>

          {/* Campos específicos de empresa */}
          {role === "ESTABLISHMENT" && (
            <fieldset className="space-y-4 border-t border-slate-800 pt-6">
              <legend className="text-sm font-medium text-slate-300 mb-4">Dados da empresa</legend>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome do restaurante</label>
                <input
                  name="bizName"
                  type="text"
                  value={formData.bizName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">CNPJ (opcional)</label>
                  <input
                    name="cnpj"
                    type="text"
                    value={formData.cnpj}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">CEP</label>
                  <input
                    name="cep"
                    type="text"
                    value={formData.cep}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Endereço</label>
                <input
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cidade</label>
                  <input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">UF</label>
                  <input
                    name="state"
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {/* Campos específicos de motoboy */}
          {role === "MOTOBOY" && (
            <fieldset className="space-y-4 border-t border-slate-800 pt-6">
              <legend className="text-sm font-medium text-slate-300 mb-4">Dados do motoboy</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">CPF</label>
                  <input
                    name="cpf"
                    type="text"
                    value={formData.cpf}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">CNH</label>
                  <input
                    name="cnh"
                    type="text"
                    value={formData.cnh}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de veículo</label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="moto">Moto</option>
                    <option value="bike">Bicicleta</option>
                    <option value="carro">Carro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Placa</label>
                  <input
                    name="plate"
                    type="text"
                    value={formData.plate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
            </fieldset>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <span>⚠</span>
              <span>{errors.submit}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Criando conta...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Cadastrar</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-400">
            Já tem conta?{" "}
            <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

