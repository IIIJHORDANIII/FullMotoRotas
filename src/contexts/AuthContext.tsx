"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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

  useEffect(() => {
    const storedToken = localStorage.getItem("motorotas_token");
    const storedUser = localStorage.getItem("motorotas_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

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
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("motorotas_token");
    localStorage.removeItem("motorotas_user");
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

