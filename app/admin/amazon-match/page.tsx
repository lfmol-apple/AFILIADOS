import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import {
  getNextAmazonMatchBatch,
  countPendingAmazonMatches,
} from "@/lib/queries/amazon-match-queue";
import { classifyOffer } from "@/lib/offers/categories";
import { AmazonMatchQueueClient } from "@/components/amazon-match-queue-client";

export const metadata: Metadata = {
  title: "Correspondência Amazon — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const BATCH_SIZE = 25;

export default async function AmazonMatchPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  const [batch, pendingTotal] = await Promise.all([
    getNextAmazonMatchBatch(BATCH_SIZE),
    countPendingAmazonMatches(),
  ]);

  const rows = batch.map((row) => ({
    ...row,
    suggestedCategorySlug: classifyOffer({ title: row.title }),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Correspondência Amazon</h1>
          <p className="text-foreground/60 mt-1 text-sm">
            Todo anúncio ML/Shopee ativo, com ou sem clique — pra cada um,
            busque na Amazon e confirme se existe o mesmo produto. Nunca
            pergunta de novo sobre um já revisado.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      <p className="text-foreground/50 mt-4 text-sm">
        {pendingTotal} aguardando revisão · mostrando {rows.length} agora.
      </p>

      <AmazonMatchQueueClient initialRows={rows} />
    </div>
  );
}
