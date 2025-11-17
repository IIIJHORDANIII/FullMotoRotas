"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

type Role = "ADMIN" | "ESTABLISHMENT" | "MOTOBOY";

type RoleProtectedRouteProps = {
  children: ReactNode;
  allowedRoles: Role[];
  redirectTo?: string;
};

export function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = "/dashboard"
}: RoleProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user && !allowedRoles.includes(user.role)) {
      // Redirecionar para a página apropriada baseado no role
      if (user.role === "MOTOBOY") {
        router.push("/motoboy/dashboard");
      } else if (user.role === "ESTABLISHMENT" || user.role === "ADMIN") {
        router.push("/dashboard");
      } else {
        router.push(redirectTo);
      }
    }
  }, [isAuthenticated, user, allowedRoles, router, redirectTo]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  if (user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-4">🚫</div>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

