/**
 * Commercial/seasonal calendar — Fase 2 of the Vitrine Inteligente (project
 * brief section 4: "inteligência sazonal — prioridade máxima"). Every
 * moving date is computed live from the year via
 * lib/services/commercial-calendar-dates.ts, never hardcoded per-year, so
 * this file never needs manual yearly updates. `categoryIds` are real,
 * already-verified Mercado Livre category ids from
 * lib/config/ml-demand-categories.ts — never a guessed id. `keywords` are
 * search terms for the demand sources (lib/demand/sources/...), taken
 * directly from the project brief's own month-by-month list — a search
 * term is not a claim of real demand by itself, it only widens what the
 * real ML Highlights/Trends APIs are asked about.
 *
 * This is a STRATEGIC REFERENCE, not a fixed product list (brief: "O
 * calendário deverá funcionar como referência estratégica, e não como uma
 * lista fixa de produtos"): lib/services/vitrine-discovery.ts uses it to
 * decide WHICH categories/keywords to search when, the real ML APIs
 * decide WHAT products actually show up.
 */
import { computeCarnaval, computeEasterSunday, nthWeekdayOfMonth } from "@/lib/services/commercial-calendar-dates";

export interface CommercialEvent {
  id: string;
  name: string;
  /** This event's peak date in a given year — always computed, never a
   * stored/cached value. */
  peakDate: (year: number) => Date;
  /** Real, already-scanned ML category ids most associated with this
   * event — see lib/config/ml-demand-categories.ts for the verified set. */
  categoryIds: readonly string[];
  /** Search terms for the trends/demand sources — from the project brief's
   * own list, never fabricated. */
  keywords: readonly string[];
}

/** How far ahead (days) the Vitrine starts watching an event — project
 * brief section 4: 60/45/30/15. */
export const LEAD_DAYS = [60, 45, 30, 15] as const;

export const COMMERCIAL_EVENTS: readonly CommercialEvent[] = [
  {
    id: "verao-ferias",
    name: "Verão / férias de janeiro",
    peakDate: (y) => new Date(Date.UTC(y, 0, 15)),
    categoryIds: ["MLB1574", "MLB1276", "MLB5672"],
    keywords: ["ventilador", "climatizador", "piscina", "produtos de praia", "produtos de viagem"],
  },
  {
    id: "volta-aulas",
    name: "Volta às aulas",
    peakDate: (y) => new Date(Date.UTC(y, 0, 25)),
    categoryIds: ["MLB1648", "MLB1430"],
    keywords: ["material escolar", "mochila escolar", "volta às aulas"],
  },
  {
    id: "carnaval",
    name: "Carnaval",
    peakDate: (y) => computeCarnaval(y),
    categoryIds: ["MLB1430", "MLB1246"],
    keywords: ["fantasia carnaval", "acessórios carnaval", "produtos de viagem"],
  },
  {
    id: "dia-consumidor",
    name: "Dia do Consumidor",
    peakDate: (y) => new Date(Date.UTC(y, 2, 15)),
    categoryIds: ["MLB1051", "MLB1648", "MLB1000", "MLB5726"],
    keywords: ["dia do consumidor", "promoção"],
  },
  {
    id: "pascoa",
    name: "Páscoa",
    peakDate: (y) => computeEasterSunday(y),
    categoryIds: ["MLB1574"],
    keywords: ["páscoa", "chocolate", "cesta de páscoa"],
  },
  {
    id: "dia-maes",
    name: "Dia das Mães",
    peakDate: (y) => nthWeekdayOfMonth(y, 5, 0, 2),
    categoryIds: ["MLB1246", "MLB5726", "MLB1574"],
    keywords: ["presente dia das mães", "perfume", "eletrodoméstico"],
  },
  {
    id: "dia-namorados",
    name: "Dia dos Namorados",
    peakDate: (y) => new Date(Date.UTC(y, 5, 12)),
    categoryIds: ["MLB1246", "MLB1574"],
    keywords: ["presente dia dos namorados", "kit presente"],
  },
  {
    id: "festas-juninas",
    name: "Festas Juninas / inverno",
    peakDate: (y) => new Date(Date.UTC(y, 5, 24)),
    categoryIds: ["MLB1574", "MLB1430"],
    keywords: ["festa junina", "aquecedor", "cobertor", "produtos de inverno"],
  },
  {
    id: "dia-pais",
    name: "Dia dos Pais",
    peakDate: (y) => nthWeekdayOfMonth(y, 8, 0, 2),
    categoryIds: ["MLB263532", "MLB1000", "MLB5672"],
    keywords: ["presente dia dos pais", "ferramentas", "acessórios automotivos"],
  },
  {
    id: "primavera-jardinagem",
    name: "Primavera / jardinagem",
    peakDate: (y) => new Date(Date.UTC(y, 8, 23)),
    categoryIds: ["MLB1574"],
    keywords: ["jardinagem", "plantas", "vasos"],
  },
  {
    id: "dia-criancas",
    name: "Dia das Crianças",
    peakDate: (y) => new Date(Date.UTC(y, 9, 12)),
    categoryIds: ["MLB1144", "MLB1384"],
    keywords: ["brinquedo", "jogo infantil", "dia das crianças"],
  },
  {
    id: "halloween",
    name: "Halloween",
    peakDate: (y) => new Date(Date.UTC(y, 9, 31)),
    categoryIds: ["MLB1430"],
    keywords: ["fantasia halloween", "decoração halloween"],
  },
  {
    id: "black-friday",
    name: "Black Friday",
    peakDate: (y) => nthWeekdayOfMonth(y, 11, 5, 4),
    categoryIds: ["MLB1051", "MLB1648", "MLB1000", "MLB5726"],
    keywords: ["black friday", "promoção", "eletrônicos"],
  },
  {
    id: "cyber-monday",
    name: "Cyber Monday",
    peakDate: (y) => {
      const bf = nthWeekdayOfMonth(y, 11, 5, 4);
      return new Date(bf.getTime() + 3 * 86_400_000);
    },
    categoryIds: ["MLB1051", "MLB1648"],
    keywords: ["cyber monday"],
  },
  {
    id: "natal",
    name: "Natal",
    peakDate: (y) => new Date(Date.UTC(y, 11, 25)),
    categoryIds: ["MLB1144", "MLB1384", "MLB1574", "MLB1246"],
    keywords: ["árvore de natal", "pisca-pisca", "guirlanda", "decoração natalina", "presente de natal", "brinquedo"],
  },
  {
    id: "reveillon",
    name: "Réveillon",
    peakDate: (y) => new Date(Date.UTC(y, 11, 31)),
    categoryIds: ["MLB1430", "MLB1246"],
    keywords: ["réveillon", "roupa branca ano novo"],
  },
] as const;
