import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { CommissionPriorityRow } from "@/components/commission-priority-row";
import { buildCommissionPriorityQueue, TIER_LABEL } from "@/lib/services/vitrine-commission-priority";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — comissões — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function evidenceLabel(ev: { type: string; rate: number | null; stale: boolean }): string {
  if (ev.type === "unknown") return "Sem evidência de comissão nenhuma — prioridade alta.";
  if (ev.type === "category_tier") return "Só estimativa por categoria (não é o anúncio real) — prioridade alta.";
  if (ev.stale || ev.type === "historical") return "Comissão observada, mas desatualizada (+45 dias) — prioridade alta.";
  if (ev.type === "promotional_temporary") return "Comissão extra temporária — pode ter expirado, vale reconferir.";
  return `Comissão real observada: ${ev.rate !== null ? Math.round(ev.rate * 100) : "?"}% — ainda fresca.`;
}

export default async function VitrineComissoesPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const rows = await buildCommissionPriorityQueue();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Vitrine Inteligente — fila de comissões</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        O Mercado Livre não tem API de comissão — o único jeito real de saber a
        taxa de um anúncio é ler no seu próprio painel de afiliados
        (Produtos selecionados, por categoria). Esta fila não pede pra
        conferir os mais de 73 mil anúncios do site: é só esta lista curta,
        na ordem de prioridade comercial real (ativo na Vitrine primeiro,
        depois quem entraria numa vaga, depois a reserva, depois achados
        novos com demanda comprovada), priorizando dentro de cada grupo quem
        está sem comissão ou com dado mais velho.
      </p>
      <ol className="mt-6 space-y-3">
        {rows.map((row, i) => (
          <CommissionPriorityRow
            key={row.merchantListingId}
            position={i + 1}
            merchantListingId={row.merchantListingId}
            externalId={row.externalId}
            title={row.title}
            tierLabel={TIER_LABEL[row.tier]}
            score={row.score}
            evidenceLabel={evidenceLabel(row.commissionEvidence)}
          />
        ))}
      </ol>
      {rows.length === 0 && (
        <p className="text-foreground/60 mt-6 text-sm">Nada na fila agora.</p>
      )}
    </div>
  );
}
