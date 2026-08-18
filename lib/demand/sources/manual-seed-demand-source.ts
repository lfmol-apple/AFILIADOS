import type { DemandSignal, DemandSource } from "../types";
import { DISCOVERY_SEED_KEYWORDS } from "@/lib/config/discovery";

/**
 * Bootstraps demand before there's any real traffic to learn from. These
 * keywords are editorially curated, not observed — `observedCount` stays 0
 * on purpose (see lib/demand/scoring.ts: 0 observed means demandScore is
 * null, not a fabricated number).
 */
export class ManualSeedDemandSource implements DemandSource {
  readonly name = "manual_seed";

  async collect(): Promise<DemandSignal[]> {
    return DISCOVERY_SEED_KEYWORDS.map((keyword) => ({
      keyword,
      intent: "PRODUCT_RESEARCH" as const,
      source: this.name,
      observedCount: 0,
    }));
  }
}
