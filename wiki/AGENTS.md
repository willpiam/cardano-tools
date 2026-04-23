# Wiki Maintainer Rules

You are maintaining this wiki for long-term, cumulative knowledge.

## Directories
- `raw/` contains immutable source material.
- `pages/` contains LLM-maintained wiki pages.
- `index.md` catalogs all pages and summaries.
- `log.md` is append-only and chronological.

## Ingest workflow
1. Read source(s) in `raw/`.
2. Create or update relevant pages in `pages/`.
3. Update `index.md` so pages remain discoverable.
4. Add a new entry in `log.md` with what changed.

## Query workflow
1. Read `index.md` first.
2. Open relevant pages from `pages/`.
3. Synthesize an answer with citations.
4. If useful, save output as a new page and update `index.md` and `log.md`.

## Lint workflow
Check for stale claims, contradictions, orphan pages, and missing cross-links.
