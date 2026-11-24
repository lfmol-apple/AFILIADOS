import { createElement, type ReactNode } from "react";

/**
 * Minimal renderer for the constrained Markdown subset ContentProvider
 * implementations are asked to produce (## / ### headings, "- " lists,
 * plain paragraphs). Deliberately not a general Markdown parser — avoids
 * pulling in a dependency for a format we fully control on the write side.
 */
export function renderSimpleMarkdown(body: string): ReactNode[] {
  const blocks = body.trim().split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("### ")) {
      return createElement(
        "h3",
        { key: i, className: "mt-6 text-base font-semibold" },
        trimmed.slice(4),
      );
    }
    if (trimmed.startsWith("## ")) {
      return createElement(
        "h2",
        { key: i, className: "mt-8 text-lg font-semibold" },
        trimmed.slice(3),
      );
    }
    const lines = trimmed.split("\n");
    if (lines.every((l) => l.startsWith("- "))) {
      return createElement(
        "ul",
        {
          key: i,
          className: "mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/80",
        },
        lines.map((l, j) => createElement("li", { key: j }, l.slice(2))),
      );
    }
    return createElement(
      "p",
      { key: i, className: "mt-3 text-sm leading-relaxed text-foreground/80" },
      trimmed,
    );
  });
}
