import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { TrendingTermRow } from "@/components/trending-term-row";
import { loadTrendingTerms } from "@/lib/queries/ml-trending-terms";

export const metadata: Metadata = {
  title: "Termos em alta no ML — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * "Pegar carona" na própria demanda real do Mercado Livre (owner's brief,
 * 2026-11-15): lib/providers/mercado-livre-provider.ts's getTrends() é a
 * API oficial e pública do ML de termos mais buscados agora — um sinal de
 * demanda genuíno e externo à nossa base, diferente da varredura manual
 * categoria-por-categoria do painel. Achar o produto exato pro termo
 * continua manual (a busca por palavra-chave do ML está bloqueada mesmo
 * autenticada — ver doc comment de getTrends()); esta página só acelera
 * essa etapa ao máximo: copiar o termo e colar o link de volta, nada mais.
 */
export default async function TrendingTermsPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const terms = await loadTrendingTerms();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Termos em alta no Mercado Livre</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Os termos mais buscados agora em todo o Mercado Livre — demanda real,
        não a categoria que calhou de estar na sua vez. Copie o termo, busque
        no Linkbuilder, cole o link gerado de volta: o produto é cadastrado na
        hora, com título e foto reais.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {terms.length} termo(s) em alta ainda não aproveitado(s).
      </p>

      {terms.length === 0 ? (
        <p className="text-foreground/60 mt-8 text-sm">
          Nada pendente aqui agora.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {terms.map((t) => (
            <TrendingTermRow key={t.keyword} keyword={t.keyword} url={t.url} />
          ))}
        </ul>
      )}
    </div>
  );
}
