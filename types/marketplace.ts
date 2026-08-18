/**
 * Marketplace as a first-class concept — "Amazon" alone never implies
 * Amazon Brazil. Structurally compatible with Prisma's `Marketplace` enum
 * (AutomationRun.marketplace) so values pass between the two without
 * conversion.
 */
export type MarketplaceCode = "BR" | "US";
