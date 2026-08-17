/** Turns a title into a URL-safe, accent-free slug. Pure function — same
 * input always yields the same slug, which keeps product URLs stable. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Appends a short suffix (e.g. derived from an ASIN) when the base slug
 * collides with an existing one, instead of silently overwriting a page. */
export function slugifyWithFallback(title: string, disambiguator: string): string {
  const base = slugify(title);
  const suffix = disambiguator.toLowerCase().slice(-6);
  return base ? `${base}-${suffix}` : suffix;
}

export async function generateUniqueSlug(
  title: string,
  disambiguator: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title) || disambiguator.toLowerCase();
  if (!(await isTaken(base))) return base;

  const withSuffix = slugifyWithFallback(title, disambiguator);
  if (!(await isTaken(withSuffix))) return withSuffix;

  let attempt = 2;
  while (await isTaken(`${withSuffix}-${attempt}`)) {
    attempt += 1;
  }
  return `${withSuffix}-${attempt}`;
}
