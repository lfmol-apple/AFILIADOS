import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";

/**
 * Owner's directive, 2026-11-24 ("Verificações finais", item 4):
 * "Prepare um mecanismo de atualização das URLs ou versões das imagens
 * no XML, para que a Meta consiga identificar os novos criativos e não
 * continue utilizando imagens antigas em cache. Preserve os IDs dos
 * produtos e os links afiliados."
 *
 * The URL-changes-per-version mechanism already exists by construction
 * (lib/services/ai-creative-factory/creative-image-store.ts's fileName()
 * bakes the version into the filename, and app/catalogo/mercado-
 * livre.xml/route.ts always serves the latest approved+published row's
 * finalImageUrl) — a brand-new generation already gets a URL Meta has
 * never seen, forcing a real re-fetch, never a stale cache hit. What was
 * actually missing was the mechanism to PROMOTE the 11 already-corrected
 * local files (.local-real-creatives/corrected/, built by
 * fix-local-creative-cta-bars.ts) into that same real versioned path —
 * this script is that mechanism.
 *
 * Reuses the EXACT same write shape jobs/vitrine-creative-factory.ts
 * already uses for a real approved generation (unpublish the old row,
 * saveFinalRender under the next version, create the new row inside one
 * transaction) — nothing new invented, no shortcut around the real
 * publish path. g:id (merchantListingId) and the affiliate <link> in the
 * XML route are never touched by this script or by a creative-version
 * bump — only finalImageUrl/version changes, which is the whole point.
 *
 * SAFE BY DEFAULT: dry-run unless --commit is passed. Dry-run reads
 * everything and prints exactly what WOULD happen; nothing is written
 * to the database or the real creative directory. The owner has NOT
 * authorized a production run of this script in this session — it
 * exists so the mechanism is reviewed and ready, not so it gets run now.
 */

const SOURCE_DIR = path.join(process.cwd(), ".local-real-creatives");
const CORRECTED_DIR = path.join(SOURCE_DIR, "corrected");
const CLASSIFICATION_PATH = path.join(SOURCE_DIR, "classification.json");

interface ClassificationItem {
  gid: string;
  title: string;
  version: number;
  verdict: string;
}
interface Classification {
  items: ClassificationItem[];
}

export type PromoteOutcome =
  | { gid: string; outcome: "applied"; fromVersion: number; toVersion: number; finalUrl: string }
  | { gid: string; outcome: "dry_run"; fromVersion: number; toVersion: number; bytes: number }
  | { gid: string; outcome: "skipped_missing_file"; detail: string }
  | { gid: string; outcome: "skipped_no_existing_row"; detail: string }
  | { gid: string; outcome: "skipped_version_mismatch"; detail: string };

/** Pure-ish (DB-touching only when commit=true) promotion of one already
 * classified+corrected item — separated from main() so a test can call
 * it directly against a real local test DB without going through the
 * CLI/process.argv. */
