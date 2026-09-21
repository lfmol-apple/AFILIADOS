import Link from "next/link";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import { HeroCarousel } from "@/components/hero-carousel";
import { RadarSummary } from "@/components/radar-summary";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";

// Home, explanatory version (2026-09): the home's job is to say what
// PreçoCaindo is, how it works and where to go — it deliberately shows NO
// product cards (the owner's call). Products live at /ofertas, /achados and
// /produto/*. The only live data here is the radar's category counts
// ("3 preços caíram recentemente"), never a per-product list.

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Busque ou navegue",
    body: "Digite o que você quer comprar ou escolha uma categoria. Reunimos ofertas do Mercado Livre, Shopee e Amazon num só lugar.",
  },
  {
    title: "Veja o que merece atenção",
    body: "Ordenamos pelo que tem demanda e uma oferta de qualidade de verdade, não pelo que paga mais comissão.",
  },
  {
    title: "Compre na loja",
    body: "Levamos você direto à página do produto na loja parceira. O pagamento e a entrega são feitos por ela.",
  },
];

const SECTIONS = [
  {
    href: "/ofertas",
    title: "Ofertas",
    body: "As melhores oportunidades do momento, de várias lojas, com filtro por categoria e rolagem sem fim.",
    cta: "Ver ofertas",
  },
  {
    href: "/achados",
    title: "Achados na Amazon",
    body: "Uma seleção comentada: para quem cada produto faz sentido, quando não vale e o que conferir antes de comprar.",
    cta: "Ver achados",
  },
  {
    href: "/guias",
    title: "Guias",
    body: "Como saber se uma promoção é boa, entender histórico de preço e evitar compra por impulso.",
    cta: "Ler os guias",
  },
];

const CATEGORY_TILES = [
  { slug: "pet", label: "Pet", hint: "Ração, antipulgas, camas e acessórios" },
  {
    slug: "celulares",
    label: "Celulares e Acessórios",
    hint: "Celulares, carregadores e power banks",
  },
  {
    slug: "casa",
    label: "Casa e Decoração",
    hint: "Cama, tapetes, cortinas e utilidades",
  },
  {
    slug: "eletrodomesticos",
    label: "Eletrodomésticos",
    hint: "Ventiladores, aspiradores, fritadeiras",
  },
  {
    slug: "beleza",
    label: "Beleza e Cuidados",
    hint: "Pele, cabelo e higiene pessoal",
  },
  { slug: "bebe", label: "Bebê", hint: "Fraldas, mamadeiras e itens de bebê" },
  {
    slug: "esporte-suplementos",
    label: "Esporte e Suplementos",
    hint: "Suplementos, treino e fitness",
  },
  {
    slug: "audio-games",
    label: "Áudio, TV e Games",
    hint: "Fones, controles, TV e games",
  },
  {
    slug: "informatica",
    label: "Informática e Impressão 3D",
    hint: "Mouses, cabos, filamentos e mais",
  },
  {
    slug: "limpeza",
    label: "Limpeza e Papel",
    hint: "Sabão, papel higiênico e limpeza",
  },
  {
    slug: "ferramentas",
    label: "Ferramentas e Jardim",
    hint: "Furadeiras, lâmpadas e jardim",
  },
  { slug: "moda", label: "Moda e Acessórios", hint: "Tênis, bolsas e roupas" },
  {
    slug: "automotivo",
    label: "Automotivo e Moto",
    hint: "Capacetes, baterias e acessórios",
  },
  {
    slug: "alimentos",
    label: "Alimentos e Bebidas",
    hint: "Snacks, farinhas, cafés e mais",
  },
  {
    slug: "musica",
    label: "Instrumentos Musicais",
    hint: "Violões, teclados e acessórios",
  },
  {
    slug: "brinquedos-festas",
    label: "Brinquedos e Festas",
    hint: "Brinquedos, fantasias e decoração",
  },
];

const TRUST = [
  {
    title: "Ranking sem viés de comissão",
    body: "A ordem das ofertas usa sinais de demanda e qualidade da oferta. A comissão que uma loja paga nunca entra nessa conta.",
  },
  {
    title: "Nada de número inventado",
    body: "Só mostramos preço, desconto e avaliação quando a loja informa. Sem o dado, não mostramos — em vez de chutar.",
  },
  {
    title: "Você decide, a loja entrega",
    body: "O PreçoCaindo não vende nem entrega nada. Ajudamos você a escolher melhor; a compra é sempre na loja parceira.",
  },
];

