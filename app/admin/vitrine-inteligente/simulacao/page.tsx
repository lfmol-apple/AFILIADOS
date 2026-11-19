import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — simulação — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function VitrineSimulacaoPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const selections = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE" },
    orderBy: { score: "desc" },
    take: 6,
    include: {
      merchantListing: {
        select: {
          canonicalProduct: { select: { publicSlug: true } },
          vitrineLink: { select: { status: true } },
        },
      },
    },
  });

  const cards = (
    await Promise.all(
      selections.map(async (s) => {
        if (s.merchantListing.vitrineLink?.status !== "ACTIVE") return null;
        const slug = s.merchantListing.canonicalProduct?.publicSlug;
        const product = slug ? await loadPublicMerchantProduct(slug).catch(() => null) : null;
        if (!product || product.currentPrice === null) return null;
        return {
          merchantListingId: s.merchantListingId,
          title: product.title,
          price: product.currentPrice,
        };
      }),
    )
  ).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>

      <div className="mt-4 rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-bold">⚠️ SIMULAÇÃO — não é o formato homologado pela Meta.</p>
        <p className="mt-1">
          Esta tela é uma recriação aproximada de como um post de catálogo
          costuma aparecer no feed, só pra dar uma ideia visual com dados
          reais. O anúncio de verdade — moldura, selo de desconto, layout —
          só existe depois que a campanha for configurada de fato no Ads
          Manager/Commerce Manager da Meta (ver nota no painel principal
          sobre o recurso nativo de moldura + selo de preço). Nada aqui
          passou pela revisão de anúncios da Meta.
        </p>
      </div>

      <h1 className="mt-4 text-xl font-semibold">Como pode aparecer no feed</h1>

      <div className="mt-4 space-y-6">
        {cards.map((card) => (
          <div key={card.merchantListingId} className="rounded-xl border border-border-subtle bg-surface">
            <div className="flex items-center gap-2 p-3">
              <div className="h-8 w-8 rounded-full bg-brand" />
              <div>
                <p className="text-sm font-semibold">PreçoCaindo</p>
                <p className="text-foreground/50 text-xs">Patrocinado · Vitrine Inteligente</p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/vitrine/creative/${card.merchantListingId}`}
              alt=""
              className="aspect-square w-full object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-medium">{card.title.slice(0, 70)}</p>
              <p className="text-brand mt-1 text-lg font-bold">{brl(card.price)}</p>
              <p className="text-foreground/50 mt-1 text-xs">precocaindo.com.br</p>
            </div>
            <div className="flex justify-between border-t border-border-subtle p-2 text-xs text-foreground/60">
              <span>👍 Curtir</span>
              <span>💬 Comentar</span>
              <span>↗ Compartilhar</span>
            </div>
          </div>
        ))}
      </div>
      {cards.length === 0 && (
        <p className="text-foreground/60 mt-6 text-sm">
          Nenhum produto com link ativo ainda pra simular.
        </p>
      )}
    </div>
  );
}
