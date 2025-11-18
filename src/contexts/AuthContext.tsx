"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

type User = {
  id: string;
  email: string;
  role: "ADMIN" | "ESTABLISHMENT" | "MOTOBOY";
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
};

type RegisterData = {
  email: string;
  password: string;
  role: "ESTABLISHMENT" | "MOTOBOY";
  profile: Record<string, unknown>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("motorotas_token");
    localStorage.removeItem("motorotas_user");
    localStorage.removeItem("motorotas_login_time");
  }, []);

  // Verificar se o token expirou (12 horas)
  useEffect(() => {
    const checkTokenExpiration = () => {
      const storedToken = localStorage.getItem("motorotas_token");
      const loginTime = localStorage.getItem("motorotas_login_time");
      
      if (!storedToken || !loginTime) {
        return;
      }

      const loginTimestamp = parseInt(loginTime, 10);
      const now = Date.now();
      const twelveHours = 12 * 60 * 60 * 1000; // 12 horas em milissegundos

      if (now - loginTimestamp > twelveHours) {
        console.log("[Auth] Token expirado após 12 horas. Fazendo logout automático...");
        logout();
        // Redirecionar para login se estiver em uma página protegida
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    };

    // Verificar imediatamente
    checkTokenExpiration();

    // Verificar a cada minuto
    const interval = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(interval);
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem("motorotas_token");
    const storedUser = localStorage.getItem("motorotas_user");
    const loginTime = localStorage.getItem("motorotas_login_time");
    
    if (storedToken && storedUser) {
      // Verificar se o token ainda é válido (não expirou)
      if (loginTime) {
        const loginTimestamp = parseInt(loginTime, 10);
        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;

        if (now - loginTimestamp > twelveHours) {
          // Token expirado, limpar dados
          logout();
          return;
        }
      }

      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Falha ao fazer login");
    }

    const result = await res.json();
    const userData = result.data.user;
    const tokenData = result.data.token;

    setToken(tokenData);
    setUser(userData);
    localStorage.setItem("motorotas_token", tokenData);
    localStorage.setItem("motorotas_user", JSON.stringify(userData));
    // Salvar timestamp do login para verificar expiração após 12 horas
    localStorage.setItem("motorotas_login_time", Date.now().toString());
  };

  const register = async (data: RegisterData) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error?.message || "Falha ao criar conta");
    }

    const result = await res.json();
    const userData = result.data;
    const tokenData = result.data.token;

    setToken(tokenData);
    setUser({ id: userData.id, email: userData.email, role: userData.role });
    localStorage.setItem("motorotas_token", tokenData);
    localStorage.setItem("motorotas_user", JSON.stringify({ id: userData.id, email: userData.email, role: userData.role }));
    // Salvar timestamp do registro/login para verificar expiração após 12 horas
    localStorage.setItem("motorotas_login_time", Date.now().toString());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        register,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

