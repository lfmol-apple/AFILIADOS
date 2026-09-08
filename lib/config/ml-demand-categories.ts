/**
 * General Market Scanner V1 (2026-09-08) — which real Mercado Livre
 * categories `jobs/ml-demand.ts` scans, and how it rotates through them
 * to stay within a conservative call budget per cycle.
 *
 * Real category ids (verified live, 2026-09-08, via the authenticated
 * `GET /sites/MLB/categories` call this project already uses elsewhere —
 * never guessed): the 13 below were also each spot-checked against the
 * real `GET /highlights/MLB/category/{id}` endpoint this same day and
 * every one returned real, resolvable highlights (HTTP 200, `type:
 * "PRODUCT"` — a few categories also return `"USER_PRODUCT"`, which
 * MercadoLivreBestsellerDemandSource now also attempts to resolve rather
 * than silently dropping).
 *
 * Rotation, not "scan everything every cycle" (project brief section 20:
 * "não tentar cobrir tudo de uma vez", section 21: rotation must be
 * deterministic, observable, and no category left forever unscanned).
 * Grouped into 3 fixed groups scanned in round-robin order — one group
 * per cycle — so the full set is covered every 3 cycles (today's cadence:
 * every 4h -> full coverage every 12h). The rotation index is derived
 * from how many ML_DEMAND AutomationRun rows already exist (`count() %
 * groups.length`) — reuses AutomationRun as the state, no new table/column
 * needed just to remember "which group is next".
 */
export interface MlScanCategory {
  id: string;
  name: string;
}

export const ML_GENERAL_SCAN_CATEGORY_GROUPS: readonly MlScanCategory[][] = [
  [
    { id: "MLB1051", name: "Celulares e Telefones" },
    { id: "MLB1648", name: "Informática" },
    { id: "MLB1000", name: "Eletrônicos, Áudio e Vídeo" },
    { id: "MLB5726", name: "Eletrodomésticos" },
  ],
  [
    { id: "MLB1574", name: "Casa, Móveis e Decoração" },
    { id: "MLB1246", name: "Beleza e Cuidado Pessoal" },
    { id: "MLB263532", name: "Ferramentas" },
    { id: "MLB1276", name: "Esportes e Fitness" },
  ],
  [
    { id: "MLB1071", name: "Animais" },
    { id: "MLB1384", name: "Bebês" },
    { id: "MLB1144", name: "Games" },
    { id: "MLB5672", name: "Acessórios para Veículos" },
    { id: "MLB1430", name: "Calçados, Roupas e Bolsas" },
  ],
] as const;

/** Every category across every rotation group — for anything that needs
 * the full real set regardless of which group is "current" this cycle
 * (e.g. reporting "13 categorias sob observação automática", not just
 * "4 scanned this run"). */
export const ML_ALL_SCAN_CATEGORIES: readonly MlScanCategory[] =
  ML_GENERAL_SCAN_CATEGORY_GROUPS.flat();

/** Deterministic: the Nth call always returns the same group for the same
 * N, so a rerun of the same cycle count sees the same categories — real
 * rotation state, not a random pick. */
export function pickRotationGroup(cycleCount: number): MlScanCategory[] {
  const index = cycleCount % ML_GENERAL_SCAN_CATEGORY_GROUPS.length;
  return [...ML_GENERAL_SCAN_CATEGORY_GROUPS[index]!];
}

/**
 * BACKWARD-COMPAT / pre-existing behavior note: before this phase,
 * ML_DEMAND scanned exactly one category (`MLB1051` — the only one
 * verified end-to-end at the time). It's still the first entry of group
 * 0, so nothing regresses — it's simply no longer the ONLY category.
 */
export const ML_DEMAND_CATEGORY_IDS: readonly string[] = ["MLB1051"];
