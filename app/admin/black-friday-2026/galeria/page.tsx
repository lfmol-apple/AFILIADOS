import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel, BLACK_FRIDAY_2026_CAMPAIGN, type BlackFridayPanelRow } from "@/lib/services/black-friday-2026";

export const metadata: Metadata = {
  title: "Black Friday 2026 — conferência visual — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function currency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type MatchStatus = "confirmado" | "divergente" | "sem criativo" | "aguardando escolha";

function matchStatus(row: BlackFridayPanelRow): MatchStatus {
  if (row.candidates.length === 0) return "sem criativo";
  if (row.candidates.length > 1) return "aguardando escolha";
  if (row.reviewNote) return "divergente";
  if (row.selectedCreativeId) return "confirmado";
  return "aguardando escolha";
}

const STATUS_STYLE: Record<MatchStatus, string> = {
  confirmado: "bg-green-100 text-green-800",
  divergente: "bg-red-100 text-red-800",
  "sem criativo": "bg-red-200 text-red-900",
  "aguardando escolha": "bg-amber-100 text-amber-800",
};

/**
 * Owner's directive, 2026-11-26 ("CONFERÊNCIA VISUAL COMPLETA"): a
 * read-only gallery, reusing loadBlackFridayPanel (the same data the
 * editable admin panel already uses) — no new architecture, no editing
 * controls here on purpose. Full, uncropped images (object-contain, no
 * fixed aspect-ratio crop) so nothing is cut off; side-by-side when a
 * product has 2 real creative candidates. Never generates, edits or
 * modifies any image — just lays out the same files already on disk.
 */
export default async function BlackFridayGaleriaPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, surplusCreatives } = await loadBlackFridayPanel(BLACK_FRIDAY_2026_CAMPAIGN);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/black-friday-2026" className="text-brand underline">
          ← Black Friday 2026 (painel)
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        Black Friday 2026 — conferência visual completa (01 a 30)
      </h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Galeria somente leitura — nenhuma imagem foi gerada, editada ou recortada. Confira cada associação antes de
        voltar ao <a href="/admin/black-friday-2026" className="text-brand underline">painel operacional</a> para
        colar os links de afiliado.
      </p>

      <div className="mt-8 space-y-10">
        {rows.map((row) => {
          const status = matchStatus(row);
          const link = row.resolvedProductUrl ?? row.mlUrlOriginal;
          return (
            <div key={row.id} className="border-border-subtle border-b pb-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {String(row.slotNumber).padStart(2, "0")}. {row.name}
                  {row.brand && <span className="text-foreground/50"> — {row.brand}</span>}
                </h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
                  {status}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>Preço anunciado: {currency(row.advertisedPrice !== null ? Number(row.advertisedPrice) : null)}</span>
                <span>Último preço consultado: {currency(row.currentPrice !== null ? Number(row.currentPrice) : null)}</span>
                {link && (
                  <a href={link} target="_blank" rel="noopener" className="text-brand underline">
                    Abrir produto original →
                  </a>
                )}
              </div>

              {row.reviewNote && (
                <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠ {row.reviewNote}</p>
              )}

              {row.candidates.length === 0 ? (
                <p className="mt-3 rounded bg-red-50 px-3 py-4 text-sm text-red-700">
                  Nenhum criativo correspondente recebido do Henrique para este produto.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-4">
                  {row.candidates.map((c) => (
                    <div key={c.id} className="w-full max-w-sm">
                      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded border">
                        <Image src={c.storedPath} alt={c.originalFilename} fill sizes="400px" className="object-contain" />
                      </div>
                      <p className="text-foreground/60 mt-1 text-center text-xs">
                        {c.originalFilename}
                        {c.id === row.selectedCreativeId && (
                          <span className="ml-1 font-semibold text-green-700">(selecionado)</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {surplusCreatives.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold">
            Criativos excedentes ({surplusCreatives.length}) — sem correspondência nos 30 links oficiais
          </h2>
          <div className="mt-4 flex flex-wrap gap-6">
            {surplusCreatives.map((c) => (
              <div key={c.id} className="w-full max-w-sm">
                <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded border">
                  <Image src={c.storedPath} alt={c.originalFilename} fill sizes="400px" className="object-contain" />
                </div>
                <p className="text-foreground/60 mt-1 text-center text-xs">{c.originalFilename}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
