import Link from "next/link";

/**
 * Owner's correction, 2026-11-22 ("ajuste importante na Etapa 3— o
 * cabeçalho da página pública deve ser neutro, sem destaque para a
 * marca PreçoCaindo, mantendo identificação discreta e transparente do
 * responsável. Não deve simular ser uma página oficial do Mercado
 * Livre."). Deliberately replaces components/breadcrumbs.tsx on this
 * one page — a breadcrumb trail ("Início → Vitrine") frames the visit
 * as "browsing the PreçoCaindo site", which is the opposite of the
 * neutral, transactional landing a paid ad click should feel like.
 * This is the one thing this page shows instead: a single small,
 * honest, text-only line — never a logo, never site navigation.
 *
 * The global site header/footer (app/layout.tsx) is NOT removed —
 * owner's explicit rule this same message: "preserve a estrutura
 * existente... sem abrir outra frente de desenvolvimento." Restructuring
 * the app into multiple Next.js root layouts just to suppress it
 * site-wide for this one route would be exactly that kind of new front;
 * this component is the surgical alternative within this page's own
 * content area.
 */
export function VitrineNeutralHeader() {
  return (
    <p className="text-foreground/50 text-xs">
      Seleção comercial mantida por{" "}
      <Link href="/sobre" className="underline">
        PreçoCaindo
      </Link>
      . Preços e disponibilidade reais no Mercado Livre.
    </p>
  );
}
