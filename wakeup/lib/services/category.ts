import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "./slug";

/** Finds a category by name, creating it (with a unique slug) if needed. */
export async function findOrCreateCategory(
  name: string,
): Promise<{ id: string }> {
  const existing = await prisma.category.findFirst({ where: { name } });
  if (existing) return existing;

  const slug = await generateUniqueSlug(name, name, async (s) => {
    const taken = await prisma.category.findUnique({ where: { slug: s } });
    return taken !== null;
  });

  return prisma.category.create({ data: { name, slug } });
}
