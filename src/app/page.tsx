"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: "🛵",
      title: "Gestão Completa de Motoboys",
      description: "Cadastre e gerencie sua frota de entregadores com controle total sobre disponibilidade, localização e desempenho.",
      details: [
        "Cadastro completo com CNH e documentação",
        "Controle de disponibilidade em tempo real",
        "Métricas de desempenho e avaliações",
        "Histórico de entregas por motoboy",
      ],
    },
    {
      icon: "📦",
      title: "Rastreamento em Tempo Real",
      description: "Acompanhe cada entrega do início ao fim com atualizações instantâneas e código de rastreamento público.",
      details: [
        "Código único para cada entrega",
        "Atualizações de status em tempo real",
        "Histórico completo de eventos",
        "Rastreamento público sem login",
      ],
    },
    {
      icon: "🏢",
      title: "Gestão de Estabelecimentos",
      description: "Controle completo sobre seus estabelecimentos com métricas detalhadas e planos personalizados.",
      details: [
        "Cadastro completo com CNPJ",
        "Métricas de pedidos e entregas",
        "Planos personalizáveis",
        "Controle de ativação",
      ],
    },
    {
      icon: "📊",
      title: "Relatórios e Analytics",
      description: "Tenha visão completa do seu negócio com relatórios detalhados e métricas em tempo real.",
      details: [
        "Dashboard administrativo completo",
        "Métricas de entregas por status",
        "Avaliações e feedback",
        "Estatísticas consolidadas",
      ],
    },
    {
      icon: "🔐",
      title: "Segurança e Controle de Acesso",
      description: "Sistema robusto de autenticação com controle de acesso baseado em papéis (RBAC).",
      details: [
        "Autenticação JWT segura",
        "Controle de acesso por papéis",
        "Validações em todas as rotas",
        "Proteção de dados sensíveis",
      ],
    },
    {
      icon: "⚡",
      title: "API RESTful Completa",
      description: "Integre facilmente com outros sistemas através da nossa API RESTful bem documentada.",
      details: [
        "Endpoints bem documentados",
        "Validação com Zod",
        "Respostas padronizadas",
        "Fácil integração",
      ],
    },
  ];

  const benefits = [
    {
      icon: "⚡",
      title: "Otimização de Rotas",
      description: "Reduza tempo e custos com otimização inteligente de rotas de entrega.",
    },
    {
      icon: "💰",
      title: "Redução de Custos",
      description: "Diminua custos operacionais com gestão eficiente de recursos e motoboys.",
    },
    {
      icon: "📈",
      title: "Aumento de Produtividade",
      description: "Aumente a produtividade da sua equipe com ferramentas de gestão eficientes.",
    },
    {
      icon: "😊",
      title: "Satisfação do Cliente",
      description: "Melhore a experiência do cliente com rastreamento em tempo real e entregas mais rápidas.",
    },
    {
      icon: "🔒",
      title: "Segurança de Dados",
      description: "Mantenha seus dados seguros com criptografia e controle de acesso avançado.",
    },
    {
      icon: "🌐",
      title: "Escalabilidade",
      description: "Plataforma preparada para crescer com seu negócio, suportando milhares de entregas.",
    },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Cadastre-se",
      description: "Crie sua conta como estabelecimento ou motoboy em poucos minutos.",
      icon: "📝",
    },
    {
      step: "02",
      title: "Configure seu Perfil",
      description: "Complete seu cadastro com informações necessárias e comece a usar.",
      icon: "⚙️",
    },
    {
      step: "03",
      title: "Gerencie Entregas",
      description: "Crie pedidos, atribua motoboys e acompanhe tudo em tempo real.",
      icon: "🚀",
    },
    {
      step: "04",
      title: "Analise Resultados",
      description: "Acompanhe métricas, relatórios e otimize suas operações.",
      icon: "📊",
    },
  ];

  const testimonials = [
    {
      name: "João Silva",
      role: "Gerente de Operações",
      company: "Restaurante Bom Sabor",
      content: "A Motorotas transformou nossa operação de entregas. Agora temos controle total e nossos clientes adoram o rastreamento em tempo real!",
      rating: 5,
    },
    {
      name: "Maria Santos",
      role: "Motoboy",
      content: "A plataforma é muito fácil de usar. Consigo ver todas as corridas disponíveis e gerenciar tudo pelo celular. Recomendo!",
      rating: 5,
    },
    {
      name: "Carlos Oliveira",
      role: "Diretor de Logística",
      company: "E-commerce Express",
      content: "Os relatórios são excelentes e nos ajudam a tomar decisões mais assertivas. A integração foi simples e rápida.",
      rating: 5,
    },
  ];

  const faqs = [
    {
      question: "Como funciona o rastreamento de entregas?",
      answer: "Cada pedido recebe um código único de rastreamento. Clientes podem acompanhar o status em tempo real através do código, sem necessidade de login.",
    },
    {
      question: "Posso integrar com meu sistema existente?",
      answer: "Sim! Oferecemos uma API RESTful completa e bem documentada, permitindo integração fácil com qualquer sistema.",
    },
    {
      question: "Quais são os planos disponíveis?",
      answer: "Oferecemos planos básicos, intermediários e premium para estabelecimentos, com diferentes níveis de recursos e suporte.",
    },
    {
      question: "Como funciona a atribuição de motoboys?",
      answer: "Estabelecimentos podem atribuir motoboys manualmente ou o sistema pode sugerir motoboys disponíveis baseado em proximidade e histórico.",
    },
    {
      question: "Os dados são seguros?",
      answer: "Sim! Utilizamos autenticação JWT, criptografia de senhas com bcrypt e controle de acesso baseado em papéis (RBAC) para garantir máxima segurança.",
    },
    {
      question: "Preciso de treinamento para usar?",
      answer: "Não! A plataforma foi desenvolvida para ser intuitiva e fácil de usar. Oferecemos documentação completa e suporte quando necessário.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="fixed inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl animate-pulse-slow" />

      {/* Navigation */}
      <nav className="relative z-50 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/Logo.png"
            alt="MOTO ROTAS"
            width={120}
            height={40}
            className="h-10 w-auto"
            priority
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-2 text-slate-300 hover:text-slate-100 font-medium transition-colors"
          >
            Entrar
          </button>
          <button
            onClick={() => router.push("/register")}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            Cadastrar-se
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 lg:py-32">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-300 mb-8 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
            Plataforma Completa de Gestão de Entregas
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
              Gerencie suas entregas
            </span>
            <br />
            <span className="text-slate-50">de forma inteligente</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in">
            Conecte estabelecimentos e motoboys em uma plataforma completa. Rastreamento em tempo real,
            gestão de pedidos, métricas detalhadas e muito mais em um só lugar.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in">
            <button
              onClick={() => router.push("/register")}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 text-lg transform hover:-translate-y-1"
            >
            Cadastrar-se
            </button>
            <button
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 border border-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-all text-lg"
            >
              Fazer Login
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto animate-fade-in">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold text-orange-500 mb-1">100%</div>
              <div className="text-sm text-slate-400">Rastreável</div>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold text-orange-500 mb-1">24/7</div>
              <div className="text-sm text-slate-400">Disponível</div>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold text-orange-500 mb-1">API</div>
              <div className="text-sm text-slate-400">Integrável</div>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold text-orange-500 mb-1">RBAC</div>
              <div className="text-sm text-slate-400">Seguro</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-20 lg:py-28 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              Recursos que <span className="text-orange-500">impulsionam</span> seu negócio
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar entregas de forma eficiente e profissional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-slate-50 mb-2 group-hover:text-orange-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="text-sm text-slate-500 flex items-center gap-2">
                      <span className="text-orange-500">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20 lg:py-28 bg-slate-900/30 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              Como <span className="text-orange-500">funciona</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Em 4 passos simples, você está pronto para gerenciar suas entregas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {howItWorks.map((step, index) => (
              <div
                key={index}
                className="relative p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all text-center"
              >
                <div className="text-5xl mb-4">{step.icon}</div>
                <div className="text-4xl font-bold text-orange-500/20 mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold text-slate-50 mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm">{step.description}</p>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 text-orange-500 text-2xl">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 lg:py-28 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              Benefícios para seu <span className="text-orange-500">negócio</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Transforme sua operação de entregas e veja resultados imediatos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="text-4xl mb-4">{benefit.icon}</div>
                <h3 className="text-lg font-semibold text-slate-50 mb-2">{benefit.title}</h3>
                <p className="text-slate-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 py-20 lg:py-28 bg-slate-900/30 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              O que nossos <span className="text-orange-500">clientes</span> dizem
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Veja como a Motorotas está transformando negócios
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-orange-500 text-lg">
                      ⭐
                    </span>
                  ))}
                </div>
                <p className="text-slate-300 mb-4 italic">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="pt-4 border-t border-slate-800">
                  <div className="font-semibold text-slate-50">{testimonial.name}</div>
                  <div className="text-sm text-slate-400">
                    {testimonial.role}
                    {testimonial.company && ` • ${testimonial.company}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative z-10 py-20 lg:py-28 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              Perguntas <span className="text-orange-500">Frequentes</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Tire suas dúvidas sobre a plataforma
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group p-6 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500/50 transition-all cursor-pointer"
              >
                <summary className="font-semibold text-slate-50 cursor-pointer flex items-center justify-between">
                  <span>{faq.question}</span>
                  <span className="text-orange-500 group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <p className="mt-4 text-slate-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 lg:py-28 border-t border-slate-800">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-2xl p-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-50 mb-4">
              Pronto para <span className="text-orange-500">transformar</span> suas entregas?
            </h2>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de estabelecimentos e motoboys que já confiam na Motorotas para
              gerenciar suas entregas de forma eficiente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/register")}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 text-lg transform hover:-translate-y-1"
              >
                Cadastrar-se
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 border border-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-all text-lg"
              >
                Fazer Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/Logo.png"
                alt="MOTO ROTAS"
                width={100}
                height={33}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-slate-400">
              Plataforma completa para gestão de entregas, conectando estabelecimentos e motoboys.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-50 mb-4">Produto</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Recursos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Preços
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  API
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-50 mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Sobre
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-50 mb-4">Suporte</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="/docs" className="hover:text-orange-400 transition-colors">
                  Documentação
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-orange-400 transition-colors">
                  Suporte
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} Motorotas. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-orange-400 transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-orange-400 transition-colors">
              Termos
            </a>
            <a href="#" className="hover:text-orange-400 transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
