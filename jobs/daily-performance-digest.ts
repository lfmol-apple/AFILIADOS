import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { getPerformanceDashboardData } from "@/lib/queries/performance-dashboard";
import { buildPerformanceDigest } from "@/lib/services/performance-digest";
import { isEmailConfigured, sendEmail } from "@/lib/services/email-sender";

/**
 * Daily email with the same numbers as /admin/desempenho. dryRun defaults to
 * true — a bare invocation only prints the email; sending is an explicit
 * `--live`, same convention as LINK_HEALTH_CHECK.
 */
export async function runDailyPerformanceDigest(
  dryRun: boolean,
): Promise<JobCounters> {
  return runJob("DAILY_PERFORMANCE_DIGEST", async (ctx) => {
    ctx.counters.processed += 1;
    const data = await getPerformanceDashboardData(14, 10);
    const digest = buildPerformanceDigest(data, env.NEXT_PUBLIC_SITE_URL);

    if (dryRun) {
      console.log(`SUBJECT: ${digest.subject}\n\n${digest.text}`);
      return;
    }
    if (!isEmailConfigured()) {
      ctx.counters.errors += 1;
      logger.error("daily_digest.not_configured", {
        message: "RESEND_API_KEY and DAILY_DIGEST_EMAIL_TO must both be set.",
      });
      return;
    }
    const { id } = await sendEmail({
      to: env.DAILY_DIGEST_EMAIL_TO,
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    });
    ctx.counters.created += 1;
    ctx.metadata.emailId = id;
    logger.info("daily_digest.sent", { emailId: id });
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const { values } = parseArgs({
    options: { live: { type: "boolean", default: false } },
  });
  const dryRun = !values.live;
  if (dryRun) {
    console.log(
      "=== DRY RUN — nada será enviado. Passe --live pra enviar. ===",
    );
  }
  runDailyPerformanceDigest(dryRun)
    .then((c) =>
      console.log("DAILY_PERFORMANCE_DIGEST done:", JSON.stringify(c)),
    )
    .catch((err) => {
      console.error(
        "DAILY_PERFORMANCE_DIGEST failed:",
        err instanceof Error ? err.message : err,
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
