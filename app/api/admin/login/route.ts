import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  isAdminAuthConfigured,
  isLoginRateLimited,
  recordLoginAttempt,
  verifyPassword,
} from "@/lib/admin/auth";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

const bodySchema = z.object({ password: z.string().min(1).max(500) });

/** Best-effort client IP from the reverse proxy — see docs/DEPLOYMENT.md
 * for the required `proxy_set_header X-Forwarded-For` nginx config. Falls
 * back to "unknown" (a single shared bucket) when absent, which is
 * strictly more restrictive, not a bypass. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return "unknown";
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { error: "Admin auth not configured (ADMIN_PASSWORD_HASH unset)." },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  if (await isLoginRateLimited(ip)) {
    logger.warn("admin.login.rate_limited", { ip: ip === "unknown" ? ip : "redacted" });
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const valid = verifyPassword(parsed.data.password, env.ADMIN_PASSWORD_HASH);
  await recordLoginAttempt(ip, valid);

  if (!valid) {
    logger.warn("admin.login.failed", { ip: ip === "unknown" ? ip : "redacted" });
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { token, expiresAt } = await createAdminSession();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  logger.info("admin.login.success", {});
  return NextResponse.json({ ok: true });
}
