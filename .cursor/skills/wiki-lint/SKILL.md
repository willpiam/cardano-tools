---
name: wiki-lint
description: Performs health checks on the wiki by detecting contradictions, stale claims, orphan pages, missing cross-links, and important topic gaps, then proposes or applies fixes. Use when the user asks to lint, audit, or health-check wiki quality.
---

# Wiki Lint

Use this skill for periodic wiki quality maintenance.

## Goal

Keep the wiki coherent, current, connected, and easy to navigate.

## Required Checks

1. **Contradictions**: find claims that conflict across pages.
2. **Stale claims**: identify content superseded by newer ingests.
3. **Orphans**: find pages with no meaningful inbound links.
4. **Missing cross-links**: add links where related pages are disconnected.
5. **Coverage gaps**: detect important concepts/entities mentioned repeatedly but lacking dedicated pages.

## Workflow

1. Start from `wiki/index.md` to inventory pages.
2. Sample and inspect relevant `wiki/pages/` content.
3. Record findings with concrete page references.
4. Apply safe fixes directly where clear.
5. For ambiguous fixes, surface recommendations and questions.
6. Append an audit entry in `wiki/log.md`.

## Log Entry Format

Use:

```markdown
## [YYYY-MM-DD] lint | wiki health check
```

Then include:
- Issues found
- Fixes applied
- Follow-up investigations suggested

## Completion Checklist

- [ ] Contradictions and stale claims were checked.
- [ ] Orphans and missing links were checked.
- [ ] Coverage gaps were identified.
- [ ] Fixes and recommendations are documented.
- [ ] `wiki/log.md` has a lint entry.
