import { prisma } from "@/lib/db";

export class SlugRedirectLoopError extends Error {}

/**
 * Registers a permanent redirect for a path that moved, collapsing chains
 * and refusing to create a loop. Project brief Part J: "A -> B não pode
 * posteriormente resultar em B -> A" — this also covers longer cycles
 * (A -> B -> C -> A), not just the direct 2-hop case.
 *
 * Chain collapsing: if `newPath` already has its own redirect (B -> C),
 * the new row is created as oldPath -> C directly, so a lookup never has to
 * follow more than one hop.
 */
export async function registerSlugRedirect(
  oldPath: string,
  newPath: string,
  statusCode: 301 | 302 = 301,
): Promise<void> {
  if (oldPath === newPath) {
    throw new SlugRedirectLoopError(`Refusing a redirect from a path to itself: ${oldPath}`);
  }

  // Follow any existing chain starting at newPath to its final destination.
  let finalDestination = newPath;
  const visited = new Set<string>([oldPath]);
  for (let hops = 0; hops < 10; hops++) {
    if (visited.has(finalDestination)) {
      throw new SlugRedirectLoopError(
        `Registering ${oldPath} -> ${newPath} would create a redirect loop via ${finalDestination}`,
      );
    }
    visited.add(finalDestination);

    const next = await prisma.slugRedirect.findUnique({ where: { oldPath: finalDestination } });
    if (!next) break;
    finalDestination = next.newPath;
  }

  // Repoint any existing redirects that pointed at oldPath, so they don't
  // end up as a stale 2-hop chain (X -> oldPath -> finalDestination).
  await prisma.slugRedirect.updateMany({
    where: { newPath: oldPath },
    data: { newPath: finalDestination },
  });

  await prisma.slugRedirect.upsert({
    where: { oldPath },
    create: { oldPath, newPath: finalDestination, statusCode },
    update: { newPath: finalDestination, statusCode },
  });
}

export async function resolveSlugRedirect(pathname: string): Promise<{ newPath: string; statusCode: number } | null> {
  const redirect = await prisma.slugRedirect.findUnique({ where: { oldPath: pathname } });
  if (!redirect) return null;
  return { newPath: redirect.newPath, statusCode: redirect.statusCode };
}
