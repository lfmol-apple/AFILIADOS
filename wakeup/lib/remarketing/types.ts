/**
 * A remarketing audience event PreçoCaindo could, in the future, forward to
 * an ad platform — never automatically, never without consent, never with
 * PAID_MEDIA enabled by default (project brief Part L).
 */
export interface RemarketingEvent {
  type: "PRODUCT_VIEW" | "PRICE_ALERT_CREATED" | "AFFILIATE_CLICK";
  subjectId: string;
  productId?: string;
  occurredAt: Date;
}

export interface RemarketingProvider {
  readonly name: string;
  track(event: RemarketingEvent): Promise<void>;
}
