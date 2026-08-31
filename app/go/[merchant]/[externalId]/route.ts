import { NextResponse } from "next/server";
import { resolveMerchantRedirect } from "@/lib/services/merchant-redirect";

export async function GET(
  request: Request,
  context: { params: Promise<{ merchant: string; externalId: string }> },
) {
  const { merchant, externalId } = await context.params;
  const url = new URL(request.url);
  const result = await resolveMerchantRedirect({
    merchant,
    externalId,
    searchParams: url.searchParams,
  });

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.errorMessage },
      { status: result.errorStatus },
    );
  }

  return NextResponse.redirect(result.destination, { status: 302 });
}
