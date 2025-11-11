"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "E-mail é obrigatório";
    if (!emailRegex.test(email)) return "E-mail inválido";
    return "";
  };

  const validatePassword = (password: string) => {
    if (!password) return "Senha é obrigatória";
    if (password.length < 1) return "Senha é obrigatória";
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await login(email, password);
      showToast("Login realizado com sucesso!", "success");
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao fazer login";
      showToast(message, "error");
      setErrors({ password: message });
    } finally {
      setLoading(false);
    }
  };

  // Não renderizar se já estiver autenticado (evita flash)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl font-bold text-orange-400">MOTO</span>
            <span className="text-3xl">🚛</span>
            <span className="text-3xl font-bold text-orange-400">ROTAS</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Bem-vindo de volta!</h1>
          <p className="text-slate-400">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              E-mail
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => setErrors((prev) => ({ ...prev, email: validateEmail(email) }))}
                required
                className={`w-full px-4 py-3 pl-11 bg-slate-950 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-800 focus:ring-orange-500 focus:border-transparent"
                }`}
                placeholder="seu@email.com"
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => setErrors((prev) => ({ ...prev, password: validatePassword(password) }))}
                required
                className={`w-full px-4 py-3 pl-11 pr-11 bg-slate-950 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-800 focus:ring-orange-500 focus:border-transparent"
                }`}
                placeholder="••••••••"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span>
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>→</span>
                <span>Entrar</span>
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-400">
            Não tem conta?{" "}
            <Link
              href="/register"
              className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
            >
              Cadastre-se aqui
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
