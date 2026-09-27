/**
 * Pure: turns a pageview's (pageType, pageSlug) — as every AnalyticsBeacon
 * call site sets them, see app/**\/page.tsx — into a short human label and
 * the real path to open, for the owner's "site was accessed" push
 * (lib/push/send.ts). Unknown/new pageTypes degrade to a generic label and
 * the site root, never a broken link.
 */
export function describePageviewForOwner(
  pageType: string,
  pageSlug: string,
): { label: string; url: string } {
  switch (pageType) {
    case "home":
      return { label: "Página inicial", url: "/" };
    case "achados":
      return { label: "Achados", url: "/achados" };
    case "guides":
      return { label: "Lista de guias", url: "/guias" };
    case "guide":
      return { label: `Guia: ${pageSlug}`, url: `/guias/${pageSlug}` };
    case "category":
      return {
        label: `Categoria: ${pageSlug}`,
        url: `/categorias/${pageSlug}`,
      };
    case "product":
      return { label: `Produto: ${pageSlug}`, url: `/produto/${pageSlug}` };
    case "ofertas": {
      if (pageSlug.startsWith("busca:")) {
        const q = pageSlug.slice("busca:".length);
        return {
          label: `Busca: "${q}"`,
          url: `/ofertas?q=${encodeURIComponent(q)}`,
        };
      }
      if (pageSlug.startsWith("ofertas:")) {
        const category = pageSlug.slice("ofertas:".length);
        return {
          label: `Ofertas: ${category}`,
          url: `/ofertas?categoria=${encodeURIComponent(category)}`,
        };
      }
      return { label: "Ofertas", url: "/ofertas" };
    }
    default:
      return { label: pageType, url: "/" };
  }
}
