import { runJob } from "@/lib/jobs/automation-run";
import { refreshProductsByPriority } from "@/lib/jobs/refresh-products";

/** Refreshes HOT products (high traffic / high opportunity) — should run
 * most frequently of the two refresh jobs. See docs/AUTOMATION.md. */
export async function refreshPriorityProducts() {
  return runJob("REFRESH_PRIORITY_PRODUCTS", async (ctx) => {
    await refreshProductsByPriority(["HOT"], 100, ctx);
  });
}
