import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { NewMlProductRow } from "@/components/new-ml-product-row";
import { loadNewMlProducts } from "@/lib/queries/new-ml-products";

export const metadata: Metadata = {
  title: "Produtos novos do backlog ML — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * The ~91 real products confirmed live (2026-11-14) inside the
 * pre-2026-09-24 ML backlog that have never been linked or matched under
 * any listing — see lib/queries/new-ml-products.ts's own doc comment for
 * how that number was verified. Separate from /admin/fila-links (which
 * reads the owner's own pasted panel picks): these already have real
 * title/image in our own database, so there's nothing to paste except
 * the generated affiliate link itself.
 */
export default async function NewMlProductsPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const products = await loadNewMlProducts();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Produtos novos do backlog (Mercado Livre)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Estes já têm título e foto reais no nosso banco — nunca tiveram link
        gerado. Abra o produto, gere o link no Linkbuilder, cole de volta. A
        linha some da lista assim que salvar.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {products.length} aguardando link.
      </p>

      {products.length === 0 ? (
        <p className="text-foreground/60 mt-8 text-sm">
          Nada pendente aqui agora.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {products.map((p) => (
            <NewMlProductRow
              key={p.merchantListingId}
              merchantListingId={p.merchantListingId}
              title={p.title}
              imageUrl={p.imageUrl}
              productUrl={p.productUrl}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
