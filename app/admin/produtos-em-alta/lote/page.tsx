import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { MlDiscoveryBatch } from "@/components/ml-discovery-batch";
import { loadHighlightCandidates } from "@/lib/queries/ml-highlight-candidates";

export const metadata: Metadata = {
  title: "Produtos em alta ML em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function DiscoveryProductsBatchPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const products = await loadHighlightCandidates(30);
  const addresses = products.map((p) => p.productUrl);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Produtos em alta no ML em lote (até 30 de uma vez)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gere vários links de uma vez no Linkbuilder e cole todos aqui. O
        sistema abre cada um, confere se é do produto certo (e da sua tag) e
        cadastra só os que conferem.{" "}
        <a
          href="/admin/produtos-em-alta"
          className="text-brand underline underline-offset-2"
        >
          ← voltar à lista
        </a>
      </p>
      <div className="mt-5">
        <MlDiscoveryBatch addresses={addresses} pendingCount={products.length} />
      </div>
    </div>
  );
}
