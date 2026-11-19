import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const GROUP_LABEL: Record<string, string> = {
  sazonal: "Sazonal",
  recorrente: "Campeão recorrente",
  emergente: "Emergente",
};

export default async function VitrineInteligentePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const [active, reserve, withLink] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
      orderBy: { score: "desc" },
      include: {
        merchantListing: {
          select: {
            canonicalProduct: { select: { title: true } },
            vitrineLink: { select: { status: true } },
          },
        },
      },
    }),
    prisma.vitrineSelection.count({ where: { status: "RESERVE" } }),
    prisma.vitrineLink.count({ where: { status: "ACTIVE" } }),
  ]);

  const pendingLink = active.filter(
    (a) => a.merchantListing.vitrineLink?.status !== "ACTIVE",
  ).length;
  const lastRun = await prisma.automationRun.findFirst({
    where: { job: "VITRINE_RENEW" },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin" className="text-brand underline">
          ← Admin
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Vitrine Inteligente</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Fase 1 (esqueleto): seleção reaproveita a mesma pontuação de
        monetização que o ciclo real de descoberta ML já calcula — ainda não
        existe motor sazonal (grupo &quot;sazonal&quot; fica em 0 até a Fase
        2). Catálogo e redirecionamento usam a etiqueta{" "}
        <strong>vitrinedinamica</strong>, separada do link do site.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ativos" value={active.length} />
        <Stat label="Com link gerado" value={withLink} />
        <Stat label="Pendentes de link" value={pendingLink} />
        <Stat label="Em reserva" value={reserve} />
      </div>

      <p className="text-foreground/60 mt-4 text-xs">
        Última renovação:{" "}
        {lastRun
          ? `${lastRun.startedAt.toLocaleString("pt-BR")} — ${lastRun.status}`
          : "ainda não rodou"}
      </p>

      <p className="mt-4">
        <a
          href="/admin/vitrine-links"
          className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Gerar links pendentes ({pendingLink}) →
        </a>
      </p>

      <p className="mt-3 text-sm">
        Catálogo Meta:{" "}
        <a
          href="/catalogo/mercado-livre.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline"
        >
          /catalogo/mercado-livre.xml
        </a>
      </p>

      <h2 className="mt-8 text-lg font-semibold">Produtos ativos</h2>
      <ul className="mt-3 space-y-2">
        {active.map((row) => (
          <li
            key={row.id}
            className="border-border-subtle rounded-lg border p-3 text-sm"
          >
            <p className="font-medium">
              {row.merchantListing.canonicalProduct?.title ?? "(sem título)"}
            </p>
            <p className="text-foreground/60 mt-1 text-xs">
              {GROUP_LABEL[row.groupType] ?? row.groupType} · score{" "}
              {Math.round(row.score)} · {row.reason}
              {row.merchantListing.vitrineLink?.status === "ACTIVE"
                ? " · link ok"
                : " · sem link ainda"}
            </p>
          </li>
        ))}
      </ul>
      {active.length === 0 && (
        <p className="text-foreground/60 mt-3 text-sm">
          Nenhum produto ativo ainda — rode o job VITRINE_RENEW.
        </p>
      )}
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
