import { prisma } from "@/lib/db";
import { extractCatalogProductId } from "@/lib/services/ml-panel-register";
import {
  carriesOwnerProfile,
  decideVerdict,
  expectedIdsFromProductUrl,
  pageTitleFromHtml,
  titleJaccard,
  titleSimilarity,
  EXACT_TITLE_JACCARD,
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

export interface OpenedLink {
  finalUrl: string;
  /** Product title read from the page the link opens (null = unreadable). */
  title: string | null;
  /** Catalog product id (MLB…) the link leads to, when it can be read. */
  catalogId: string | null;
  /** Owner's affiliate tag visible? null = the link could not be opened. */
  profileOk: boolean | null;
}

/**
 * Opens a pasted affiliate link (read-only, the same thing saving already does)
 * and reads which product it leads to. Never throws.
 */
export async function openAffiliateLink(
  affiliateUrl: string,
): Promise<OpenedLink> {
  const cached = openedCache.get(affiliateUrl);
  if (cached && Date.now() - cached.at < OPENED_TTL_MS) return cached.value;
  const value = await fetchOpenedLink(affiliateUrl);
  // Only remember a link that was really read: an unreadable one may work next time.
  if (value.title || value.catalogId) {
    if (openedCache.size >= OPENED_MAX) {
      const oldest = openedCache.keys().next().value;
      if (oldest !== undefined) openedCache.delete(oldest);
    }
    openedCache.set(affiliateUrl, { at: Date.now(), value });
  }
  return value;
}

/**
 * The same link is opened by the batch check, by the save check and by the
 * registration; without this each save opened it 3 times (2-4 s wasted). Small
 * on purpose: only the derived fields are kept, never the page.
 */
const OPENED_TTL_MS = 10 * 60 * 1000;
const OPENED_MAX = 300;
const openedCache = new Map<string, { at: number; value: OpenedLink }>();

async function fetchOpenedLink(affiliateUrl: string): Promise<OpenedLink> {
  let finalUrl = affiliateUrl;
  let html = "";
  try {
    const response = await fetch(affiliateUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      },
      signal: AbortSignal.timeout(20000),
    });
    finalUrl = response.url || finalUrl;
    if (response.ok) html = await response.text();
  } catch {
    // unreadable: the caller treats it as "unknown"
  }
  return {
    finalUrl,
    title: html ? pageTitleFromHtml(html) : null,
    catalogId: extractCatalogProductId(`${safeDecode(finalUrl)} ${html}`),
    // Only judge the profile when the link was really opened (redirected or read).
    profileOk:
      html || finalUrl !== affiliateUrl
        ? carriesOwnerProfile(`${finalUrl} ${html}`)
        : null,
  };
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

  const opened = await openAffiliateLink(input.affiliateUrl);
  const linkTitle = opened.title;
  const expected = expectedIdsFromProductUrl(input.productUrl);
  const similarity = linkTitle
    ? titleSimilarity(input.panelTitle, linkTitle)
    : null;
  const status = decideVerdict({
    expectedCatalogId: expected.catalogId,
    resolvedCatalogId: opened.catalogId,
    similarity,
    exactTitle:
      !!linkTitle &&
      titleJaccard(input.panelTitle, linkTitle) >= EXACT_TITLE_JACCARD,
  });
  const profileOk = opened.profileOk;

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
