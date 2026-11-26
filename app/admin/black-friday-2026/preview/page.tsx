import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel } from "@/lib/services/black-friday-2026";

export const metadata: Metadata = {
  title: "Black Friday 2026 — prévia mobile — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function currency(value: number | null): string {
  if (value === null) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Owner's directive, 2026-11-26 (section 19, "PRÉVIA MOBILE OBRIGATÓRIA"):
 * a demonstrative, clearly-labeled-as-simulation mockup of the intended
 * consumer flow (Instagram/Facebook ad → Mercado Livre product → browsing
 * Mercado Livre), built from a REAL creative already on disk — no image is
 * generated, redrawn or composited for this page; it's plain HTML/CSS
 * chrome around the owner's own creative, same file byte-for-byte. Picks
 * whichever product already has a chosen creative (owner's own review
 * doesn't need to be finished for this to be useful) and clearly labels
 * every screen "SIMULAÇÃO" so it's never mistaken for a real published ad.
 */
export default async function BlackFridayPreviewPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows } = await loadBlackFridayPanel();
  const sample = rows.find((r) => r.selectedCreative) ?? rows.find((r) => r.candidates.length > 0);

  if (!sample) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <p className="text-sm">
          <a href="/admin/black-friday-2026" className="text-brand underline">
            ← Black Friday 2026
          </a>
        </p>
        <p className="mt-4 text-sm">Nenhum produto com criativo disponível ainda para montar a prévia.</p>
      </div>
    );
  }

  const imagePath = sample.selectedCreative?.storedPath ?? sample.candidates[0]!.storedPath;
  const price = sample.currentPrice !== null ? Number(sample.currentPrice) : sample.advertisedPrice !== null ? Number(sample.advertisedPrice) : null;
  const destination = sample.resolvedProductUrl ?? sample.mlUrlOriginal ?? "https://www.mercadolivre.com.br/...";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/black-friday-2026" className="text-brand underline">
          ← Black Friday 2026
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Prévia mobile — experiência do consumidor</h1>
      <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        SIMULAÇÃO — nenhum anúncio real foi publicado. Produto de exemplo: {sample.name} (#{String(sample.slotNumber).padStart(2, "0")}).
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {/* Tela 1 — Instagram/Facebook */}
        <div>
          <p className="mb-2 text-center text-xs font-semibold">Tela 1 — Instagram/Facebook</p>
          <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-4 border-black bg-white shadow-lg">
            <div className="flex items-center gap-2 border-b p-2 text-xs">
              <div className="h-6 w-6 rounded-full bg-gray-300" />
              <div>
                <p className="font-semibold">precocaindo</p>
                <p className="text-foreground/50">Patrocinado</p>
              </div>
            </div>
            <div className="relative aspect-square w-full">
              <Image src={imagePath} alt={sample.name} fill sizes="300px" className="object-cover" />
            </div>
            <div className="space-y-2 p-2 text-xs">
              <p className="font-semibold">{sample.name}</p>
              {price !== null && <p>{currency(price)}</p>}
              <div className="bg-brand text-brand-foreground rounded py-1.5 text-center font-semibold">
                Comprar agora
              </div>
            </div>
          </div>
        </div>

        {/* Tela 2 — Mercado Livre */}
        <div>
          <p className="mb-2 text-center text-xs font-semibold">Tela 2 — Mercado Livre (destino)</p>
          <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-4 border-black bg-white shadow-lg">
            <div className="bg-yellow-400 p-2 text-center text-xs font-bold text-blue-900">mercado livre</div>
            <div className="relative aspect-square w-full">
              <Image src={imagePath} alt={sample.name} fill sizes="300px" className="object-contain" />
            </div>
            <div className="space-y-1 p-2 text-xs">
              <p className="font-semibold">{sample.name}</p>
              {price !== null && <p className="text-lg font-bold">{currency(price)}</p>}
              <p className="text-foreground/50 truncate">{destination}</p>
              <div className="rounded bg-blue-600 py-1.5 text-center font-semibold text-white">Comprar</div>
              <p className="text-foreground/40 text-[10px]">
                Link de afiliado preservado — comissão atribuída ao clique original.
              </p>
            </div>
          </div>
        </div>

        {/* Tela 3 — navegação livre no ML */}
        <div>
          <p className="mb-2 text-center text-xs font-semibold">Tela 3 — navegando no Mercado Livre</p>
          <div className="mx-auto w-full max-w-[300px] rounded-[2rem] border-4 border-black bg-white shadow-lg">
            <div className="bg-yellow-400 p-2 text-center text-xs font-bold text-blue-900">mercado livre</div>
            <div className="grid grid-cols-2 gap-1 p-2">
              <div className="relative aspect-square overflow-hidden rounded border">
                <Image src={imagePath} alt={sample.name} fill sizes="140px" className="object-cover" />
              </div>
              {rows
                .filter((r) => r.id !== sample.id && (r.selectedCreative || r.candidates[0]))
                .slice(0, 3)
                .map((r) => (
                  <div key={r.id} className="relative aspect-square overflow-hidden rounded border">
                    <Image
                      src={(r.selectedCreative ?? r.candidates[0])!.storedPath}
                      alt={r.name}
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                  </div>
                ))}
            </div>
            <p className="text-foreground/50 p-2 text-[10px]">
              O consumidor pode pesquisar e comprar outros produtos livremente — nenhuma navegação é forçada pelo
              PreçoCaindo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
