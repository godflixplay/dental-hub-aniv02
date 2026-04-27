import {
  Sparkles,
  Calendar,
  UserPlus,
  Star,
  Check,
  ShoppingCart,
  Settings,
  Send,
  RotateCw,
  ShieldCheck,
  Clock,
  TrendingUp,
  PartyPopper,
  Users,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroDentist from "@/assets/hero-dentista-whatsapp.png";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <Services />
        <HowItWorks />
        <Pricing />
        <Benefits />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  const navItems = [
    "Início",
    "Serviços",
    "Como funciona",
    "Planos",
    "Benefícios",
    "FAQ",
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button className="rounded-full px-5" asChild>
            <Link to="/signup">Começar agora</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-5 w-5" />
      </div>
      <span className="text-xl font-bold tracking-tight">
        DENTAL<span className="text-primary">HUB</span>
      </span>
    </div>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative w-full overflow-hidden lg:min-h-[80vh]">
      <div className="grid w-full grid-cols-1 items-center gap-10 lg:min-h-[80vh] lg:grid-cols-[45fr_55fr] lg:gap-4">
        {/* Left content */}
        <div className="px-4 pt-12 sm:px-6 lg:px-8 lg:py-16 xl:pl-16">
          <div className="relative z-10 mx-auto max-w-xl lg:ml-auto lg:mr-0">
            <Badge
              variant="secondary"
              className="mb-6 rounded-full bg-secondary/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary"
            >
              Hub de soluções para clínicas odontológicas
            </Badge>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Automatize o relacionamento com seus pacientes e{" "}
              <span className="text-primary">aumente seu faturamento</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Envie mensagens automáticas de aniversário, lembretes e campanhas
              pelo WhatsApp — de forma simples e sem perder tempo com tarefas
              manuais.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="group h-12 rounded-full px-7 text-base" asChild>
                <Link to="/signup">
                  Começar agora
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="group h-12 rounded-full px-7 text-base"
              >
                Ver serviços disponíveis
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <FeatureCheck icon={ShieldCheck} label="Sem instalação" />
              <FeatureCheck icon={Clock} label="Ativação em minutos" />
              <FeatureCheck icon={Sparkles} label="Suporte especializado" />
            </div>
          </div>
        </div>

        {/* Right image — full bleed to right edge */}
        <div className="relative h-[60vh] w-full overflow-hidden sm:h-[70vh] lg:h-[80vh]">
          <img
            src={heroDentist}
            alt="Dentista sorrindo enquanto envia mensagem de aniversário pelo WhatsApp para paciente"
            width={1920}
            height={1088}
            className="h-full w-full scale-110 object-cover"
          />
          {/* Left-to-right gradient overlay for text readability on overlap */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-background via-background/60 to-transparent lg:block"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCheck({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function MiniSparkline() {
  return (
    <svg
      viewBox="0 0 100 30"
      className="mt-1 h-8 w-full text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M0 22 L15 18 L30 20 L45 12 L60 14 L75 8 L90 6 L100 4" />
    </svg>
  );
}

/* ---------------- Social proof ---------------- */
function SocialProof() {
  const clinics = [
    "SorrisoPerfeito",
    "OralTop",
    "Vitalle",
    "NovaOdonto",
    "PrimeSmile",
  ];
  return (
    <section className="border-y border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Clínicas que já confiam no DentalHub
        </p>
        <div className="mt-8 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 md:grid-cols-5">
          {clinics.map((c) => (
            <div
              key={c}
              className="flex items-center justify-center gap-2 text-muted-foreground/70"
            >
              <Sparkles className="h-5 w-5" />
              <span className="text-base font-semibold tracking-tight">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Services ---------------- */
function Services() {
  const services = [
    {
      icon: PartyPopper,
      title: "Mensagens de Aniversário",
      description:
        "Envie mensagens automáticas e personalizadas para seus pacientes no dia do aniversário.",
      bullets: [
        "Relacionamento mais próximo",
        "Mais retorno de pacientes",
        "Totalmente automático",
      ],
      active: true,
    },
    {
      icon: Calendar,
      title: "Lembrete de Consultas",
      description:
        "Reduza faltas enviando lembretes automáticos de consultas via WhatsApp.",
      active: false,
    },
    {
      icon: UserPlus,
      title: "Reativação de Pacientes",
      description:
        "Recupere pacientes que não retornam há algum tempo com campanhas automáticas.",
      active: false,
    },
    {
      icon: Star,
      title: "Pedido de Avaliação Google",
      description:
        "Peça avaliações automaticamente e melhore sua reputação online.",
      active: false,
    },
  ];

  return (
    <section className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Serviços disponíveis
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Soluções que simplificam o dia a dia da sua clínica
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  description,
  bullets,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bullets?: string[];
  active: boolean;
}) {
  return (
    <Card
      className={`relative gap-0 border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
        active ? "ring-2 ring-primary/30" : ""
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          active
            ? "bg-primary/10 text-primary"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-bold leading-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {bullets && (
        <ul className="mt-4 space-y-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-accent" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {active ? (
          <Button className="w-full rounded-full" asChild>
            <Link to="/signup">Ativar serviço</Link>
          </Button>
        ) : (
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs font-medium text-primary"
          >
            Em breve
          </Badge>
        )}
      </div>
    </Card>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    {
      icon: ShoppingCart,
      title: "Escolha o serviço",
      description: "Selecione a solução ideal para sua clínica.",
    },
    {
      icon: Settings,
      title: "Configure em minutos",
      description: "A configuração é simples, intuitiva e guiada.",
    },
    {
      icon: Send,
      title: "Deixe o sistema trabalhar por você",
      description:
        "Automatize processos e tenha mais tempo para o que importa.",
    },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Como funciona
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Ativar é rápido e simples
          </h2>
        </div>

        <div className="relative mt-14 grid gap-10 md:grid-cols-3">
          <div
            className="pointer-events-none absolute left-0 right-0 top-7 hidden md:block"
            aria-hidden="true"
          >
            <svg
              className="mx-auto h-2 w-2/3 text-border"
              preserveAspectRatio="none"
              viewBox="0 0 100 2"
            >
              <line
                x1="0"
                y1="1"
                x2="100"
                y2="1"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeDasharray="2 2"
              />
            </svg>
          </div>

          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <span className="text-lg font-bold">{i + 1}</span>
              </div>
              <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary">
                <s.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */
function Pricing() {
  const plans = [
    {
      slug: "mensal",
      name: "Mensal",
      price: "R$ 47",
      cycle: "/mês",
      description: "Flexibilidade total, cancele quando quiser.",
      bullets: [
        "Mensagens de aniversário ilimitadas",
        "WhatsApp dedicado",
        "Suporte por e-mail",
        "Atualizações constantes",
      ],
      featured: false,
      cta: "Assinar mensal",
    },
    {
      slug: "anual",
      name: "Anual",
      price: "R$ 397",
      cycle: "/ano",
      description: "Economize ~30% pagando uma vez por ano.",
      bullets: [
        "Tudo do plano mensal",
        "Economia de R$ 167/ano",
        "Suporte prioritário",
        "Acesso antecipado a novos serviços",
      ],
      featured: true,
      cta: "Assinar anual",
      badge: "Mais popular",
    },
  ];

  return (
    <section className="bg-background py-20" id="planos">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Planos
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Preço justo, sem surpresas
          </h2>
          <p className="mt-3 text-muted-foreground">
            Comece quando quiser. Sem fidelidade no plano mensal.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <Card
              key={p.slug}
              className={`relative gap-0 p-8 transition-all ${
                p.featured
                  ? "border-primary/40 shadow-xl ring-2 ring-primary/30"
                  : "border-border/60"
              }`}
            >
              {p.badge && (
                <Badge className="absolute -top-3 right-6 rounded-full px-3 py-1">
                  {p.badge}
                </Badge>
              )}
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {p.price}
                </span>
                <span className="text-muted-foreground">{p.cycle}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full rounded-full"
                variant={p.featured ? "default" : "outline"}
                asChild
              >
                <Link to="/signup">{p.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Benefits ---------------- */
function Benefits() {
  const benefits = [
    { icon: RotateCw, label: "Mais pacientes voltando" },
    { icon: ShieldCheck, label: "Mais profissionalismo" },
    { icon: Clock, label: "Menos trabalho manual" },
    { icon: TrendingUp, label: "Mais faturamento" },
  ];

  return (
    <section className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary">
          Benefícios para sua clínica
        </p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.label} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
                <b.icon className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold leading-tight">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const faqs = [
    {
      q: "Como funciona o envio automático de mensagens de aniversário?",
      a: "Você sobe a lista dos seus pacientes (com nome, telefone e data de nascimento) e configura uma vez o texto da mensagem. Todos os dias, no horário que você escolheu, o sistema verifica quem faz aniversário e envia a mensagem pelo seu próprio WhatsApp — automaticamente, sem você precisar lembrar.",
    },
    {
      q: "Preciso instalar algo no computador?",
      a: "Não. O Dental Hub funciona totalmente pela internet, pelo navegador. Não exige instalação e funciona tanto no computador da clínica quanto no celular.",
    },
    {
      q: "Como subo a lista dos meus pacientes?",
      a: "Você pode importar uma planilha (Excel ou CSV) com nome, telefone (com DDD) e data de nascimento. Também é possível cadastrar pacientes manualmente, um a um, ou ir adicionando aos poucos.",
    },
    {
      q: "Posso usar meu WhatsApp pessoal ou precisa ser um número novo?",
      a: "Pode ser qualquer número, inclusive o pessoal. A conexão é feita por QR Code, igual ao WhatsApp Web. As mensagens saem do seu próprio número, então o paciente recebe como se fosse uma mensagem direta da clínica.",
    },
    {
      q: "Posso personalizar o texto e enviar uma imagem junto?",
      a: "Sim. Você escreve a mensagem do seu jeito (com o primeiro nome do paciente, por exemplo) e pode anexar uma imagem ou cartão de aniversário que será enviado junto com o texto.",
    },
    {
      q: "Em que horário as mensagens são enviadas?",
      a: "Você define o horário do envio (por exemplo, 9h da manhã). Todos os dias, naquele horário, o sistema envia para quem faz aniversário no dia. Não precisa deixar o computador ligado — tudo roda na nuvem.",
    },
    {
      q: "Quais são os valores dos planos?",
      a: "Mensal R$ 37,00 (30 dias), Trimestral R$ 99,90 (90 dias), Semestral R$ 188,70 (180 dias) e Anual R$ 355,20 (365 dias). O pagamento é via PIX, com liberação imediata. Quanto mais longo o plano, maior o desconto.",
    },
    {
      q: "Como faço para cancelar se não gostar?",
      a: "O cancelamento pode ser feito a qualquer momento direto na sua área de assinante. O serviço continua ativo até o fim do tempo já pago. Se cancelar nos primeiros 7 dias, devolvemos o valor integral.",
    },
  ];

  return (
    <section id="faq" className="bg-secondary/40 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Perguntas frequentes
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tire suas dúvidas sobre o Dental Hub
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tudo o que você precisa saber sobre o envio automático de mensagens
            de aniversário pelo WhatsApp.
          </p>
        </div>

        <Card className="mt-10 border-border/60 p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`faq-${i}`}
                className="border-b border-border/60 last:border-b-0"
              >
                <AccordionTrigger className="px-3 py-4 text-left text-base font-semibold hover:no-underline sm:px-4">
                  <span className="flex items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-5 pl-11 text-sm leading-relaxed text-muted-foreground sm:px-4 sm:pl-12">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ainda tem dúvidas?{" "}
          <a
            href="/faq"
            className="font-semibold text-primary hover:underline"
          >
            Veja todas as perguntas frequentes
          </a>
          {" "}ou fale com a gente em{" "}
          <a
            href="mailto:contato@dentalhub.com.br"
            className="font-semibold text-primary hover:underline"
          >
            contato@dentalhub.com.br
          </a>
          .
        </p>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-xl sm:px-12 sm:py-14">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              Comece agora com mensagens automáticas de aniversário
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base">
              Fortaleça o relacionamento com seus pacientes e veja a diferença
              nos resultados da sua clínica.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Button
              size="lg"
              variant="secondary"
              className="group h-12 rounded-full px-7 text-base font-semibold text-primary"
              asChild
            >
              <Link to="/signup">
                Testar agora gratuitamente
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <p className="text-xs text-primary-foreground/70">
              Teste grátis por 7 dias. Cancelamento fácil.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 w-full sm:flex-row">
          <Logo />
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} DentalHub. Todos os direitos reservados.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          <a href="/faq" className="hover:text-primary">Perguntas frequentes</a>
          <a href="/privacidade" className="hover:text-primary">Privacidade</a>
          <a href="/cookies" className="hover:text-primary">Cookies</a>
          <a href="/termos" className="hover:text-primary">Termos de uso</a>
          <a href="mailto:contato@dentalhub.com.br" className="hover:text-primary">Contato</a>
        </div>
      </div>
    </footer>
  );
}

