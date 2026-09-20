"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Home hero carousel. Slides are brand banners (headline + one call to
 * action + decorative artwork), never product photos — Amazon images cannot
 * be stored, and the home deliberately shows no products.
 *
 * Built on CSS scroll-snap, so it swipes natively on phones and the first
 * slide is fully usable without JavaScript; JS only adds autoplay, arrows
 * and dots. Autoplay pauses on hover, focus and touch, never runs for people
 * who prefer reduced motion, and has an explicit pause button (WCAG 2.2.2).
 */

interface Slide {
  id: string;
  title: string;
  body: string;
  cta: { href: string; label: string };
  gradient: string;
  art: React.ReactNode;
}

function TagArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-full w-full"
    >
      <circle cx="100" cy="100" r="92" fill="white" fillOpacity="0.08" />
      <circle cx="100" cy="100" r="64" fill="white" fillOpacity="0.1" />
      <path
        d="M104 34h48a12 12 0 0 1 12 12v48a12 12 0 0 1-3.5 8.5l-58 58a12 12 0 0 1-17 0L36 137a12 12 0 0 1 0-17l58-58a12 12 0 0 1 10-4Z"
        fill="white"
        fillOpacity="0.9"
      />
      <circle cx="140" cy="70" r="9" fill="#0f766e" />
      <text
        x="88"
        y="132"
        fontSize="46"
        fontWeight="800"
        fill="#0f766e"
        transform="rotate(-45 88 122)"
      >
        %
      </text>
      <path
        d="M150 128v34m0 0-13-13m13 13 13-13"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MagnifierArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-full w-full"
    >
      <circle cx="100" cy="100" r="92" fill="white" fillOpacity="0.08" />
      <rect
        x="40"
        y="46"
        width="88"
        height="112"
        rx="12"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M58 76h52M58 98h52M58 120h34"
        stroke="#3730a3"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle
        cx="132"
        cy="120"
        r="30"
        fill="#3730a3"
        stroke="white"
        strokeWidth="9"
      />
      <path
        d="m153 141 26 26"
        stroke="white"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="m120 120 8 8 14-16"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookArt() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-full w-full"
    >
      <circle cx="100" cy="100" r="92" fill="white" fillOpacity="0.08" />
      <path
        d="M100 58c-14-12-38-16-62-12v98c24-4 48 0 62 12V58Z"
        fill="white"
        fillOpacity="0.9"
      />
      <path
        d="M100 58c14-12 38-16 62-12v98c-24-4-48 0-62 12V58Z"
        fill="white"
        fillOpacity="0.75"
      />
      <path
        d="M54 72c12-1 26 1 36 6M54 92c12-1 26 1 36 6M54 112c12-1 26 1 36 6"
        stroke="#b45309"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M146 72c-12-1-26 1-36 6M146 92c-12-1-26 1-36 6"
        stroke="#b45309"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="156" cy="46" r="16" fill="#fde68a" />
      <path
        d="M156 38v9m0 6v1"
        stroke="#b45309"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridArt() {
  const tiles = [
    [44, 44],
    [104, 44],
    [44, 104],
    [104, 104],
  ];
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
      className="h-full w-full"
    >
      <circle cx="100" cy="100" r="92" fill="white" fillOpacity="0.08" />
      {tiles.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="52"
          height="52"
          rx="14"
          fill="white"
          fillOpacity={i === 1 ? 0.95 : 0.7}
        />
      ))}
      <circle cx="70" cy="70" r="10" fill="#be123c" />
      <path
        d="M118 78h26M118 90h16"
        stroke="#be123c"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M62 130h28M62 142h18"
        stroke="#be123c"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="130" cy="130" r="10" fill="#be123c" fillOpacity="0.8" />
    </svg>
  );
}

