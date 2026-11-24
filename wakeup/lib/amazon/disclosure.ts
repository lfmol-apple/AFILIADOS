import { getDisclosureText } from "@/lib/amazon/policy-guard";

/** Re-exported for components — keeps every import path going through the
 * policy guard so the disclosure text always comes from config. */
export const amazonDisclosure = getDisclosureText();

/** The statement Amazon Brasil's Operating Agreement requires, verbatim
 * (checked 2026-09-20 at associados.amazon.com.br/help/operating/agreement).
 * It must be displayed clearly and prominently wherever Program content
 * appears. Changing the wording of AMAZON_ASSOCIATE_DISCLOSURE away from
 * this text is a compliance regression, not a copy edit. */
export const AMAZON_REQUIRED_DISCLOSURE =
  "Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas.";

export function isDisclosureCompliant(
  text: string = amazonDisclosure,
): boolean {
  const normalize = (s: string) =>
    s.trim().replace(/\s+/g, " ").replace(/\.$/, "").toLowerCase();
  return normalize(text) === normalize(AMAZON_REQUIRED_DISCLOSURE);
}
