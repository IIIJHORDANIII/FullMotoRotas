"use client";

import Link from "next/link";
import Image from "next/image";

type Section = {
  title: string;
  description?: string;
  items?: string[];
  icon?: string;
};

type Endpoint = {
  method: string;
  path: string;
  description: string;
  roles: string;
};

const sections: Section[] = [
  {
    title: "Arquitetura",
    description:
      "Camada backend baseada em Next.js 15 (App Router) com Prisma ORM e autenticação JWT. Utiliza TypeScript integral e validações com Zod para garantir contratos consistentes.",
    items: [
      "Prisma + Postgres (Neon) por padrão",
      "Bootstrap automático de usuário administrador baseado em variáveis de ambiente",
      "Utilitários centralizados em '@/lib' (auth, erros, RBAC, cliente Prisma)",
      "Estrutura REST modular em 'src/app/api', separada por domínio",
    ],
    icon: "🏗️",
  },
  {
    title: "Variáveis de Ambiente",
    description:
      "Defina o arquivo .env a partir de config/env.example antes de executar o projeto.",
    items: [
      "DATABASE_URL – string do Prisma Data Proxy (Prisma Accelerate)",
      "JWT_SECRET – segredo de assinatura JWT (mínimo 16 caracteres)",
      "DEFAULT_ADMIN_EMAIL / DEFAULT_ADMIN_PASSWORD – credenciais iniciais do administrador",
    ],
    icon: "⚙️",
  },
  {
    title: "Fluxo de Autenticação",
    description:
      "O login retorna um token JWT que deve ser enviado no header Authorization com o formato Bearer. Utilizamos RBAC para filtrar acesso por papéis.",
    items: [
      "POST /api/auth/register – cadastro de usuário (motoboy ou estabelecimento)",
      "POST /api/auth/login – autenticação e emissão de token",
      "GET /api/auth/me – informações do usuário autenticado",
      "Papéis disponíveis: ADMIN, ESTABLISHMENT, MOTOBOY",
    ],
    icon: "🔐",
  },
  {
    title: "Módulos Principais",
    description:
      "Cada módulo possui validações dedicadas (Zod) e regras de negócio aplicadas em handlers Next.js.",
    items: [
      "Estabelecimentos – cadastro completo, métricas, planos, ativação",
      "Motoboys – documentação, disponibilidade em tempo real, métricas de desempenho",
      "Pedidos – criação, atualização de status, eventos e rastreamento público",
      "Avaliações – feedback bidirecional entre empresas e motoboys",
      "Relatórios – visão consolidada para administradores",
    ],
    icon: "📦",
  },
];

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Autenticação e emissão de token JWT",
    roles: "Público",
  },
  {
    method: "POST",
    path: "/api/auth/register",
    description: "Cadastro de novo usuário (estabelecimento ou motoboy)",
    roles: "Público",
  },
  {
    method: "GET",
    path: "/api/auth/me",
    description: "Informações do usuário autenticado",
    roles: "Autenticado",
  },
  {
    method: "GET",
    path: "/api/establishments",
    description: "Lista estabelecimentos com métricas agregadas",
    roles: "Admin / Dono",
  },
  {
    method: "POST",
    path: "/api/establishments",
    description: "Cria novo estabelecimento",
    roles: "Admin",
  },
  {
    method: "GET",
    path: "/api/motoboys",
    description: "Lista motoboys com métricas de desempenho",
    roles: "Admin / Estab.",
  },
  {
    method: "POST",
    path: "/api/motoboys",
    description: "Cadastra novo motoboy com validações",
    roles: "Admin",
  },
  {
    method: "GET",
    path: "/api/orders",
    description: "Lista pedidos filtrados por papel do usuário",
    roles: "Admin / Estab. / Motoboy",
  },
  {
    method: "POST",
    path: "/api/orders",
    description: "Cria novo pedido de entrega",
    roles: "Admin / Estab.",
  },
  {
    method: "POST",
    path: "/api/orders/:id/assign",
    description: "Atribui motoboy ao pedido e registra evento",
    roles: "Admin / Estab.",
  },
  {
    method: "PATCH",
    path: "/api/orders/:id/assign",
    description: "Motoboy aceita, rejeita ou completa entrega",
    roles: "Motoboy",
  },
  {
    method: "GET",
    path: "/api/tracking/:code",
    description: "Rastreamento público de entrega por código",
    roles: "Público",
  },
  {
    method: "GET",
    path: "/api/reports/summary",
    description: "Resumo executivo para painel administrativo",
    roles: "Admin",
  },
];

