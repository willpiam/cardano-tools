---
name: wiki-ingest
description: Ingests new sources into a persistent markdown wiki by reading raw sources, updating relevant wiki pages, maintaining index entries, and appending a chronological log entry. Use when the user asks to ingest, process, file, or integrate new source material into the wiki.
---

# Wiki Ingest

Use this skill when adding new material from `wiki/raw/` into the maintained wiki.

## Goal

Turn raw source material into structured, interlinked, persistent knowledge in the wiki.

## Required Workflow

1. Read one or more source files from `wiki/raw/`.
2. Extract key claims, entities, concepts, and relationships.
3. Create or update relevant pages in `wiki/pages/`.
4. Ensure links between related pages are present and useful.
5. Update `wiki/index.md` with each touched page and a one-line summary.
6. Append a new chronological entry to `wiki/log.md` describing what was ingested and what changed.

## Editing Rules

- Treat `wiki/raw/` as immutable source material.
- Prefer incremental updates to existing pages over duplicating pages.
- Preserve or improve cross-references when touching pages.
- Keep summaries concise and factual; avoid speculative claims.
- If a new source contradicts existing claims, note the contradiction on the impacted page(s).

## Log Entry Format

Use a consistent heading prefix for parseable history:

```markdown
## [YYYY-MM-DD] ingest | <source title or filename>
```

Then add short bullets for:
- Source(s) processed
- Pages created/updated
- Contradictions or open questions

## Completion Checklist

- [ ] All intended `wiki/raw/` sources were read.
- [ ] Relevant `wiki/pages/` files were created/updated.
- [ ] `wiki/index.md` reflects all touched pages.
- [ ] `wiki/log.md` has a new ingest entry.
