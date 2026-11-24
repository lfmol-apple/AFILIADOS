import { describe, expect, it, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  registerSlugRedirect,
  resolveSlugRedirect,
  SlugRedirectLoopError,
} from "@/lib/seo/slug-redirect";

const TEST_PATH_PREFIX = "/__test_slug_redirect__";

afterEach(async () => {
  await prisma.slugRedirect.deleteMany({
    where: {
      OR: [
        { oldPath: { startsWith: TEST_PATH_PREFIX } },
        { newPath: { startsWith: TEST_PATH_PREFIX } },
      ],
    },
  });
});

function path(name: string): string {
  return `${TEST_PATH_PREFIX}/${name}`;
}

describe("registerSlugRedirect", () => {
  it("resolves a simple redirect", async () => {
    await registerSlugRedirect(path("a"), path("b"));
    const result = await resolveSlugRedirect(path("a"));
    expect(result).toEqual({ newPath: path("b"), statusCode: 301 });
  });

  it("returns null for a path with no redirect", async () => {
    const result = await resolveSlugRedirect(path("does-not-exist"));
    expect(result).toBeNull();
  });

  it("rejects a redirect from a path to itself", async () => {
    await expect(registerSlugRedirect(path("a"), path("a"))).rejects.toThrow(
      SlugRedirectLoopError,
    );
  });

  it("blocks A -> B from later being reversed into B -> A", async () => {
    await registerSlugRedirect(path("a"), path("b"));
    await expect(registerSlugRedirect(path("b"), path("a"))).rejects.toThrow(
      SlugRedirectLoopError,
    );
  });

  it("blocks a longer cycle (A -> B -> C -> A)", async () => {
    await registerSlugRedirect(path("a"), path("b"));
    await registerSlugRedirect(path("b"), path("c"));
    await expect(registerSlugRedirect(path("c"), path("a"))).rejects.toThrow(
      SlugRedirectLoopError,
    );
  });

  it("collapses chains: registering B -> C repoints an existing A -> B to A -> C", async () => {
    await registerSlugRedirect(path("a"), path("b"));
    await registerSlugRedirect(path("b"), path("c"));

    const fromA = await resolveSlugRedirect(path("a"));
    const fromB = await resolveSlugRedirect(path("b"));
    expect(fromA).toEqual({ newPath: path("c"), statusCode: 301 });
    expect(fromB).toEqual({ newPath: path("c"), statusCode: 301 });
  });

  it("is idempotent — registering the same redirect twice does not error", async () => {
    await registerSlugRedirect(path("a"), path("b"));
    await expect(
      registerSlugRedirect(path("a"), path("b")),
    ).resolves.toBeUndefined();
  });
});