const setupSteps = [
  { command: "npm install", description: "Instala dependências do projeto" },
  { command: "cp config/env.example .env", description: "Configura variáveis de ambiente" },
  {
    command: "npx prisma migrate dev",
    description: "Aplica migrações (exige DIRECT_DATABASE_URL com acesso Postgres direto)",
  },
  { command: "npm run dev", description: "Inicia servidor de desenvolvimento" },
];

const features = [
  {
    title: "Segurança",
    description: "Autenticação JWT com RBAC completo, validações Zod e proteção de rotas sensíveis",
    icon: "🛡️",
  },
  {
    title: "Observabilidade",
    description: "Eventos de entrega, métricas em tempo real e relatórios consolidados para administradores",
    icon: "📊",
  },
  {
    title: "Escalabilidade",
    description: "Arquitetura modular, Prisma ORM compatível com múltiplos bancos e estrutura preparada para crescimento",
    icon: "🚀",
  },
];

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    POST: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    PATCH: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    PUT: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    DELETE: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold font-mono ${
        colors[method] || "bg-slate-500/20 text-slate-300 border-slate-500/30"
      }`}
    >
      {method}
    </span>
  );
};

const RoleBadge = ({ roles }: { roles: string }) => {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-800/50 border border-slate-700/50 px-2.5 py-0.5 text-xs font-medium text-slate-300">
      {roles}
    </span>
  );
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/Logo.png"
              alt="MOTO ROTAS"
              width={100}
              height={33}
              className="h-8 w-auto"
            />
            <span className="text-slate-500 ml-4">/ Documentação</span>
          </div>
          <Link
            href="/"
            className="text-slate-300 hover:text-slate-100 transition-colors"
          >
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
              Motorotas Backend API
            </div>
            
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-slate-50 sm:text-6xl lg:text-7xl">
              Documentação da
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                {" "}API
              </span>
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Referência completa da API RESTful para gerenciar estabelecimentos, motoboys, pedidos e avaliações com segurança empresarial.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-2 rounded-lg border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm px-4 py-2.5"
                >
                  <span className="text-lg">{feature.icon}</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-orange-300">{feature.title}</div>
                    <div className="text-xs text-slate-400">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="relative border-y border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-50">Início Rápido</h2>
              <p className="mt-2 text-slate-400">Configure o ambiente em minutos</p>
            </div>
            
            <div className="rounded-2xl border border-slate-800/50 bg-slate-900/50 p-8 shadow-2xl">
              <div className="space-y-4">
                {setupSteps.map((step, index) => (
                  <div
                    key={step.command}
                    className="group flex items-start gap-4 rounded-lg border border-slate-800/50 bg-slate-950/50 p-4 transition-all hover:border-orange-500/30 hover:bg-slate-900/50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 text-sm font-bold text-white shadow-lg shadow-orange-500/25">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <code className="block font-mono text-sm font-semibold text-orange-300">
                        {step.command}
                      </code>
                      <p className="mt-1 text-xs text-slate-400">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-50">Documentação</h2>
          <p className="mt-2 text-slate-400">Explore os recursos e funcionalidades da API</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-8 shadow-xl transition-all hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/10"
            >
              <div className="absolute right-4 top-4 text-4xl opacity-20 transition-opacity group-hover:opacity-30">
                {section.icon}
              </div>
              
              <h3 className="mb-3 text-xl font-bold text-slate-50">{section.title}</h3>
              
              {section.description && (
                <p className="mb-6 text-sm leading-relaxed text-slate-300">
                  {section.description}
                </p>
              )}
              
              {section.items && (
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-orange-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* API Endpoints Table */}
      <div className="relative border-y border-slate-800/50 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-slate-50">Referência da API</h2>
            <p className="mt-2 text-slate-400">
              Endpoints principais e suas permissões de acesso
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-900/50 shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800/50">
                <thead className="bg-slate-950/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Método
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Endpoint
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Descrição
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Permissões
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 bg-slate-900/30">
                  {endpoints.map((endpoint) => (
                    <tr
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="transition-colors hover:bg-slate-800/30"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <MethodBadge method={endpoint.method} />
                      </td>
                      <td className="px-6 py-4">
                        <code className="font-mono text-sm font-semibold text-slate-100">
                          {endpoint.path}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {endpoint.description}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <RoleBadge roles={endpoint.roles} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 p-6 shadow-lg transition-all hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/10"
            >
              <div className="mb-4 text-3xl">{feature.icon}</div>
              <h3 className="mb-2 text-lg font-semibold text-slate-50">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-slate-800/50 bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Motorotas. Documentação da API Backend.
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-slate-200 transition-colors">
                Voltar para início
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

