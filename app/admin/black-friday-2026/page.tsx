import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel } from "@/lib/services/black-friday-2026";
import { BlackFridayPanelRow } from "@/components/black-friday-panel-row";

export const metadata: Metadata = {
  title: "Black Friday 2026 — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BlackFriday2026Page() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, counters } = await loadBlackFridayPanel();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin" className="text-brand underline">
          ← Admin
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Black Friday 2026 — catálogo manual e independente
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        30 produtos escolhidos com o Henrique para a campanha de 27/11/2026.
        Catálogo totalmente separado da Vitrine Geral — nada aqui afeta os
        links, criativos ou o XML que ela já usa. Para cada linha: confira o
        link original, gere o link de afiliado no Linkbuilder oficial, cole
        aqui, teste o destino e só então marque como validado. O XML em{" "}
        <code>/catalogo/black-friday-2026.xml</code> só publica produtos
        validados.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <span className="rounded-full border px-3 py-1">{counters.total} produtos</span>
        <span className="rounded-full border px-3 py-1">{counters.pendingLink} aguardando link</span>
        <span className="rounded-full border px-3 py-1">{counters.linkPasted} colados, não confirmados</span>
        <span className="rounded-full border px-3 py-1">{counters.validated} validados</span>
        <span className="rounded-full border px-3 py-1 text-amber-700">{counters.divergent} com divergência</span>
        <span className="bg-brand/10 rounded-full border px-3 py-1 font-medium">{counters.xmlEligible} no XML</span>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <BlackFridayPanelRow
            key={row.id}
            id={row.id}
            slotNumber={row.slotNumber}
            name={row.name}
            brand={row.brand}
            advertisedPrice={Number(row.advertisedPrice)}
            currentPrice={row.currentPrice !== null ? Number(row.currentPrice) : null}
            mlUrlOriginal={row.mlUrlOriginal}
            affiliateUrl={row.affiliateUrl}
            status={row.status}
            reviewNote={row.reviewNote}
            candidates={row.candidates}
            selectedCreativeId={row.selectedCreativeId}
          />
        ))}
      </div>
    </div>
  );
}
