# Open Atlas Handoff Notes

This file is meant for a future human contributor or another coding model.

## How to start

1. Read `README.md`
2. Read `docs/CURRENT_APP_DOCUMENTATION.md`
3. Read `docs/IMPLEMENTATION_BACKLOG.md`
4. Check `THIRD_PARTY.md` before changing dependencies

## Current stack

- plain HTML
- plain CSS
- plain JavaScript
- Leaflet
- html2canvas
- topojson-client

## Current priorities

The highest-value next work is:

1. open-source transparency and dependency vendoring
2. generalizing beyond maritime-only atlases in a lightweight way
3. preserving a polished export workflow

## Important constraints

- keep the project static and easy to host
- avoid introducing a backend
- avoid large framework migrations
- keep tasks small and independently shippable
- preserve JSON compatibility whenever practical

## Editing guidance

- prefer small PR-sized changes
- update docs whenever behavior changes
- if a feature changes export structure, document it immediately
- if you add a dependency, also update `THIRD_PARTY.md`

## Good task shape for lighter models

Each task should:

- touch only a few files
- have one clear outcome
- include explicit acceptance criteria
- avoid mixing UI redesign, data-model change, and export change in one ticket

## Current documentation map

- `README.md`
  public-facing project overview
- `docs/CURRENT_APP_DOCUMENTATION.md`
  current architecture and behavior
- `docs/IMPLEMENTATION_BACKLOG.md`
  execution-ready backlog
- `docs/prototype_with_poe/prototype_documentation.txt`
  historical prototype reference, not the current source of truth
