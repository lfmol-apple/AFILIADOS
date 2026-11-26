import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBlackFridayPanel } from "@/lib/services/black-friday-2026";
import { BlackFridayFeedSimulator } from "@/components/black-friday-feed-simulator";

export const metadata: Metadata = {
  title: "Black Friday 2026 — prévia mobile — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("conferência final da experiência do
 * consumidor" — extends the earlier 3-screen mockup per "PRÉVIA MOBILE
 * OBRIGATÓRIA"): all 30 real campaign products, real creatives, real
 * prices, real pasted affiliateUrl as every "Comprar agora" href — no
 * image generated/edited, no Pixel event fired from this page (plain
 * anchors only), no spend, no campaign activated. Same admin
 * authentication as the rest of /admin — this exact production URL is
 * what's safe to open on a phone's Safari too, nothing iPhone-specific
 * needed beyond logging in once.
 */
export default async function BlackFridayPreviewPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const { rows, counters } = await loadBlackFridayPanel();
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
        <a href="/admin/black-friday-2026" className="text-brand underline">
          ← Black Friday 2026
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