export default async function Home() {
  const radarItems = await getPublicRadarFeed(20).catch((error) => {
    console.error("home.radar_unavailable", error);
    return [];
  });

  return (
    <div>
      <AnalyticsBeacon pageType="home" pageSlug="/" />

      {/* ---------------- 1. CARROSSEL + BUSCA ---------------- */}
      <HeroCarousel />

      <section
        className="relative z-10 mx-auto -mt-7 max-w-3xl px-4 sm:px-6"
        aria-label="Buscar"
      >
        <div className="bg-background border-border-subtle rounded-2xl border p-4 shadow-xl sm:p-5">
          <form action="/ofertas" method="GET" role="search">
            <label htmlFor="hero-search" className="sr-only">
              O que você está pensando em comprar?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="hero-search"
                type="search"
                name="q"
                placeholder="Produto, marca ou modelo"
                className="border-border-subtle bg-surface-muted focus:border-brand min-h-14 w-full rounded-full border px-6 py-3 text-base outline-none"
              />
              <button
                type="submit"
                className="bg-brand text-brand-foreground min-h-14 rounded-full px-8 py-3 text-base font-semibold hover:opacity-90"
              >
                Buscar
              </button>
            </div>
          </form>
          <p className="text-foreground/60 mt-3 text-center text-sm">
            Prefere navegar?{" "}
            <Link
              href="/ofertas"
              className="text-brand font-semibold underline underline-offset-2"
            >
              Veja todas as ofertas
            </Link>{" "}
            ou escolha uma categoria abaixo.
          </p>
        </div>
      </section>

      {/* ---------------- 4. CATEGORIAS ---------------- */}
      <section
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        aria-labelledby="categorias"
      >
        <h2 id="categorias" className="text-2xl font-semibold tracking-tight">
          Explore por categoria
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {CATEGORY_TILES.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/ofertas?categoria=${c.slug}`}
                className="border-border-subtle hover:border-brand block h-full min-h-16 rounded-xl border px-3 py-3 transition sm:px-4"
              >
                <span className="block text-sm font-semibold">{c.label}</span>
                <span className="text-foreground/60 mt-0.5 block text-xs leading-snug">
                  {c.hint}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- 2. COMO FUNCIONA ---------------- */}
      <section
        className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
        aria-labelledby="como-funciona"
      >
        <h2
          id="como-funciona"
          className="text-2xl font-semibold tracking-tight"
        >
          Como funciona
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-border-subtle rounded-xl border p-5"
            >
              <span
                aria-hidden
                className="bg-brand text-brand-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="text-foreground/70 mt-1.5 text-sm leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- 3. O QUE TEM AQUI ---------------- */}
      <section
        className="border-border-subtle bg-surface-muted border-y"
        aria-labelledby="o-que-tem"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 id="o-que-tem" className="text-2xl font-semibold tracking-tight">
            O que você encontra aqui
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="bg-background border-border-subtle hover:border-brand group flex flex-col rounded-xl border p-5 transition"
              >
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="text-foreground/70 mt-1.5 flex-1 text-sm leading-relaxed">
                  {s.body}
                </p>
                <span className="text-brand mt-4 text-sm font-semibold group-hover:underline">
                  {s.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 5. POR QUE CONFIAR ---------------- */}
      <section
        className="border-border-subtle bg-surface-muted border-y"
        aria-labelledby="confianca"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 id="confianca" className="text-2xl font-semibold tracking-tight">
            Por que confiar
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {TRUST.map((t) => (
              <div
                key={t.title}
                className="bg-background border-border-subtle rounded-xl border p-5"
              >
                <h3 className="text-base font-semibold">{t.title}</h3>
                <p className="text-foreground/70 mt-1.5 text-sm leading-relaxed">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
          <p className="text-foreground/60 mt-6 text-sm">
            Quer entender os detalhes? Veja a{" "}
            <Link
              href="/metodologia"
              className="text-brand underline underline-offset-2"
            >
              metodologia
            </Link>{" "}
            e a página de{" "}
            <Link
              href="/transparencia"
              className="text-brand underline underline-offset-2"
            >
              transparência
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ---------------- 6. ACONTECENDO AGORA (só contagens) ---------------- */}
      <RadarSummary items={radarItems} />

      {/* ---------------- 7. CHAMADA FINAL ---------------- */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Pronto para ver o que está valendo?
        </h2>
        <p className="text-foreground/70 mt-2 text-sm">
          As ofertas são atualizadas automaticamente, várias vezes ao dia.
        </p>
        <Link
          href="/ofertas"
          className="bg-brand text-brand-foreground mt-6 inline-flex min-h-14 items-center rounded-full px-8 text-base font-semibold hover:opacity-90"
        >
          Ver as ofertas de agora
        </Link>
      </section>
    </div>
  );
}
