<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Production Access

When production access is needed, use the operational notes in
`docs/OPERATIONS.md` first. The current production VPS is the Hostinger
Ubuntu server `srv1880497.hstgr.cloud` at `179.198.110.11`; SSH user is
`root`.

Never write production passwords, Hostinger panel passwords, `.env`
values, API keys, cookies, or tokens into this repository. If SSH
authentication is needed, prefer an SSH key managed outside the repo; if
only a password is available, ask the human to provide it interactively
for that session and do not persist it.
