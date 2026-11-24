import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { NewMlProductsBatch } from "@/components/new-ml-products-batch";
import { loadNewMlProducts } from "@/lib/queries/new-ml-products";

export const metadata: Metadata = {
  title: "Produtos novos ML em lote — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function NewMlProductsBatchPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const products = await loadNewMlProducts();
  const addresses = products.map((p) => p.productUrl).slice(0, 40);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">
        Produtos novos ML em lote (até 30 de uma vez)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Gere vários links de uma vez no Linkbuilder e cole todos aqui. O
        sistema abre cada um, confere se é do produto certo (e da sua tag) e
        salva só os que conferem.{" "}
        <a
          href="/admin/produtos-novos-ml"
          className="text-brand underline underline-offset-2"
        >
          ← voltar à lista
        </a>
      </p>
      <div className="mt-5">
        <NewMlProductsBatch addresses={addresses} pendingCount={products.length} />
      </div>
    </div>
  );
}
