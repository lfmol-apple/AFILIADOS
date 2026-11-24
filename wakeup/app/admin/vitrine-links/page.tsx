import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { PanelPickRow } from "@/components/panel-pick-row";
import { loadVitrineLinkQueue } from "@/lib/services/vitrine-link-queue";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — links — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const GROUP_LABEL: Record<string, string> = {
  sazonal: "Sazonal",
  recorrente: "Campeão recorrente",
  emergente: "Emergente",
};

export default async function VitrineLinksPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { pending, activeCount, linkedCount } = await loadVitrineLinkQueue();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Vitrine Inteligente — gerar links (etiqueta vitrinedinamica)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Produtos que a inteligência já selecionou pra Vitrine e que ainda não
        têm o link próprio dela. Mesmo passo de sempre — copiar endereço,
        gerar no Linkbuilder, colar — só que a etiqueta aqui é{" "}
        <strong>vitrinedinamica</strong>, nunca precocaindo. O link do site
        (precocaindo) deste mesmo produto, se existir, não é afetado.
      </p>
      <p className="text-foreground/60 mt-2 text-sm">
        {pending.length} aguardando link vitrinedinamica · {linkedCount} de{" "}
        {activeCount} produtos ativos já têm link.
      </p>
      {pending.length > 0 && (
        <p className="mt-3">
          <a
            href="/admin/vitrine-links/lote"
            className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Gerar e colar em lote →
          </a>
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {pending.map((row, i) => (
          <PanelPickRow
            key={row.merchantListingId}
            position={i + 1}
            id={row.merchantListingId}
            title={row.title}
            repeated={false}
            rateLabel={GROUP_LABEL[row.groupType] ?? row.groupType}
            extras={false}
            earningLabel={`score ${Math.round(row.score)}`}
            soldLabel={row.reason}
            priceLabel=""
            notes={[]}
            recommended
            productUrl={row.productUrl}
            apiBase="/api/admin/vitrine-links"
            tagLabel="vitrinedinamica"
          />
        ))}
      </ul>
      {pending.length === 0 && (
        <p className="text-foreground/60 mt-6 text-sm">
          Nada pendente agora — todos os produtos ativos da Vitrine já têm
          link próprio.
        </p>
      )}
    </div>
  );
}
