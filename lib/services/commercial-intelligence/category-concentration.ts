/**
 * Owner's finding, 2026-11-20 ("Auditoria Contínua", section 4): "dois
 * kits de halteres e dois presépios ocupam vagas próximas, apesar de
 * disputarem intenções de compra semelhantes" — brand+model dedup
 * (vitrine-selection.ts's buildCommercialCandidatePool) never catches
 * this, because it's two DIFFERENT real products (different brand/model),
 * just the same real Mercado Livre category competing for the same
 * purchase intent. A pure, generic, testable cap: picks winners in the
 * order given (already ranked), skipping (never discarding) any
 * candidate once its category already holds `maxPerCategory` picks,
 * backfilling from the skipped ones only if the target can't otherwise
 * be reached — diversity is a preference among already-good candidates,
 * never a reason to leave a slot empty.
 */
export function applyCategoryConcentrationCap<T>(
  rankedEligible: readonly T[],
  target: number,
  maxPerCategory: number,
  getCategoryId: (item: T) => string | null,
): { picked: T[]; deferredByConcentration: T[] } {
  const picked: T[] = [];
  const categoryCounts = new Map<string, number>();
  const deferredByConcentration: T[] = [];

  for (const item of rankedEligible) {
    if (picked.length >= target) break;
    const categoryId = getCategoryId(item);
    const count = categoryId ? categoryCounts.get(categoryId) ?? 0 : 0;
    if (categoryId && count >= maxPerCategory) {
      deferredByConcentration.push(item);
      continue;
    }
    picked.push(item);
    if (categoryId) categoryCounts.set(categoryId, count + 1);
  }

  if (picked.length < target && deferredByConcentration.length > 0) {
    const needed = target - picked.length;
    picked.push(...deferredByConcentration.splice(0, needed));
  }

  return { picked, deferredByConcentration };
}