const SLIDES: Slide[] = [
  {
    id: "ofertas",
    title: "Descubra o que realmente vale a pena comprar",
    body: "Ofertas do Mercado Livre, Shopee e Amazon num só lugar, ordenadas pelo que tem demanda e qualidade — não pela comissão.",
    cta: { href: "/ofertas", label: "Ver as ofertas de agora" },
    gradient: "from-teal-700 to-teal-950",
    art: <TagArt />,
  },
  {
    id: "achados",
    title: "Achados na Amazon, com análise de verdade",
    body: "Para quem cada produto faz sentido, quando não vale e o que conferir antes de comprar. Sem preço inventado.",
    cta: { href: "/achados", label: "Ver os achados" },
    gradient: "from-indigo-700 to-indigo-950",
    art: <MagnifierArt />,
  },
  {
    id: "guias",
    title: "Aprenda a comprar melhor",
    body: "Como saber se uma promoção é boa, entender o histórico de preço e fugir da compra por impulso.",
    cta: { href: "/guias", label: "Ler os guias" },
    gradient: "from-amber-700 to-amber-950",
    art: <BookArt />,
  },
  {
    id: "categorias",
    title: "Do celular ao pet: navegue por categoria",
    body: "Encontre rápido o que procura, filtrando as ofertas por categoria — no computador e no celular.",
    cta: { href: "/ofertas", label: "Explorar categorias" },
    gradient: "from-rose-700 to-rose-950",
    art: <GridArt />,
  },
];

const AUTOPLAY_MS = 6500;

export function HeroCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const track = trackRef.current;
      if (!track) return;
      const target = (next + SLIDES.length) % SLIDES.length;
      track.scrollTo({
        left: target * track.clientWidth,
        behavior: reduceMotion ? "auto" : "smooth",
      });
      indexRef.current = target;
      setIndex(target);
    },
    [reduceMotion],
  );

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const current = Math.round(track.scrollLeft / track.clientWidth);
    if (current !== indexRef.current) {
      indexRef.current = current;
      setIndex(current);
    }
  }, []);

  const playing = !hovering && !userPaused && !reduceMotion;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => goTo(indexRef.current + 1),
      AUTOPLAY_MS,
    );
    return () => window.clearInterval(timer);
  }, [playing, goTo]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Destaques do PreçoCaindo"
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
      onTouchStart={() => setHovering(true)}
      onTouchEnd={() => setHovering(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        aria-live={playing ? "off" : "polite"}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} de ${SLIDES.length}`}
            className={`relative min-w-full snap-center bg-linear-to-br ${slide.gradient} text-white`}
          >
            <div className="mx-auto flex min-h-[22rem] max-w-6xl items-center px-4 pt-10 pb-16 sm:min-h-[26rem] sm:px-6 sm:pb-20">
              <div className="relative z-10 max-w-xl">
                <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
                  {slide.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-balance text-white/90 sm:text-lg">
                  {slide.body}
                </p>
                <Link
                  href={slide.cta.href}
                  tabIndex={i === index ? 0 : -1}
                  className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-7 text-base font-bold text-neutral-900 shadow-lg transition hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {slide.cta.label}
                  <span aria-hidden className="ml-2">
                    →
                  </span>
                </Link>
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute right-2 bottom-4 h-44 w-44 opacity-30 sm:static sm:ml-auto sm:h-72 sm:w-72 sm:opacity-100 lg:h-80 lg:w-80"
              >
                {slide.art}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Slide anterior"
        onClick={() => goTo(index - 1)}
        className="absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg font-bold text-neutral-900 shadow hover:bg-white sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Próximo slide"
        onClick={() => goTo(index + 1)}
        className="absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg font-bold text-neutral-900 shadow hover:bg-white sm:flex"
      >
        ›
      </button>

      <div className="absolute inset-x-0 bottom-9 flex items-center justify-center gap-3 sm:bottom-11">
        <ul className="flex items-center gap-1">
          {SLIDES.map((slide, i) => (
            <li key={slide.id}>
              <button
                type="button"
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span
                  className={`block h-2.5 rounded-full transition-all ${
                    i === index ? "w-7 bg-white" : "w-2.5 bg-white/50"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={
            userPaused
              ? "Retomar rotação automática"
              : "Pausar rotação automática"
          }
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-xs text-white hover:bg-white/40"
        >
          {userPaused ? "▶" : "❚❚"}
        </button>
      </div>
    </section>
  );
}
