# Open Atlas Handoff Notes

This file is meant for a future human contributor or another coding model.

## How to start

1. Read `README.md`
2. Read `docs/CURRENT_APP_DOCUMENTATION.md`
3. Read `docs/IMPLEMENTATION_BACKLOG.md`
4. Check `THIRD_PARTY.md` before changing dependencies
5. Check `ATTRIBUTION.md` before changing basemaps, fonts, or place search

## Current stack

- plain HTML
- plain CSS
- plain JavaScript
- light-only visual system
- vendored Leaflet
- vendored html2canvas
- vendored Interact.js
- vendored topojson-client
- vendored world-atlas land dataset
- self-hosted app fonts
- OpenStreetMap Nominatim (submit-based place search only)

## Current priorities

The highest-value next work is:

1. smarter city-to-port helper suggestions inside place search
2. vector-friendly export paths such as SVG or print PDF output
3. richer airport- and business-map presets on top of the current `Airway` presentation tooling
4. optional offline-friendly work beyond the remaining basemap/search network dependencies

## Important constraints

- keep the project static and easy to host
- avoid introducing a backend
- avoid large framework migrations
- keep tasks small and independently shippable
- preserve JSON compatibility whenever practical
- keep uploaded title logos raster-only unless a proper SVG sanitization path is added

## Editing guidance

- prefer small PR-sized changes
- update docs whenever behavior changes
- if a feature changes export structure, document it immediately
- if you add a dependency, also update `THIRD_PARTY.md`
- if you touch search or imports, preserve the current timeout/rate-limit and validation safeguards

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
