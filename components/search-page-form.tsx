/**
 * The search box at the top of the results page, filled with what was
 * searched so it can be edited instead of retyped. Plain GET form (no JS).
 * 16px text on phones: below that iOS Safari zooms the page on focus.
 */
export function SearchPageForm({ query }: { query: string }) {
  return (
    <form
      action="/ofertas"
      method="GET"
      role="search"
      className="glass mt-4 flex items-center gap-2 rounded-full p-1.5 pl-4"
    >
      <label htmlFor="search-page-q" className="sr-only">
        Buscar produto
      </label>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="text-foreground/40 h-5 w-5 shrink-0"
        aria-hidden
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="m14 14 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        id="search-page-q"
        type="search"
        name="q"
        defaultValue={query}
        enterKeyHint="search"
        autoComplete="off"
        placeholder="Buscar produto, marca ou categoria"
        className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none sm:text-sm"
      />
      <button
        type="submit"
        className="bg-brand text-brand-foreground min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold"
      >
        Buscar
      </button>
    </form>
  );
}
