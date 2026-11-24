import "dotenv/config";
import { env } from "@/lib/config/env";
import { checkLiveActivationReadiness } from "@/lib/amazon/policy-guard";

/**
 * Gate for AMAZON_PROVIDER=live (project brief section 72). Scoped to BR —
 * the only marketplace with any real account activity. US has its own,
 * separately-tracked checklist in lib/amazon/readiness-checks.ts /
 * `npm run production:readiness`, since it isn't close to live regardless
 * (see docs/AMAZON.md). Only checks what code can verify — account-level
 * items (Associate approval, qualified sales, Creators API access, manual
 * policy review) must be confirmed by a human and tracked in
 * docs/AMAZON_COMPLIANCE.md.
 */
function main() {
  console.log("PreçoCaindo — Amazon compliance check (BR)\n");

  if (env.AMAZON_PROVIDER !== "live") {
    console.log(
      `AMAZON_PROVIDER=${env.AMAZON_PROVIDER} — live checklist not applicable. PASS.`,
    );
    return;
  }

  const checks = checkLiveActivationReadiness("BR");
  let allPass = true;

  for (const check of checks) {
    console.log(`  ${check.pass ? "✔" : "✘"} ${check.label}`);
    if (!check.pass) allPass = false;
  }

  console.log(
    "\nReminder: this script cannot verify account-level items (Associate status, " +
      "declared domain, Creators API access, manual policy review). Confirm those against " +
      "docs/AMAZON_COMPLIANCE.md before flipping AMAZON_PROVIDER=live in production.",
  );

  if (!allPass) {
    console.error("\nFAIL: one or more automated checks did not pass.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: automated checks passed.");
}

main();
