import { NextResponse } from "next/server";
import { resolveMerchantRedirect } from "@/lib/services/merchant-redirect";
import { isOwnerRequest } from "@/lib/admin/owner-traffic";
import { isPrefetchRequest } from "@/lib/http/is-prefetch-request";
import { isKnownBotRequest } from "@/lib/http/is-bot-request";
import { isBurstRequest } from "@/lib/http/is-burst-request";
import { classifySiteClick } from "@/lib/http/classify-site-click";

export async function GET(
  request: Request,
  context: { params: Promise<{ merchant: string; externalId: string }> },
) {
  const { merchant, externalId } = await context.params;
  const url = new URL(request.url);
  const verdict = classifySiteClick(
    request.headers,
    url.searchParams,
    Date.now(),
    externalId,
  );
  const result = await resolveMerchantRedirect({
    merchant,
    externalId,
    searchParams: url.searchParams,
    isOwner: await isOwnerRequest(request),
    isPrefetch:
      isPrefetchRequest(request.headers, url.searchParams) ||
      isKnownBotRequest(request.headers) ||
      isBurstRequest(request.headers) ||
      !verdict.record,
    notifyOwner: verdict.notify,
  });

  if (result.status === "error") {
    return NextResponse.json(
      { error: result.errorMessage },
      { status: result.errorStatus },
    );
  }

  return NextResponse.redirect(result.destination, { status: 302 });
}
