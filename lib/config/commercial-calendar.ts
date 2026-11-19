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
 * `eventType` (owner's correction, 2026-11-19, section 7): thematic events
 * (Natal, Halloween, Réveillon, Carnaval, Páscoa, Dia das Mães/Pais/
 * Crianças) are discovered by searching their own real keywords — the
 * product's PURPOSE genuinely matches the word ("árvore de natal" really
 * does mean a Christmas tree). Promotional events (Black Friday, Cyber
 * Monday, Dia do Consumidor) must NOT be discovered this way — a product
 * merely titled "Bexiga Black Friday" is not a Black-Friday opportunity,
 * it's a balloon with the phrase in its title (found live, 2026-11-19).
 * For these, jobs/vitrine-discovery.ts instead scans real category
 * bestseller highlights and requires an actual detected price drop — what
 * a promotional event actually IS: a real discount happening now, not a
 * name in a title. `keywords` is empty for promotional events for exactly
 * this reason; the field is unused by that discovery path.
 *
 * `leadDays`/`tailDays` (owner's correction, section 4 and 7: "não faz
 * sentido anunciar produtos específicos de Halloween 19 dias depois da
 * data" + "ajuste as janelas... individualmente, conforme a natureza de
 * cada evento"): a single-day costume/decoration event has almost no
 * legitimate post-event relevance; an extended gift-giving season
 * (Natal) does, for exchanges/late shoppers. Both omitted = the engine's
 * defaults (60 lead / 10 tail).
 */
import { computeCarnaval, computeEasterSunday, nthWeekdayOfMonth } from "@/lib/services/commercial-calendar-dates";

export type CommercialEventType = "tematico" | "promocional";

export interface CommercialEvent {
  id: string;
  name: string;
  eventType: CommercialEventType;
  /** This event's peak date in a given year — always computed, never a
   * stored/cached value. */
  peakDate: (year: number) => Date;
  /** Real, already-scanned ML category ids most associated with this
   * event — see lib/config/ml-demand-categories.ts for the verified set.
   * Used by BOTH event types: thematic events use it only as a loose
   * categorization hint; promotional events use it as the actual
   * discovery scan target (category bestseller highlights). */
  categoryIds: readonly string[];
  /** Search terms for thematic-event discovery — from the project
   * brief's own list, refined for semantic specificity where the plain
   * phrase was ambiguous (owner's example, section 5: "roupa branca ano
   * novo" matched a laundry detergent for whites, not New Year's white
   * clothing). Empty for promotional events — see file doc comment. */
  keywords: readonly string[];
  /** Days before peak to start watching. Defaults to 60 when omitted. */
  leadDays?: number;
  /** Days after peak this event stays even marginally relevant.
   * Defaults to 10 when omitted. */
  tailDays?: number;
  /** Owner's correction, 2026-11-19, re-confirmed live in the isolated
   * homologation run the same day: ML's catalog search does loose
   * token-level matching, not phrase matching — searching
   * "roupa branca réveillon ano novo" still returned "Lava Roupa Branca
   * Colorida" (laundry detergent) and "Roupa Branca Conjunto Masculino
   * Umbanda Candomblé" (religious clothing), because both titles contain
   * "roupa"/"branca" even though neither is about New Year's. Appending
   * more words to the search phrase does not fix this — the search
   * engine, not the phrase, is the problem. When set (non-empty),
   * jobs/vitrine-discovery.ts additionally requires at least one of
   * these terms to literally appear (accent/case-insensitive) in the
   * matched product's own title before accepting it as a genuine
   * thematic match — a second, independent check on top of the search
   * itself, not a replacement for picking a specific search phrase.
   * Applied here only where a real false match was confirmed; not
   * speculatively added to every event without equivalent evidence. */
  requiredAnchorTerms?: readonly string[];
}

/** How far ahead (days) the Vitrine starts watching an event, by default
 * — project brief section 4: 60/45/30/15 as reference markers. */
export const LEAD_DAYS = [60, 45, 30, 15] as const;

export const COMMERCIAL_EVENTS: readonly CommercialEvent[] = [
  {
    id: "verao-ferias",
    name: "Verão / férias de janeiro",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 0, 15)),
    categoryIds: ["MLB1574", "MLB1276", "MLB5672"],
    keywords: ["ventilador", "climatizador", "piscina", "produtos de praia", "produtos de viagem"],
    leadDays: 60,
    tailDays: 20,
  },
  {
    id: "volta-aulas",
    name: "Volta às aulas",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 0, 25)),
    categoryIds: ["MLB1648", "MLB1430"],
    keywords: ["material escolar", "mochila escolar", "volta às aulas"],
    leadDays: 45,
    tailDays: 10,
  },
  {
    id: "carnaval",
    name: "Carnaval",
    eventType: "tematico",
    peakDate: (y) => computeCarnaval(y),
    categoryIds: ["MLB1430", "MLB1246"],
    keywords: ["fantasia carnaval", "acessórios carnaval bloco", "produtos de viagem carnaval"],
    leadDays: 45,
    tailDays: 3,
  },
  {
    id: "dia-consumidor",
    name: "Dia do Consumidor",
    eventType: "promocional",
    peakDate: (y) => new Date(Date.UTC(y, 2, 15)),
    categoryIds: ["MLB1051", "MLB1648", "MLB1000", "MLB5726"],
    keywords: [],
    leadDays: 15,
    tailDays: 1,
  },
  {
    id: "pascoa",
    name: "Páscoa",
    eventType: "tematico",
    peakDate: (y) => computeEasterSunday(y),
    categoryIds: ["MLB1574"],
    keywords: ["ovo de páscoa", "chocolate páscoa", "cesta de páscoa"],
    leadDays: 30,
    tailDays: 2,
  },
  {
    id: "dia-maes",
    name: "Dia das Mães",
    eventType: "tematico",
    peakDate: (y) => nthWeekdayOfMonth(y, 5, 0, 2),
    categoryIds: ["MLB1246", "MLB5726", "MLB1574"],
    keywords: ["presente dia das mães", "perfume feminino presente", "eletrodoméstico presente"],
    leadDays: 30,
    tailDays: 2,
  },
  {
    id: "dia-namorados",
    name: "Dia dos Namorados",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 5, 12)),
    categoryIds: ["MLB1246", "MLB1574"],
    keywords: ["presente dia dos namorados", "kit presente namorados"],
    leadDays: 30,
    tailDays: 2,
  },
  {
    id: "festas-juninas",
    name: "Festas Juninas / inverno",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 5, 24)),
    categoryIds: ["MLB1574", "MLB1430"],
    keywords: ["festa junina decoração", "aquecedor ambiente", "cobertor casal", "produtos de inverno"],
    leadDays: 45,
    tailDays: 15,
  },
  {
    id: "dia-pais",
    name: "Dia dos Pais",
    eventType: "tematico",
    peakDate: (y) => nthWeekdayOfMonth(y, 8, 0, 2),
    categoryIds: ["MLB263532", "MLB1000", "MLB5672"],
    keywords: ["presente dia dos pais", "ferramentas presente", "acessórios automotivos presente"],
    leadDays: 30,
    tailDays: 2,
  },
  {
    id: "primavera-jardinagem",
    name: "Primavera / jardinagem",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 8, 23)),
    categoryIds: ["MLB1574"],
    keywords: ["jardinagem ferramentas", "plantas vaso", "vasos decorativos"],
    leadDays: 45,
    tailDays: 20,
  },
  {
    id: "dia-criancas",
    name: "Dia das Crianças",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 9, 12)),
    categoryIds: ["MLB1144", "MLB1384"],
    keywords: ["brinquedo infantil", "jogo infantil presente", "presente dia das crianças"],
    leadDays: 45,
    tailDays: 3,
  },
  {
    id: "halloween",
    name: "Halloween",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 9, 31)),
    categoryIds: ["MLB1430"],
    keywords: ["fantasia halloween", "decoração halloween"],
    leadDays: 30,
    tailDays: 2,
  },
  {
    id: "black-friday",
    name: "Black Friday",
    eventType: "promocional",
    peakDate: (y) => nthWeekdayOfMonth(y, 11, 5, 4),
    categoryIds: ["MLB1051", "MLB1648", "MLB1000", "MLB5726", "MLB1574", "MLB1276", "MLB263532"],
    keywords: [],
    leadDays: 25,
    tailDays: 2,
  },
  {
    id: "cyber-monday",
    name: "Cyber Monday",
    eventType: "promocional",
    peakDate: (y) => {
      const bf = nthWeekdayOfMonth(y, 11, 5, 4);
      return new Date(bf.getTime() + 3 * 86_400_000);
    },
    categoryIds: ["MLB1051", "MLB1648"],
    keywords: [],
    leadDays: 12,
    tailDays: 1,
  },
  {
    id: "natal",
    name: "Natal",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 11, 25)),
    categoryIds: ["MLB1144", "MLB1384", "MLB1574", "MLB1246"],
    keywords: ["árvore de natal", "pisca-pisca natalino", "guirlanda de natal", "decoração natalina", "presente de natal"],
    leadDays: 60,
    tailDays: 10,
  },
  {
    id: "reveillon",
    name: "Réveillon",
    eventType: "tematico",
    peakDate: (y) => new Date(Date.UTC(y, 11, 31)),
    categoryIds: ["MLB1430", "MLB1246"],
    keywords: ["vestido branco réveillon", "look branco ano novo", "roupa branca réveillon ano novo"],
    leadDays: 45,
    tailDays: 2,
    requiredAnchorTerms: ["réveillon", "reveillon", "ano novo", "virada"],
  },
] as const;
