import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { LAB_METHODOLOGY_LABELS, type LabMethodology } from "@/lib/services/commercial-intelligence/lab/methodologies";

export const metadata: Metadata = {
  title: "Laboratório de Inteligência Comercial — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const METHODOLOGY_ORDER: LabMethodology[] = [
  "official_rank_only",
  "panel_recommended",
  "commission_current_only",
  "commission_only",
  "legacy_v2",
  "multifactor_v3",
];

export default async function LaboratorioPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const latestReferenceDate = await prisma.commercialSelectionSnapshot.findFirst({
    orderBy: { referenceDate: "desc" },
    select: { referenceDate: true },
  });

  const snapshots = latestReferenceDate
    ? await prisma.commercialSelectionSnapshot.findMany({
        where: { referenceDate: latestReferenceDate.referenceDate },
        include: { items: { orderBy: { rank: "asc" }, take: 10 } },
      })
    : [];

  const [pendingCheckpoints, resolvedCheckpoints, totalSnapshotRuns] = await Promise.all([
    prisma.commercialSelectionCheckpoint.count({ where: { completedAt: null } }),
    prisma.commercialSelectionCheckpoint.count({ where: { completedAt: { not: null } } }),
    prisma.commercialSelectionSnapshot.groupBy({ by: ["referenceDate"], _count: true }),
  ]);

  // Independent cross-methodology comparison — never the algorithm's own
  // score (owner's explicit rule): how many of each pair's top-30
  // actually overlap on the same real product.
  const byMethodology = new Map(snapshots.map((s) => [s.methodology as LabMethodology, s]));
  const v3Ids = new Set((byMethodology.get("multifactor_v3")?.items ?? []).map((i) => i.merchantListingId));
  const overlapWithV3: Record<string, number> = {};
  for (const m of METHODOLOGY_ORDER) {
    if (m === "multifactor_v3") continue;
    const items = byMethodology.get(m)?.items ?? [];
    overlapWithV3[m] = items.filter((i) => v3Ids.has(i.merchantListingId)).length;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin" className="text-brand underline">
          ← Admin
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Laboratório de Inteligência Comercial</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Compara 4 metodologias no MESMO universo real de candidatos, na
        mesma data de referência: ranking oficial de vendas isolado,
        maior comissão potencial em reais isolada, o algoritmo anterior
        às correções (congelado) e a inteligência multifatorial atual.
        Nunca usa a própria pontuação do algoritmo como prova de
        superioridade — a comparação abaixo é estrutural (sobreposição,
        descoberta), e a avaliação de RESULTADO real é prospectiva (ver
        checkpoints abaixo).
      </p>

      <div className="mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-bold">⚠️ Sem histórico suficiente para teste retrospectivo.</p>
        <p className="mt-1">
          A descoberta real (rank history, trend history) começou a ser
          persistida hoje (2026-11-19) — não existem dados de semanas
          anteriores para comparar sem usar informação futura. Por isso
          este laboratório iniciou um acompanhamento PROSPECTIVO: cada
          seleção gera checkpoints reais em +7, +15, +30, +60 e +90 dias,
          que só são resolvidos quando a data realmente chega — nunca
          antes, nunca com dado inventado.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Execuções de comparação" value={totalSnapshotRuns.length} />
        <Stat label="Checkpoints pendentes" value={pendingCheckpoints} />
        <Stat label="Checkpoints resolvidos" value={resolvedCheckpoints} />
        <Stat
          label="Universo de candidatos"
          value={snapshots[0]?.candidateUniverseSize ?? 0}
        />
      </div>

      {snapshots.length === 0 ? (
        <p className="text-foreground/60 mt-6 text-sm">
          Nenhuma comparação rodou ainda — execute jobs/commercial-lab-run.ts.
        </p>
      ) : (
        <>
          <p className="text-foreground/60 mt-4 text-xs">
            Data de referência: {latestReferenceDate?.referenceDate.toLocaleString("pt-BR")}
          </p>

          <h2 className="mt-6 text-lg font-semibold">Sobreposição com a metodologia atual</h2>
          <p className="text-foreground/70 mt-1 text-sm">
            Dos 30 produtos de cada metodologia, quantos também aparecem
            no top-30 da inteligência multifatorial — uma métrica
            independente (contagem real, não pontuação de ninguém).
          </p>
          <ul className="mt-2 space-y-1">
            {Object.entries(overlapWithV3).map(([m, count]) => (
              <li key={m} className="text-sm">
                <strong>{LAB_METHODOLOGY_LABELS[m as LabMethodology]}:</strong> {count}/30 produtos em comum com a
                multifatorial
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-semibold">As 4 metodologias, lado a lado</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {METHODOLOGY_ORDER.map((m) => {
              const snapshot = byMethodology.get(m);
              if (!snapshot) return null;
              return (
                <div key={m} className="border-border-subtle rounded-lg border p-3">
                  <h3 className="text-sm font-semibold">{LAB_METHODOLOGY_LABELS[m]}</h3>
                  <p className="text-foreground/60 mt-1 text-xs">
                    {snapshot.items.length > 0 ? "amostra (top 10 de " : "0 de "}
                    {snapshot.candidateUniverseSize} candidatos avaliados
                    {snapshot.discoveredNewCandidates !== null &&
                      ` · ${snapshot.discoveredNewCandidates} achados pela descoberta ampliada de hoje`}
                  </p>
                  {snapshot.notes && <p className="text-foreground/50 mt-1 text-xs italic">{snapshot.notes}</p>}
                  <ol className="mt-2 space-y-1 text-xs">
                    {snapshot.items.map((item) => (
                      <li key={item.id}>
                        {item.rank}. {item.title.slice(0, 60)}
                        {item.scoreAtSelection != null && ` — ${Math.round(item.scoreAtSelection * 100) / 100}`}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="text-foreground/50 mt-8 text-xs">
        Limitações conhecidas: &quot;algoritmo anterior&quot; é re-aplicado sobre o
        pool já filtrado hoje, não uma consulta histórica independente
        idêntica à execução real de ontem. &quot;Comissão só&quot; e &quot;ranking só&quot;
        não têm mecanismo de descoberta próprio — herdam o que a
        descoberta real já trouxe para o pool. Tamanho de amostra: 1
        execução até agora (hoje) — grau de confiança estatístico ainda
        baixo; mais execuções ao longo do tempo aumentam a base
        comparável.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border-subtle rounded-lg border p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-foreground/60 text-xs">{label}</p>
    </div>
  );
}
