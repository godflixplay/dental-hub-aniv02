import {
  Sparkles,
  Check,
  ShieldCheck,
  Clock,
  Calendar,
  User,
  Image as ImageIcon,
  Zap,
  CheckCircle2,
  Heart,
  TrendingUp,
  Users,
  DollarSign,
  Upload,
  ToggleRight,
  Send,
  Bell,
  ChevronRight,
  HelpCircle,
  Gift,
  Trophy,
  BarChart3,
  Star,
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
import heroFullBleed from "@/assets/hero-fullbleed.jpg";
import pacienteSorrindo from "@/assets/paciente-sorrindo.png";
import dentistaCelular from "@/assets/dentista-celular.png";
import celularWhatsapp from "@/assets/celular-whatsapp.png";
import avatarMaria from "@/assets/avatar-maria.png";
import avatarJulia from "@/assets/avatar-julia.png";
import avatarCarlos from "@/assets/avatar-carlos.png";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <Features />
        <Benefits />
        <HowItWorks />
        <WhyMatters />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function smoothScrollTo(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------- Header ---------------- */
function Header() {
  const navItems = [
    { label: "Serviço de Aniversário", id: "hero" },
    { label: "Como funciona", id: "como-funciona" },
    { label: "Benefícios", id: "beneficios" },
    { label: "Planos", id: "planos" },
    { label: "Depoimentos", id: "depoimentos" },
    { label: "FAQ", id: "faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {navItems.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => smoothScrollTo(item.id)}
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                i === 0 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
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
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      {/* Background image — full bleed */}
      <img
        src={heroFullBleed}
        alt="Dentista sorrindo ao lado de smartphone exibindo mensagem de aniversário no WhatsApp"
        width={1920}
        height={1080}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-right"
      />

      {/* Readability gradient overlays */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent md:via-background/70 lg:to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge
            variant="secondary"
            className="mb-6 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur"
          >
            Serviço de envio de aniversário
          </Badge>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Envie mensagens de aniversário{" "}
            <span className="text-primary">automaticamente</span> e fortaleça o
            vínculo com seus pacientes
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Surpreenda seus pacientes, aumente o retorno para sua clínica e gere
            mais faturamento — sem esforço manual.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20"
              asChild
            >
              <Link to="/signup">
                Começar agora
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group h-12 rounded-full bg-background/70 px-7 text-base backdrop-blur"
              onClick={() => smoothScrollTo("como-funciona")}
            >
              Ver como funciona
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
            <HeroFeature icon={Send} label="Enviado via WhatsApp" />
            <HeroFeature icon={Clock} label="100% Automático" />
            <HeroFeature icon={ShieldCheck} label="Seguro e confiável" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroFeature({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 backdrop-blur">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <span className="text-sm font-medium text-foreground/80">{label}</span>
    </div>
  );
}

/* ---------------- Features ---------------- */
function Features() {
  const features = [
    {
      icon: Calendar,
      title: "Envio automático",
      description:
        "Mensagens enviadas automaticamente no dia do aniversário do paciente.",
    },
    {
      icon: User,
      title: "Personalização",
      description:
        "Use o nome do paciente e da clínica para tornar a mensagem única.",
    },
    {
      icon: ImageIcon,
      title: "Imagens prontas",
      description:
        "Modelos de artes profissionais ou crie as suas personalizadas.",
    },
    {
      icon: Zap,
      title: "Configuração rápida",
      description:
        "Em poucos minutos você ativa o envio automático e pronto!",
    },
    {
      icon: CheckCircle2,
      title: "Funciona no automático",
      description:
        "Nosso sistema trabalha por você 24h por dia, sem esforço manual.",
    },
  ];

  return (
    <section className="bg-background py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Automação que trabalha por você
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tudo que você precisa para se conectar com seus pacientes
          </p>
        </div>

        <div className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-16">
          {/* Celular incorporado */}
          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
            <div
              className="absolute inset-0 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/25 via-primary/10 to-transparent blur-3xl"
              aria-hidden="true"
            />
            <img
              src={celularWhatsapp}
              alt="Celular exibindo conversa de aniversário no WhatsApp entre clínica e paciente"
              loading="lazy"
              width={848}
              height={1264}
              className="relative mx-auto block w-full max-w-[420px] drop-shadow-2xl lg:max-w-[520px]"
            />
            {/* Floating badges */}
            <div className="absolute -left-3 top-16 hidden items-center gap-2 rounded-full bg-background px-3.5 py-2 shadow-xl ring-1 ring-border sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Send className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold">Mensagem enviada</span>
            </div>
            <div className="absolute -right-3 bottom-24 hidden items-center gap-2 rounded-full bg-background px-3.5 py-2 shadow-xl ring-1 ring-border sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Heart className="h-3.5 w-3.5 fill-current" />
              </div>
              <span className="text-xs font-semibold">Paciente feliz</span>
            </div>
          </div>

          {/* Features grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <Card
                key={f.title}
                className="gap-0 border-border/60 p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Benefits (2 cards) ---------------- */
function Benefits() {
  return (
    <section id="beneficios" className="py-14">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        {/* Card verde */}
        <Card className="relative gap-0 overflow-hidden border-emerald-200/60 bg-emerald-50/60 p-8 dark:bg-emerald-950/20">
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_140px]">
            <div>
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                Seu paciente se sente lembrado
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pequenos gestos geram grandes conexões
              </p>

              <ul className="mt-5 space-y-3">
                {[
                  "Aumenta a percepção de cuidado e atenção",
                  "Fortalece o vínculo com a clínica",
                  "Gera lembrança espontânea da sua marca",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <img
                src={pacienteSorrindo}
                alt="Paciente sorrindo ao receber mensagem"
                loading="lazy"
                width={1024}
                height={1024}
                className="h-32 w-32 rounded-full object-cover sm:h-36 sm:w-36"
              />
              <div className="absolute -top-2 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                <Heart className="h-4 w-4 fill-current" />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-100/70 p-4 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
            <Users className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <span className="font-semibold">Impacto direto:</span> pacientes
              mais fiéis e com maior probabilidade de retorno.
            </p>
          </div>
        </Card>

        {/* Card azul */}
        <Card className="relative gap-0 overflow-hidden border-primary/30 bg-primary/5 p-8">
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[1fr_140px]">
            <div>
              <h3 className="text-xl font-bold text-primary">
                Mais retorno, mais faturamento
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Relacionamento que gera resultados
              </p>

              <ul className="mt-5 space-y-3">
                {[
                  "Aumenta o retorno de pacientes que estavam inativos",
                  "Gera novas consultas sem investimento em anúncios",
                  "Reduz a ociosidade da agenda e aumenta o faturamento",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-primary/10 sm:h-36 sm:w-36">
              <TrendingUp className="h-16 w-16 text-primary" strokeWidth={2.5} />
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/10 p-4 text-sm text-primary">
            <DollarSign className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Mais relacionamento → Mais retorno → Mais faturamento para sua
              clínica.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  const messages = [
    {
      name: "Maria",
      avatar: avatarMaria,
      text: "Muito obrigada! 😊\nQue carinho!\nVocês são demais!",
      time: "10:32",
    },
    {
      name: "Júlia",
      avatar: avatarJulia,
      text: "Vocês lembraram de mim! 🥰 🙏\nAmei a mensagem!",
      time: "10:35",
    },
    {
      name: "Carlos",
      avatar: avatarCarlos,
      text: "Vou agendar minha avaliação essa semana.\nObrigado! 😊",
      time: "10:37",
    },
  ];

  return (
    <section id="depoimentos" className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            O que acontece na prática
          </h2>
          <p className="mt-3 text-muted-foreground">
            Nossos clientes veem resultados todos os dias
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {messages.map((m) => (
            <div key={m.name} className="flex items-start gap-3">
              <img
                src={m.avatar}
                alt={`Foto de ${m.name}`}
                loading="lazy"
                width={512}
                height={512}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-background shadow-sm"
              />
              <div className="relative w-full rounded-2xl rounded-tl-sm bg-background p-4 shadow-sm">
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {m.text}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <span>{m.time}</span>
                  <Check className="h-3 w-3 text-primary" />
                  <Check className="-ml-2 h-3 w-3 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Mensagens reais recebidas por clínicas que usam o DentalHub.
        </p>
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Importe sua base",
      description:
        "Envie sua lista de pacientes com nome, telefone e data de nascimento.",
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      icon: ToggleRight,
      title: "Ative a automação",
      description:
        "Escolha o modelo de mensagem, personalize como quiser e ative os envios automáticos.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Send,
      title: "Pronto! Sistema envia",
      description:
        "No dia do aniversário, o sistema envia a mensagem automaticamente via WhatsApp.",
      color: "text-purple-600 bg-purple-100",
    },
  ];

  return (
    <section id="como-funciona" className="bg-background py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simples em 3 passos
          </h2>
          <p className="mt-3 text-muted-foreground">
            Ative em minutos e deixe o sistema trabalhar por você
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative flex flex-col rounded-2xl border border-border/60 bg-secondary/30 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="text-base font-bold">{s.title}</h3>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${s.color}`}
                >
                  <s.icon className="h-6 w-6" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>

              {i < steps.length - 1 && (
                <div
                  className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 md:block"
                  aria-hidden="true"
                >
                  <div className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span className="h-1 w-1 rounded-full bg-border" />
                  </div>
                </div>
              )}
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
      a: "Você pode importar uma planilha (Excel ou CSV) com nome, telefone (com DDD) e data de nascimento. Também é possível cadastrar pacientes manualmente.",
    },
    {
      q: "Posso usar meu WhatsApp pessoal ou precisa ser um número novo?",
      a: "Pode ser qualquer número, inclusive o pessoal. A conexão é feita por QR Code, igual ao WhatsApp Web. As mensagens saem do seu próprio número.",
    },
    {
      q: "Posso personalizar o texto e enviar uma imagem junto?",
      a: "Sim. Você escreve a mensagem do seu jeito (com o primeiro nome do paciente, por exemplo) e pode anexar uma imagem ou cartão de aniversário.",
    },
    {
      q: "Em que horário as mensagens são enviadas?",
      a: "Você define o horário do envio. Todos os dias, naquele horário, o sistema envia para quem faz aniversário no dia. Tudo roda na nuvem.",
    },
  ];

  return (
    <section id="faq" className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tudo o que você precisa saber sobre o envio automático de mensagens.
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
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-xl">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.2fr_1fr_0.8fr]">
          {/* Left: title + buttons */}
          <div className="p-8 sm:p-10 lg:p-12">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
              Comece hoje e transforme mensagens em resultados
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base">
              Automatize, surpreenda e veja sua clínica crescer.
            </p>
          </div>

          {/* Middle: buttons */}
          <div className="flex flex-col gap-3 px-8 pb-6 sm:px-10 lg:items-center lg:px-0 lg:pb-0">
            <Button
              size="lg"
              variant="secondary"
              className="group h-12 w-full rounded-full px-7 text-base font-semibold text-primary lg:w-auto"
              asChild
            >
              <Link to="/signup">
                Começar agora
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group h-12 w-full rounded-full border-primary-foreground/30 bg-transparent px-7 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground lg:w-auto"
              asChild
            >
              <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
                <Bell className="mr-1 h-4 w-4" />
                Falar com especialista
              </a>
            </Button>
          </div>

          {/* Right: image + small note */}
          <div className="relative hidden h-full lg:block">
            <img
              src={dentistaCelular}
              alt="Dentista usando o sistema"
              loading="lazy"
              width={1024}
              height={1024}
              className="h-full max-h-72 w-full object-cover"
            />
            <div className="absolute right-6 top-6 flex max-w-[180px] items-start gap-2 rounded-xl bg-primary-foreground/95 p-3 text-xs text-primary shadow-lg">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 fill-current" />
              <p className="leading-snug">
                Comece pequeno, mas gere grandes resultados desde o primeiro
                dia!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Why this service matters (4 cards) ---------------- */
function WhyMatters() {
  const reasons = [
    {
      icon: Gift,
      title: "Timing perfeito",
      description: "Aniversário é uma data emocional e marcante.",
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      icon: Trophy,
      title: "Baixa concorrência",
      description: "Poucas clínicas fazem isso. Se destaque e conquiste!",
      color: "text-amber-600 bg-amber-100",
    },
    {
      icon: Heart,
      title: "Alto impacto emocional",
      description: "Pequenas atitudes geram grandes resultados.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: BarChart3,
      title: "Excelente custo-benefício",
      description: "Alto retorno com baixo investimento.",
      color: "text-purple-600 bg-purple-100",
    },
  ];

  return (
    <section className="bg-background py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Por que esse serviço faz a diferença?
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((r) => (
            <Card
              key={r.title}
              className="gap-0 border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${r.color}`}
              >
                <r.icon className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <h3 className="mt-4 text-base font-bold">{r.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {r.description}
              </p>
            </Card>
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
      nome: "Mensal",
      valor: 37,
      perMes: 37,
      ciclo: "/mês",
      descricao: "Ideal para começar",
      destaque: false,
    },
    {
      slug: "trimestral",
      nome: "Trimestral",
      valor: 99,
      perMes: 33,
      ciclo: "/trimestre",
      descricao: "Renovação a cada 3 meses",
      destaque: false,
    },
    {
      slug: "semestral",
      nome: "Semestral",
      valor: 187,
      perMes: 32,
      ciclo: "/semestre",
      descricao: "Renovação a cada 6 meses",
      destaque: false,
    },
    {
      slug: "anual",
      nome: "Anual",
      valor: 357,
      perMes: 29,
      ciclo: "/ano",
      descricao: "Melhor custo-benefício",
      destaque: true,
    },
  ];

  return (
    <section id="planos" className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Escolha o plano ideal para sua clínica
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pague no PIX ou parcele no cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <Card
              key={p.slug}
              className={`relative gap-0 p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${
                p.destaque
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-border/60"
              }`}
            >
              {p.destaque && (
                <div className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md whitespace-nowrap">
                  <Star className="h-3 w-3 fill-current" />
                  Melhor escolha
                </div>
              )}
              <h3 className="text-lg font-bold">{p.nome}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.descricao}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-3xl font-bold">R$ {p.valor}</span>
                <span className="text-sm text-muted-foreground">{p.ciclo}</span>
              </div>
              {p.perMes < p.valor && (
                <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Equivale a R$ {p.perMes}/mês
                </p>
              )}

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Envio automático no aniversário</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Mensagens personalizadas + imagem</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Pacientes ilimitados</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Suporte por WhatsApp</span>
                </li>
              </ul>

              <Button
                size="lg"
                variant={p.destaque ? "default" : "outline"}
                className="mt-6 w-full rounded-full"
                asChild
              >
                <Link to="/signup">Assinar {p.nome}</Link>
              </Button>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <p>
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            Pagamento seguro processado pela Asaas. PIX com confirmação imediata.
          </p>
          <p>
            No cartão você escolhe parcelar em até{" "}
            <span className="font-semibold">3x</span> (trimestral),{" "}
            <span className="font-semibold">6x</span> (semestral) ou{" "}
            <span className="font-semibold">12x</span> (anual).
          </p>
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
        <div className="flex w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} DentalHub. Todos os direitos reservados.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
          <a href="/faq" className="hover:text-primary">
            Perguntas frequentes
          </a>
          <a href="/privacidade" className="hover:text-primary">
            Privacidade
          </a>
          <a href="/cookies" className="hover:text-primary">
            Cookies
          </a>
          <a href="/termos" className="hover:text-primary">
            Termos de uso
          </a>
          <a
            href="mailto:contato@dentalhub.com.br"
            className="hover:text-primary"
          >
            Contato
          </a>
        </div>
      </div>
    </footer>
  );
}
