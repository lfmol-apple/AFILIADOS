import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel, BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";
import { BlackFridayPanelList } from "@/components/black-friday-panel-list";
import { CopyXmlUrlButton } from "@/components/copy-xml-url-button";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Black Friday Fim do Mundo — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO"): identical to /admin/black-friday-2026/page.tsx, pointed at
 * this campaign's own slug — reuses the exact same
 * BlackFridayPanelList/BlackFridayPanelRow components, never a
 * reimplementation. Fully independent data (separate campaign column),
 * never sharing a row with the first campaign.
 */
export default async function BlackFridayFimDoMundoPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, counters, surplusCreatives } = await loadBlackFridayPanel(BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN);
  const xmlUrl = `${siteConfig.url}/catalogo/black-friday-fim-do-mundo.xml`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin" className="text-brand underline">
          ← Admin
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Black Friday Fim do Mundo — catálogo manual e independente
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        15 produtos da segunda campanha, numerados de 01 a 15, preenchidos automaticamente com os links de
        referência originais. Catálogo totalmente separado da Vitrine Geral e da primeira campanha (Black Friday
        2026) — nada aqui afeta os links, criativos ou o XML de nenhuma delas. Para cada linha: confira o link
        original, gere o link de afiliado no Linkbuilder oficial com a etiqueta{" "}
        <strong>blackfridayfimdomundo</strong>, cole aqui, teste o destino e só então marque como validado.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border px-3 py-1">{counters.total} produtos</span>
        <span className="rounded-full border px-3 py-1">{counters.pendingLink} aguardando link</span>
        <span className="rounded-full border px-3 py-1">{counters.linkPasted} colados, não confirmados</span>
        <span className="rounded-full border px-3 py-1">{counters.validated} validados</span>
        <span className="rounded-full border px-3 py-1 text-amber-700">{counters.divergent} com divergência</span>
        <span className="rounded-full border px-3 py-1 text-red-700">{counters.missingCreative} sem criativo</span>
        <span className="rounded-full border px-3 py-1">{counters.disabled} desativados</span>
        <span className="bg-brand/10 rounded-full border px-3 py-1 font-medium">{counters.xmlEligible} no XML</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <a href="/catalogo/black-friday-fim-do-mundo.xml" target="_blank" rel="noopener" className="border-border-subtle rounded border px-2 py-1">
          Ver XML →
        </a>
        <CopyXmlUrlButton url={xmlUrl} />
        <a href="/admin/black-friday-fim-do-mundo/preview" className="border-border-subtle rounded border px-2 py-1">
          Prévia mobile →
        </a>
        <a href="/admin/black-friday-fim-do-mundo/galeria" className="border-border-subtle rounded border px-2 py-1">
          Conferência visual (galeria) →
        </a>
        <a href="/admin/black-friday-fim-do-mundo/lote" className="bg-brand text-brand-foreground rounded px-2 py-1 font-semibold">
          Cadastrar links em lote →
        </a>
      </div>

      <BlackFridayPanelList
        rows={rows.map((row) => ({
          id: row.id,
          slotNumber: row.slotNumber,
          name: row.name,
          brand: row.brand,
          advertisedPrice: row.advertisedPrice !== null ? Number(row.advertisedPrice) : null,
          currentPrice: row.currentPrice !== null ? Number(row.currentPrice) : null,
          mlUrlOriginal: row.mlUrlOriginal,
          resolvedProductUrl: row.resolvedProductUrl,
          resolvedExternalId: row.resolvedExternalId,
          affiliateUrl: row.affiliateUrl,
          status: row.status,
          reviewNote: row.reviewNote,
          candidates: row.candidates,
          selectedCreativeId: row.selectedCreativeId,
          enabled: row.enabled,
          destinationCheckedAt: row.destinationCheckedAt ? row.destinationCheckedAt.toISOString() : null,
        }))}
      />

      {surplusCreatives.length > 0 && (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-semibold">
            Criativos excedentes ({surplusCreatives.length}) — não correspondem a nenhum dos 15 produtos oficiais
          </h2>
          <p className="text-foreground/60 mt-1 text-xs">
            Preservados, nunca excluídos — apenas fora da seleção comercial desta campanha.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {surplusCreatives.map((c) => (
              <div key={c.id} className="w-20 text-center">
                <div className="relative h-20 w-20 overflow-hidden rounded border">
                  <Image src={c.storedPath} alt={c.originalFilename} fill sizes="80px" className="object-cover" />
                </div>
                <p className="text-foreground/50 mt-1 truncate text-[10px]">{c.groupKey}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
