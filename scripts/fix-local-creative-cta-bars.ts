import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { compositeDeterministicCtaBar } from "@/lib/services/ai-creative-factory/compositor";
import { readPngDimensions } from "@/lib/services/ai-creative-factory/creative-image-store";

/**
 * Owner's directive, 2026-11-24 ("construa um corretor em lote, sem
 * nenhuma chamada paga, pros 11 criativos já defeituosos"). Purely local:
 * reads from .local-real-creatives/ (17 real creatives downloaded from
 * the live feed, plus the owner's own classification.json — already
 * verified ground truth, not re-derived here), writes corrected copies
 * to .local-real-creatives/corrected/, and touches NOTHING else:
 *  - no database connection of any kind
 *  - no production file (VITRINE_CREATIVE_DIR, the real bind-mounted
 *    volume) is read or written
 *  - no VitrineLink/affiliate URL is touched — this tool never looks at
 *    those, it only ever reads/writes PNG files by merchantListingId
 *  - no OpenAI call, paid or otherwise
 *  - never overwrites the existing source file — always a NEW file, a
 *    version number higher than what classification.json recorded
 *
 * This is staged, local-only correction. Applying any of this for real
 * (copying a corrected file into the real VITRINE_CREATIVE_DIR and
 * creating a real VitrineCreative row) is a SEPARATE, deliberate step
 * the owner has not yet authorized — this script does not do it and
 * does not know how to.
 */

export interface ClassificationItem {
  gid: string;
  title: string;
  version: number;
  verdict: "correto" | "cta_cortado" | "layout_diferente_do_template_aprovado";
}

export interface Classification {
  items: ClassificationItem[];
}

export interface BatchFixResult {
  gid: string;
  outcome: "corrected" | "skipped_verdict" | "skipped_missing_source" | "error";
  detail: string;
  outputPath?: string;
}

/** Extracted from the script's own top-level `main()` so it's directly
 * unit-testable (owner's directive: "adicione testes reais para... o
 * corretor em lote") without needing a real .local-real-creatives/
 * directory or a subprocess — pass any sourceDir/outputDir/classification
 * and this does exactly what the real script does, nothing more. Never
 * touches a database, a production directory, or makes a network call —
 * pure local file compositing. */
export async function runCtaBarBatchFix(input: {
  sourceDir: string;
  outputDir: string;
  classification: Classification;
}): Promise<BatchFixResult[]> {
  mkdirSync(input.outputDir, { recursive: true });
  const results: BatchFixResult[] = [];

  for (const item of input.classification.items) {
    if (item.verdict !== "cta_cortado") {
      results.push({ gid: item.gid, outcome: "skipped_verdict", detail: item.verdict });
      continue;
    }

    const sourcePath = path.join(input.sourceDir, `${item.gid}.png`);
    if (!existsSync(sourcePath)) {
      results.push({ gid: item.gid, outcome: "skipped_missing_source", detail: sourcePath });
      continue;
    }

    try {
      const sourceBuffer = readFileSync(sourcePath);
      // Owner's directive: never assume every file is exactly 1080×1350
      // — read each file's real, current dimensions.
      const { width, height } = readPngDimensions(sourceBuffer);
      const correctedBuffer = await compositeDeterministicCtaBar({
        baseImageDataUri: `data:image/png;base64,${sourceBuffer.toString("base64")}`,
        width,
        height,
      });
      const nextVersion = item.version + 1;
      const outputPath = path.join(input.outputDir, `${item.gid}-v${nextVersion}.png`);
      writeFileSync(outputPath, correctedBuffer);
      results.push({ gid: item.gid, outcome: "corrected", detail: `v${item.version} -> v${nextVersion}, ${width}x${height}`, outputPath });
    } catch (err) {
      results.push({ gid: item.gid, outcome: "error", detail: String(err) });
    }
  }

  return results;
}

const SOURCE_DIR = path.join(process.cwd(), ".local-real-creatives");
const OUTPUT_DIR = path.join(SOURCE_DIR, "corrected");
const CLASSIFICATION_PATH = path.join(SOURCE_DIR, "classification.json");

async function main() {
  if (!existsSync(CLASSIFICATION_PATH)) {
    console.error(`classification.json não encontrado em ${CLASSIFICATION_PATH} — nada a fazer.`);
    process.exitCode = 1;
    return;
  }
  const classification = JSON.parse(readFileSync(CLASSIFICATION_PATH, "utf8")) as Classification;
  const results = await runCtaBarBatchFix({ sourceDir: SOURCE_DIR, outputDir: OUTPUT_DIR, classification });

  for (const r of results) {
    if (r.outcome === "corrected") console.log(`${r.gid}  CORRIGIDO -> ${r.outputPath} (${r.detail})`);
    else if (r.outcome === "skipped_verdict") console.log(`${r.gid}  SKIP (${r.detail})`);
    else if (r.outcome === "skipped_missing_source") console.log(`${r.gid}  SKIP — arquivo fonte não encontrado em ${r.detail}`);
    else console.error(`${r.gid}  ERRO — ${r.detail}`);
  }

  const corrected = results.filter((r) => r.outcome === "corrected").length;
  const skipped = results.filter((r) => r.outcome.startsWith("skipped")).length;
  const errors = results.filter((r) => r.outcome === "error").length;
  console.log("---");
  console.log(`corrigidos: ${corrected} | ignorados: ${skipped} | erros: ${errors}`);
  console.log(`Saída em: ${OUTPUT_DIR}`);
  console.log("Nada foi gravado no banco de dados, em nenhum link afiliado, ou em qualquer diretório de produção — isto é 100% local, aguardando aprovação separada antes de aplicar de verdade.");
}

// Compares decoded pathnames, not raw strings — a repo path with spaces
// or accented characters (e.g. this one) gets percent-encoded in
// import.meta.url but not in process.argv[1], so a raw-string comparison
// silently never matches and the script does nothing when run directly.
const isMainModule = import.meta.url === new URL(`file://${process.argv[1]}`).href || decodeURIComponent(new URL(import.meta.url).pathname) === process.argv[1];
if (isMainModule) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
