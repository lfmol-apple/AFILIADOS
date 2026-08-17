import { runJob } from "@/lib/jobs/automation-run";
import { refreshProductsByPriority } from "@/lib/jobs/refresh-products";

/** Refreshes WARM/COLD products at a slower pace, batched to respect
 * upstream rate limits. Run less frequently than REFRESH_PRIORITY_PRODUCTS.
 * See docs/AUTOMATION.md. */
export async function refreshCatalog() {
  return runJob("REFRESH_CATALOG", async (ctx) => {
    await refreshProductsByPriority(["WARM", "COLD"], 200, ctx);
  });
}
