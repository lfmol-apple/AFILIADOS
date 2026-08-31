import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { recordManualPriceObservation } from "@/lib/services/manual-price-entry";

/**
 * Records one manually-verified price observation for a MANUAL_VERIFIED
 * product — the only supported way to attach a real price without the
 * Creators API or scraping. Requires --confirm and --source so this can
 * never be run as an accidental/scripted side effect and always leaves an
 * audit trail of where the number came from (project brief: "preço
 * somente com fonte oficial/permitida e timestamp claro").
 *
 * Usage:
 *   npm run product:set-price -- --asin B0EXAMPLE1 --price 199.90 \
 *     --source "amazon.com.br, conferido manualmente em 2026-08-18" --confirm \
 *     [--marketplace BR] [--currency BRL] [--originalPrice 249.90] [--availability IN_STOCK]
 */
async function main() {
  const { values } = parseArgs({
    options: {
      asin: { type: "string" },
      marketplace: { type: "string", default: "BR" },
      price: { type: "string" },
      originalPrice: { type: "string" },
      currency: { type: "string", default: "BRL" },
      availability: { type: "string", default: "IN_STOCK" },
      source: { type: "string" },
      confirm: { type: "boolean", default: false },
    },
  });

  if (!values.asin || !values.price || !values.source) {
    console.error(
      'Uso: npm run product:set-price -- --asin <ASIN> --price <valor> --source "<de onde veio o preço>" --confirm ' +
        "[--marketplace BR] [--currency BRL] [--originalPrice <valor>] [--availability IN_STOCK|OUT_OF_STOCK|UNKNOWN]",
    );
    process.exitCode = 1;
    return;
  }
  if (!values.confirm) {
    console.error(
      "Recusado: gravar um preço exige --confirm — confirme explicitamente que este é o preço real, " +
        "visto agora na página oficial da Amazon, e não um valor estimado.",
    );
    process.exitCode = 1;
    return;
  }

  const price = Number(values.price);
  const originalPrice = values.originalPrice
    ? Number(values.originalPrice)
    : null;
  const availability = (values.availability ?? "IN_STOCK") as
    "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

  const result = await recordManualPriceObservation({
    asin: values.asin,
    marketplace: values.marketplace ?? "BR",
    price,
    originalPrice,
    currency: values.currency,
    availability,
  });

  if (!result.ok) {
    console.error(`Falhou: [${result.error.code}] ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nPreço registrado (fonte: ${values.source}):`);
  console.log(`  productId:  ${result.productId}`);
  console.log(`  offerId:    ${result.offerId}`);
  console.log(
    `  score:      ${result.opportunityScore}${result.insufficientHistory ? " (histórico ainda insuficiente — não exibido como veredito ainda)" : ""}`,
  );
  console.log(`  link real:  ${result.affiliateUrl}`);
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
