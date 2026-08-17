import { env } from "./env";

export const siteConfig = {
  name: env.NEXT_PUBLIC_SITE_NAME,
  url: env.NEXT_PUBLIC_SITE_URL,
  description:
    "Descubra o que comprar e a hora certa de comprar. Compare preços, veja o histórico e saiba se agora é uma boa hora para comprar na Amazon.",
  locale: "pt-BR",
} as const;

export const featureFlags = {
  autoPublish: env.AUTO_PUBLISH,
  priceAlerts: env.PRICE_ALERTS,
  paidMedia: env.PAID_MEDIA,
} as const;
