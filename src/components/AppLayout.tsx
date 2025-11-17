"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: ("ADMIN" | "ESTABLISHMENT" | "MOTOBOY")[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Interface", icon: "🏠", roles: ["ADMIN", "ESTABLISHMENT"] },
  { href: "/orders", label: "Pedidos", icon: "📦", roles: ["ADMIN", "ESTABLISHMENT"] },
  { href: "/motoboys", label: "Motoboys", icon: "🛵", roles: ["ADMIN", "ESTABLISHMENT"] },
  { href: "/reports", label: "Relatório", icon: "📈", roles: ["ADMIN"] },
  { href: "/inbox", label: "Minhas corridas", icon: "📬", roles: ["MOTOBOY"] },
  { href: "/settings", label: "Configuração", icon: "⚙️" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || !user || item.roles.includes(user.role)
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Image
                src="/Logo.png"
                alt="MOTO ROTAS"
                width={100}
                height={33}
                className="h-8 w-auto"
              />
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-slate-100"
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <div className="flex-1 max-w-md mx-4">
            <input
              type="search"
              placeholder="Buscar pedido, cliente, endereço…"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/tracking"
              className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
            >
              Rastrear pedido
            </Link>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-slate-400">Olá,</div>
                <div className="text-sm font-semibold text-slate-200">{user?.email || "Visitante"}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <span className="text-orange-300">
                  {user?.email.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

