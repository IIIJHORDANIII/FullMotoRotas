"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  // Verificar token ao montar o componente
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem("motorotas_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      // Tentar validar o token fazendo uma requisição simples
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          const errorMessage = error.error?.message || "";
          
          // Se for erro de token inválido/expirado, redirecionar
          if (
            res.status === 401 ||
            errorMessage.toLowerCase().includes("token inválido") ||
            errorMessage.toLowerCase().includes("token expirado") ||
            errorMessage.toLowerCase().includes("unauthorized")
          ) {
            localStorage.removeItem("motorotas_token");
            localStorage.removeItem("motorotas_user");
            localStorage.removeItem("motorotas_login_time");
            router.replace("/login");
          }
        }
      } catch (error) {
        // Em caso de erro na verificação, manter o usuário logado
        // (pode ser problema de conexão, não necessariamente token inválido)
        console.error("[ProtectedRoute] Erro ao verificar token:", error);
      }
    };

    if (isAuthenticated && user) {
      checkToken();
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  return <>{children}</>;
}

