import { amazonDisclosure } from "@/lib/amazon/disclosure";

/**
 * Renders the mandatory Amazon Associates disclosure near affiliate
 * content — never only in the footer or a separate page (project brief
 * section 46). Compact by default; pass `full` for the expanded wording used
 * on /transparencia, or `prominent` for a full-size boxed statement at the
 * top of a page whose main purpose is Amazon links (Amazon requires the
 * statement to be "clara e destacada").
 */
export function AffiliateDisclosure({
  full = false,
  prominent = false,
}: {
  full?: boolean;
  prominent?: boolean;
}) {
  if (prominent) {
    return (
      <p
        role="note"
        className="border-brand/40 bg-brand/5 text-foreground rounded-lg border px-4 py-3 text-sm leading-relaxed font-medium"
      >
        {amazonDisclosure}
      </p>
    );
  }
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
