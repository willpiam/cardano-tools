---
name: wiki-query
description: Answers questions from the persistent wiki by scanning the index, reading relevant pages, synthesizing with citations, and optionally filing durable outputs back into the wiki. Use when the user asks questions that should be grounded in wiki content.
---

# Wiki Query

Use this skill when answering questions from the wiki knowledge base.

## Goal

Produce grounded answers from existing wiki content and optionally convert high-value answers into persistent wiki pages.

## Required Workflow

1. Read `wiki/index.md` first to discover relevant pages quickly.
2. Read the most relevant files in `wiki/pages/`.
3. Synthesize an answer grounded in those pages.
4. Include citations to the wiki pages used.
5. If the answer is durable (comparison, synthesis, analysis), save it as a new page in `wiki/pages/`, then update `wiki/index.md` and `wiki/log.md`.

## Citation Guidance

- Cite specific page paths in the response.
- Prefer direct evidence over broad summary statements.
- If evidence is thin or conflicting, say so explicitly.

## Durable Output Rule

File answers back into the wiki when they are likely to be reused, such as:
- Comparisons
- Thematic syntheses
- Decision memos
- Structured analyses

## Log Entry Format

When filing a durable output, append:

```markdown
## [YYYY-MM-DD] query | <question or output title>
```

Then include:
- Question asked
- Pages consulted
- New page created (if any)

## Completion Checklist

- [ ] `wiki/index.md` was read first.
- [ ] Answer is grounded in relevant `wiki/pages/`.
- [ ] Citations are included.
- [ ] Durable output was filed when appropriate.
