import { amazonDisclosure } from "@/lib/amazon/disclosure";

/**
 * Renders the mandatory Amazon Associates disclosure near affiliate
 * content — never only in the footer or a separate page (project brief
 * section 46). Compact by default; pass `full` for the expanded wording used
 * on /transparencia.
 */
export function AffiliateDisclosure({ full = false }: { full?: boolean }) {
  return (
    <p className="text-foreground/60 text-xs">
      <span className="text-foreground/70 font-medium">
        Publicidade / link de afiliado.
      </span>{" "}
      {amazonDisclosure}
      {full &&
        " Isso não altera o preço que você paga. Preços e disponibilidade podem mudar."}
    </p>
  );
}
