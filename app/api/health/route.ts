import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/observability/health";

export async function GET() {
  const result = await runHealthCheck();
  return NextResponse.json(result, { status: result.status === "unhealthy" ? 503 : 200 });
}
