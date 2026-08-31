import Link from "next/link";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { siteConfig } from "@/lib/config/site";

const LINKS = [
  { href: "/guias", label: "Guias" },
  { href: "/sobre", label: "Sobre" },
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/politica-editorial", label: "Política editorial" },
  { href: "/transparencia", label: "Transparência" },
  { href: "/contato", label: "Contato" },
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos" },
];

export function SiteFooter() {
  return (
    <footer className="border-border-subtle bg-surface-muted mt-16 border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="text-foreground/70 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="mt-6 max-w-2xl">
          <AffiliateDisclosure full />
        </div>
        <p className="text-foreground/40 mt-4 text-xs">
          © {new Date().getFullYear()} {siteConfig.name}. PreçoCaindo é um
          serviço editorial e de apoio à decisão de compra; a compra é sempre
          feita na loja parceira.
        </p>
      </div>
    </footer>
  );
}
