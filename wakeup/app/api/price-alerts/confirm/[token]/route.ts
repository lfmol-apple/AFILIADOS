import { NextResponse } from "next/server";
import { confirmPriceAlert } from "@/lib/services/price-alert";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const alert = await confirmPriceAlert(token);

  if (!alert) {
    return NextResponse.json(
      { error: "Token de confirmação inválido ou já utilizado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ status: "confirmed" });
}