export async function promoteCorrectedCreative(item: ClassificationItem, opts: { correctedDir: string; commit: boolean }): Promise<PromoteOutcome> {
  const correctedFile = `${item.gid}-v${item.version + 1}.png`;
  const correctedPath = path.join(opts.correctedDir, correctedFile);
  if (!existsSync(correctedPath)) {
    return { gid: item.gid, outcome: "skipped_missing_file", detail: correctedPath };
  }

  const latest = await prisma.vitrineCreative.findFirst({
    where: { merchantListingId: item.gid, kind: "ad_overlay" },
    orderBy: { version: "desc" },
  });
  if (!latest) {
    return { gid: item.gid, outcome: "skipped_no_existing_row", detail: "nenhuma linha VitrineCreative(kind=ad_overlay) encontrada" };
  }
  if (latest.version !== item.version) {
    // Real safety check: the DB has moved since classification.json was
    // built (someone else generated a newer version in the meantime).
    // Never silently overwrite an unknown newer state — skip and
    // report, exactly the same posture as the idempotency checks in
    // jobs/vitrine-creative-factory.ts itself.
    return {
      gid: item.gid,
      outcome: "skipped_version_mismatch",
      detail: `versão atual no banco é v${latest.version}, classificação esperava v${item.version}`,
    };
  }

  const nextVersion = latest.version + 1;
  const bytes = readFileSync(correctedPath);

  if (!opts.commit) {
    return { gid: item.gid, outcome: "dry_run", fromVersion: latest.version, toVersion: nextVersion, bytes: bytes.length };
  }

  const finalUrl = saveFinalRender(item.gid, "ad_overlay", nextVersion, bytes);
  await prisma.$transaction([
    prisma.vitrineCreative.updateMany({
      where: { merchantListingId: item.gid, kind: "ad_overlay" },
      data: { publishedAt: null },
    }),
    prisma.vitrineCreative.create({
      data: {
        merchantListingId: item.gid,
        kind: "ad_overlay",
        version: nextVersion,
        originalPhotoUrl: latest.originalPhotoUrl,
        aiBaseImageUrl: latest.aiBaseImageUrl,
        finalImageUrl: finalUrl,
        promptInputs: {
          correction: "deterministic_cta_bar_recomposite",
          sourceVersion: latest.version,
          note: "Faixa do Mercado Livre recomposta a partir do asset aprovado (public/vitrine/cta-bar-1080w.png) — nenhuma chamada de IA nova, mesma composição de base, apenas a faixa inferior substituída deterministicamente.",
        },
        promptText: null,
        model: "deterministic-cta-bar-correction",
        costUsd: 0,
        qualityStatus: "approved",
        qualityNotes: "Correção determinística do corte da faixa CTA — aprovado para aplicar sem nova chamada de IA.",
        publishedAt: new Date(),
      },
    }),
  ]);
  return { gid: item.gid, outcome: "applied", fromVersion: latest.version, toVersion: nextVersion, finalUrl };
}

async function main() {
  const commit = process.argv.includes("--commit");

  if (!existsSync(CLASSIFICATION_PATH)) {
    console.error(`classification.json não encontrado em ${CLASSIFICATION_PATH} — nada a fazer.`);
    process.exitCode = 1;
    return;
  }
  const classification = JSON.parse(readFileSync(CLASSIFICATION_PATH, "utf8")) as Classification;
  const cutoffItems = classification.items.filter((i) => i.verdict === "cta_cortado");

  console.log(commit ? "MODO: aplicando de verdade (--commit)" : "MODO: dry-run (nada será gravado — passe --commit para aplicar de verdade)");
  console.log("---");

  for (const item of cutoffItems) {
    const result = await promoteCorrectedCreative(item, { correctedDir: CORRECTED_DIR, commit });
    switch (result.outcome) {
      case "applied":
        console.log(`${item.gid}  APLICADO v${result.fromVersion} -> v${result.toVersion} (${item.title}) -> ${result.finalUrl}`);
        break;
      case "dry_run":
        console.log(`${item.gid}  [dry-run] promoveria v${result.fromVersion} -> v${result.toVersion} (${item.title}), ${result.bytes} bytes`);
        break;
      case "skipped_missing_file":
        console.error(`${item.gid}  ERRO — arquivo corrigido não encontrado em ${result.detail} (esperado da classificação v${item.version} -> v${item.version + 1})`);
        break;
      case "skipped_no_existing_row":
        console.error(`${item.gid}  ERRO — ${result.detail}; não há o que promover.`);
        break;
      case "skipped_version_mismatch":
        console.error(`${item.gid}  SKIP — ${result.detail}. Estado mudou desde a classificação; revise manualmente antes de aplicar.`);
        break;
    }
  }

  console.log("---");
  console.log(commit ? "Aplicado de verdade. g:id e <link> no XML não foram alterados — só finalImageUrl/version." : "Dry-run concluído. Nada foi gravado.");
}

const isMainModule = import.meta.url === new URL(`file://${process.argv[1]}`).href || decodeURIComponent(new URL(import.meta.url).pathname) === process.argv[1];
if (isMainModule) {
  main()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
