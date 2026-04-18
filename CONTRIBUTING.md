# Contributing to Open Atlas

Thanks for contributing.

Open Atlas is intentionally simple:

- static
- browser-first
- build-free
- easy to host on GitHub Pages

Please keep those qualities intact unless there is a strong reason to change them.

## Local development

Run a local server from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Do not test with `file://`, because the app loads remote coastline and map tile assets over HTTP(S).

## Read before changing code

Current source-of-truth docs:

- `README.md`
- `docs/CURRENT_APP_DOCUMENTATION.md`
- `docs/IMPLEMENTATION_BACKLOG.md`
- `docs/LLM_HANDOFF.md`
- `THIRD_PARTY.md`

## Project principles

- Keep the app fully usable without any backend.
- Preserve JSON import/export compatibility whenever possible.
- Prefer small, focused changes over large rewrites.
- If you add new exported data, make it backward-tolerant.
- Keep GitHub Pages compatibility in mind for every change.
- Favor readability over abstraction for this codebase.

## Before opening a pull request

Please verify:

- the app still loads successfully from a simple static server
- ports can be added, edited, and deleted
- routes can still be drawn
- JSON export and import still work
- PNG export still works
- any new setting persists and restores correctly if applicable
- undo/redo still works if your change touches editable state
- there are no obvious console errors

## Coding guidance

- Keep dependencies minimal.
- Prefer plain HTML, CSS, and JavaScript.
- Avoid introducing a framework unless there is a compelling project decision to do so.
- Keep the UI polished, intentional, and lightweight.
- If you touch exports, document the schema change in `README.md` or the docs folder.
- If you add or replace a dependency, update `THIRD_PARTY.md`.
- If you change behavior, update `docs/CURRENT_APP_DOCUMENTATION.md`.

## Pull request style

Good PRs for this repository usually:

- solve one problem clearly
- explain user-facing behavior changes
- mention any schema or export compatibility impact
- include screenshots for visible UI changes

## Backlog

Use `docs/IMPLEMENTATION_BACKLOG.md` for the current execution-ready roadmap.

## Questions

If a change would make the app heavier, less portable, or harder to host statically, call that out clearly before or during the PR.
