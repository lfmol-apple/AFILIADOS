# Remarketing

## Status: architecturally ready, nothing active

`PAID_MEDIA=false` and stays that way until explicitly revisited (project brief section 62/Part
L). No pixel — Google Ads, Meta, or otherwise — is loaded anywhere in this codebase. No audience
is built. No data leaves PreçoCaindo.

## The abstraction (`lib/remarketing/`)

```ts
interface RemarketingProvider {
  readonly name: string;
  track(event: RemarketingEvent): Promise<void>;
}
```

`getRemarketingProvider()` always returns `NoopRemarketingProvider` today — a provider whose
`track()` does nothing. This exists so that, later, a call site like "notify remarketing when a
product page is viewed" can be written once, against the interface, without waiting for a real
provider to exist. Implementing `GoogleAdsRemarketingProvider` or `MetaRemarketingProvider` later
means writing a new class, not retrofitting call sites.

## What activating a real provider will require (not built yet)

1. `PAID_MEDIA=true` explicitly set — this alone should never happen without a deliberate
   decision, not a default.
2. Per-event **MARKETING** consent (`ConsentRecord.marketing === "GRANTED"`) checked before
   `track()` is ever called for that visitor — consent is the gate, not an afterthought.
3. A real review of Amazon's policies on paid traffic pointed at Amazon links (project brief
   section 62 flags this as high-risk, especially after 2026 policy changes) — this is unrelated
   to remarketing itself but sits right next to it operationally, so it's called out here too.

## First-party remarketing comes first

Before any third-party ad platform, the plan (project brief Part O) is PreçoCaindo's own
relationship with a returning visitor: price alerts (`lib/services/price-alert.ts`,
docs/PRIVACY.md), and — later — a newsletter/opportunity digest. All opt-in, all routed through
PreçoCaindo itself:

```
mensagem → PreçoCaindo → usuário visualiza → clique consciente → Amazon
```

Never an Amazon Special Link embedded directly in an email or offline material where that isn't
permitted — see docs/AMAZON_COMPLIANCE.md.
