# Question bank reviewer

**Scope:** `data/**` (mainly `data/questions.json`).

Read `_contract.md`, then `prd.md` §3 (levels, bank rules, examples).

**Structural rules.** Tests should enforce these, but check the diff anyway:

- IDs follow `beg-NNN` / `int-NNN` / `adv-NNN`, each ID is unique, and the prefix matches `level`.
  Never renumber or reuse the ID of an existing question, because answer history depends on it.
- There are at least 30 active questions per level and at least 90 in total. The share of true
  answers per level is 45–55%.
- `statement` is at most 200 chars and `explanation` at most 400. `docUrl` is optional, must be
  https, and must point to `code.claude.com/docs` or `docs.claude.com`.
- To retire a question, set it to `active: false`. Deleting a question that has already been seeded
  loses its history, so flag it.

**Content.** These are judgment calls; mark them `suggestion` unless the claim is wrong:

- Factual accuracy is a **blocker** when wrong. For each new or changed question, check the claim
  against the official docs (use WebFetch on its `docUrl` when you can). If you can't confirm it,
  say so. The PRD rule is: when in doubt, drop the question.
- Each statement is a single claim, with no double negatives, no trick wording and no absolutes
  ("sempre", "nunca") that hinge on an edge case.
- The explanation says **why** the answer is true or false, in plain business language, and explains
  technical terms (especially at the advanced level).
- The level of each question fits the persona in PRD §2 and §3.1.
- Text is in correct PT-BR with accents, and there are no near-duplicate questions within a level.
- Content must not go stale quickly: avoid version numbers, prices or limits that change often,
  unless the docs state them clearly.
