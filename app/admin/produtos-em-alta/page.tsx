import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { DiscoveryProductRow } from "@/components/discovery-product-row";
import { loadHighlightCandidates } from "@/lib/queries/ml-highlight-candidates";

export const metadata: Metadata = {
  title: "Produtos em alta no ML — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Real Mercado Livre demand (Highlights API — see lib/queries/
 * ml-highlight-candidates.ts's doc comment for why this replaced the
 * keyword-trends approach) brought straight into the link queue: the
 * owner only needs to generate the affiliate link and paste it back.
 * Nothing here is ever written to the database until that paste happens.
 */
export default async function DiscoveryProductsPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const products = await loadHighlightCandidates(30);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Produtos em alta no Mercado Livre</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Produtos reais em alta agora (API oficial de destaques do próprio
        ML, por categoria) que ainda não têm link no site. Abra o produto,
        gere o link no Linkbuilder, cole de volta. A linha some da lista
        assim que salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {products.length} em alta agora.
      </p>
      <p className="mt-3">
        <a
          href="/admin/produtos-em-alta/lote"
          className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Gerar e colar em lote (até 30) →
        </a>
      </p>

      {products.length === 0 ? (
        <p className="text-foreground/60 mt-8 text-sm">
          Nada em alta pendente agora.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {products.map((p) => (
            <DiscoveryProductRow
              key={p.catalogProductId}
              catalogProductId={p.catalogProductId}
              title={p.title}
              productUrl={p.productUrl}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
