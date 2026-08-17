import { getDisclosureText } from "@/lib/amazon/policy-guard";

/** Re-exported for components — keeps every import path going through the
 * policy guard so the disclosure text always comes from config. */
export const amazonDisclosure = getDisclosureText();
