import { describe, expect, it, afterEach, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createPriceAlert,
  confirmPriceAlert,
  isConfirmed,
  cancelPriceAlert,
  validatePriceAlertInput,
} from "@/lib/services/price-alert";

let productId: string;

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: { slug: "__test-price-alert-category__" },
    create: { name: "Test Category", slug: "__test-price-alert-category__" },
    update: {},
  });
  const product = await prisma.product.upsert({
    where: { slug: "__test-price-alert-product__" },
    create: {
      asin: "TESTALERT01",
      slug: "__test-price-alert-product__",
      title: "Test Product for Price Alerts",
      categoryId: category.id,
    },
    update: {},
  });
  productId = product.id;
});

afterEach(async () => {
  await prisma.priceAlert.deleteMany({ where: { productId } });
});

afterAll(async () => {
  await prisma.product.deleteMany({
    where: { slug: "__test-price-alert-product__" },
  });
  await prisma.category.deleteMany({
    where: { slug: "__test-price-alert-category__" },
  });
});

describe("createPriceAlert", () => {
  it("validates contact and target price before persistence", () => {
    expect(
      validatePriceAlertInput({ contact: "user@example.com", targetPrice: 99 }),
    ).toEqual({ ok: true });
    expect(
      validatePriceAlertInput({ contact: "not-email", targetPrice: 99 }).ok,
    ).toBe(false);
    expect(
      validatePriceAlertInput({ contact: "user@example.com", targetPrice: 0 })
        .ok,
    ).toBe(false);
  });

  it("creates an unconfirmed alert with a hashed contact and a confirmation token", async () => {
    const alert = await createPriceAlert({
      productId,
      targetPrice: 99.9,
      contact: "user@example.com",
    });
    expect(alert.confirmedAt).toBeNull();
    expect(alert.confirmationToken).toBeTruthy();
    expect(alert.contactHash).not.toBe("user@example.com");
    expect(isConfirmed(alert)).toBe(false);
  });

  it("never grants marketing consent as a side effect", async () => {
    await createPriceAlert({
      productId,
      targetPrice: 99.9,
      contact: "user@example.com",
    });
    // No ConsentRecord should be created just from a price alert signup.
    const consent = await prisma.consentRecord.findFirst({
      where: { subjectId: "user@example.com" },
    });
    expect(consent).toBeNull();
  });
});

describe("confirmPriceAlert", () => {
  it("confirms an alert given its token and consumes the token", async () => {
    const alert = await createPriceAlert({
      productId,
      targetPrice: 99.9,
      contact: "user2@example.com",
    });
    const confirmed = await confirmPriceAlert(alert.confirmationToken!);
    expect(confirmed).not.toBeNull();
    expect(isConfirmed(confirmed!)).toBe(true);
    expect(confirmed!.confirmationToken).toBeNull();
  });

  it("returns null for an unknown or already-used token", async () => {
    const result = await confirmPriceAlert("not-a-real-token");
    expect(result).toBeNull();
  });

  it("does not allow the same token to confirm twice", async () => {
    const alert = await createPriceAlert({
      productId,
      targetPrice: 99.9,
      contact: "user3@example.com",
    });
    const token = alert.confirmationToken!;
    await confirmPriceAlert(token);
    const second = await confirmPriceAlert(token);
    expect(second).toBeNull();
  });
});

describe("cancelPriceAlert", () => {
  it("deactivates an alert", async () => {
    const alert = await createPriceAlert({
      productId,
      targetPrice: 99.9,
      contact: "user4@example.com",
    });
    const cancelled = await cancelPriceAlert(alert.id);
    expect(cancelled.active).toBe(false);
  });
});
