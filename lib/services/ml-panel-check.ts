import { prisma } from "@/lib/db";
import { extractCatalogProductId } from "@/lib/services/ml-panel-register";
import {
  carriesOwnerProfile,
  decideVerdict,
  expectedIdsFromProductUrl,
  pageTitleFromHtml,
  titleSimilarity,
  type LinkCheckVerdict,
} from "@/lib/services/ml-panel-check-logic";

const MELI_HOSTS = /^(www\.)?(mercadolivre\.com(\.br)?|meli\.la)$/i;

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export type PanelLinkStatus = LinkCheckVerdict | "duplicate" | "invalid";

export interface PanelLinkCheck {
  status: PanelLinkStatus;
  /** One plain sentence for the owner. */
  message: string;
  panelTitle: string;
  /** Product title read from the page the pasted link opens. */
  linkTitle: string | null;
  /** Is the owner's affiliate profile/tag visible in the opened link? null = could not tell. */
  profileOk: boolean | null;
  /** When status is "duplicate": the product that already uses this link. */
  duplicateOf: string | null;
}

/**
 * Opens the pasted affiliate link (read-only, like the save step already does)
 * and says whether it leads to the product of the row — so a wrong link is
 * caught before it is saved (the sofa case, 2026-09-22).
 */
export async function checkPanelLink(input: {
  panelTitle: string;
  productUrl?: string;
  affiliateUrl: string;
}): Promise<PanelLinkCheck> {
  const base = {
    panelTitle: input.panelTitle,
    linkTitle: null,
    profileOk: null,
    duplicateOf: null,
  } as const;

  let url: URL;
  try {
    url = new URL(input.affiliateUrl);
  } catch {
    return { ...base, status: "invalid", message: "Isso não parece um link." };
  }
  if (!MELI_HOSTS.test(url.hostname)) {
    return {
      ...base,
      status: "invalid",
      message:
        "Esse link não é do Mercado Livre. Cole o link gerado no Linkbuilder (meli.la/… ou mercadolivre.com/sec/…).",
    };
  }

  const taken = await prisma.affiliateLinkRegistry.findFirst({
    where: { affiliateUrl: input.affiliateUrl, status: "ACTIVE" },
    select: {
      merchantListing: {
        select: { canonicalProduct: { select: { title: true } } },
      },
    },
  });
  if (taken) {
    const title =
      taken.merchantListing?.canonicalProduct?.title ?? "outro produto";
    return {
      ...base,
      status: "duplicate",
      duplicateOf: title,
      message: `Esse link já está salvo em outro produto: ${title}. Gere o link deste produto no Linkbuilder.`,
    };
  }

  let finalUrl = input.affiliateUrl;
  let html = "";
  try {
    const response = await fetch(input.affiliateUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      },
      signal: AbortSignal.timeout(20000),
    });
    finalUrl = response.url || finalUrl;
    if (response.ok) html = await response.text();
  } catch {
    // handled below as "unknown"
  }

  const linkTitle = html ? pageTitleFromHtml(html) : null;
  const resolvedCatalogId = extractCatalogProductId(
    `${safeDecode(finalUrl)} ${html}`,
  );
  const expected = expectedIdsFromProductUrl(input.productUrl);
  const similarity = linkTitle
    ? titleSimilarity(input.panelTitle, linkTitle)
    : null;
  const status = decideVerdict({
    expectedCatalogId: expected.catalogId,
    resolvedCatalogId,
    similarity,
  });
  // Only judge the profile when the link was really opened (redirected or read).
  const profileOk =
    html || finalUrl !== input.affiliateUrl
      ? carriesOwnerProfile(`${finalUrl} ${html}`)
      : null;

  const messages: Record<LinkCheckVerdict, string> = {
    match: "Confere: o link leva ao mesmo produto desta linha.",
    likely:
      "Provavelmente é o mesmo produto (o título bate). Compare os dois nomes abaixo antes de salvar.",
    mismatch:
      "ATENÇÃO: o link leva a OUTRO produto. Não salve; gere o link de novo pelo endereço desta linha.",
    unknown:
      "Não consegui ler o produto do link. Compare com o Mercado Livre antes de salvar.",
  };
  return {
    ...base,
    status,
    message: messages[status],
    linkTitle,
    profileOk,
  };
}
