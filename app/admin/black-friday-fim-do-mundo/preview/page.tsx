import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel, BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";
import { BlackFridayFeedSimulator } from "@/components/black-friday-feed-simulator";

export const metadata: Metadata = {
  title: "Black Friday Fim do Mundo — prévia mobile — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("Reutilize a prévia mobile da primeira
 * campanha"): identical to /admin/black-friday-2026/preview, reusing the
 * exact same BlackFridayFeedSimulator component, pointed at this
 * campaign's own 15 products.
 */
export default async function BlackFridayFimDoMundoPreviewPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, counters } = await loadBlackFridayPanel(BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN);
  const products = rows
    .filter((r) => r.selectedCreative && r.enabled)
    .map((r) => ({
      id: r.id,
      slotNumber: r.slotNumber,
      name: r.name,
      brand: r.brand,
      imagePath: r.selectedCreative!.storedPath,
      price: r.currentPrice !== null ? Number(r.currentPrice) : r.advertisedPrice !== null ? Number(r.advertisedPrice) : null,
      affiliateUrl: r.status === "VALIDATED" ? r.affiliateUrl : null,
    }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/black-friday-fim-do-mundo" className="text-brand underline">
          ← Black Friday Fim do Mundo
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Prévia mobile — experiência do consumidor</h1>
      <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        SIMULAÇÃO VISUAL — nenhum anúncio real foi publicado, nenhum gasto ou evento de Pixel foi gerado por esta
        página. A renderização definitiva deve ser conferida também na prévia oficial do Gerenciador de Anúncios da
        Meta.
      </p>
      <p className="text-foreground/60 mt-2 text-xs">
        {products.length} de {counters.total} produtos com criativo selecionado e validados exibem o botão de
        compra real; os demais aparecem com o botão desativado até serem validados no painel.
      </p>

      <div className="mt-6">
        <BlackFridayFeedSimulator products={products} />
      </div>
    </div>
  );
}
