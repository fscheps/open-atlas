# Open Atlas Implementation Backlog

This backlog is intentionally written so a lighter model can execute one task at a time.

Rules for working this backlog:

- do one task per change unless two tasks explicitly depend on each other
- update docs in the same change when behavior changes
- avoid large refactors unless a task explicitly asks for one
- preserve static hosting compatibility

Current completion snapshot:

- `B1`, `B2`, `B3`, `B4`, and `B5` are now live:
  - mode selector
  - pins mode
  - mode-aware copy
  - straight-line connections mode
  - selectable straight or arc connection styling
- `C1`, `C2`, and `C3` (presentation style + sea/land controls) are already live and should be treated as complete.
- `B8` search copy cleanup is now implemented.
- `C4` annotation contrast and placement cleanup is now live with draggable/resizable callouts, callout style presets, and adaptive callout typography.
- Remaining tasks keep the same IDs and are still open.

## Track A: Open-source transparency

### A1. Add `ATTRIBUTION.md`

Goal:
Document required attribution for basemaps, land data, and fonts.

Files:

- create `ATTRIBUTION.md`
- update `README.md`

Acceptance criteria:

- README links to the new file
- attribution requirements are easy to find
- file clearly separates vendored libraries from external hosted services

### A2. Vendor local JS dependencies

Goal:
Move Leaflet, html2canvas, and topojson-client from CDN references to local files.

Files:

- `index.html`
- create `assets/vendor/`
- update `THIRD_PARTY.md`

Acceptance criteria:

- app loads with local JS dependencies
- no broken PNG export
- no broken routing initialization
- README and third-party docs mention local vendoring

### A3. Vendor local CSS assets

Goal:
Move Leaflet CSS and icon/font CSS dependencies to local files where practical.

Files:

- `index.html`
- `assets/vendor/`
- `THIRD_PARTY.md`

Acceptance criteria:

- app styling still matches current behavior closely
- map controls still render correctly
- docs reflect the new local source paths

### A4. Self-host typography

Goal:
Replace Google Fonts stylesheet loading with local font files and `@font-face`.

Files:

- `index.html`
- `assets/styles/app.css`
- `assets/fonts/`
- `THIRD_PARTY.md`

Acceptance criteria:

- current font choices still render
- app works with no Google Fonts network dependency
- docs list the local font assets

### A5. Tighten Content Security Policy

Goal:
Shrink the CSP allowlist to only the sources the app actually needs.

Files:

- `index.html`
- `THIRD_PARTY.md`

Acceptance criteria:

- app still loads
- tiles still load
- no console CSP violations during normal use

## Track B: Generalize the product

### B1. Add atlas mode selector

Goal:
Introduce a simple top-level mode setting: `Maritime`, `Pins`, `Connections`.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`
- `docs/CURRENT_APP_DOCUMENTATION.md`

Acceptance criteria:

- mode is visible in settings
- mode persists in JSON and draft state
- app defaults to current maritime behavior if no mode is set

### B2. Implement `Pins` mode

Goal:
Support location-only atlases with no route generation.

Files:

- `assets/scripts/app.js`
- `index.html`
- docs

Acceptance criteria:

- draw-route controls are hidden or disabled in Pins mode
- user can still add, edit, search, annotate, save, and export locations
- JSON import/export preserves the mode

### B3. Rename “port” copy to mode-aware language

Goal:
Make the UI say `Port` in maritime mode and `Location` in general map modes.

Files:

- `index.html`
- `assets/scripts/app.js`
- docs

Acceptance criteria:

- visible labels, help text, and button copy change appropriately
- no broken functionality

### B4. Add `Connections` mode with straight lines

Goal:
Allow users to connect two locations with a simple straight or dashed line instead of maritime routing.

Files:

- `assets/scripts/app.js`
- `index.html`
- docs

Acceptance criteria:

- user can create a connection between two points in Connections mode
- line exports in JSON and GeoJSON
- no effect on maritime route behavior

### B5. Add arc connection style

Goal:
Offer a curved visual line style for flight-path style maps.

Files:

- `assets/scripts/app.js`
- `assets/styles/app.css`
- docs

Acceptance criteria:

- users can choose between straight and arc connection styles
- exported PNG shows the selected style
- JSON stores the style setting

### B6. Add place search for creating locations

Goal:
Let users create a location by searching for a city or place name, instead of only clicking the map manually.

Files:

- `index.html`
- `assets/scripts/app.js`
- docs

Acceptance criteria:

- user can open a place-search flow from the UI
- selecting a result creates a new location on the map
- behavior works without breaking the current click-to-add flow
- docs explain whether results come from a live geocoder or a bundled dataset

### B7. Add location type metadata

Goal:
Store whether a saved point is a `port`, `city`, `airport`, or generic `location`.

Files:

- `assets/scripts/app.js`
- `index.html`
- docs

Acceptance criteria:

- new points can carry a location type
- type is preserved in JSON import/export
- UI can render a different label or icon for each type without breaking older files

### B8. Add “find saved item” copy and mode-aware search language

Goal:
Clarify that the existing search modal looks through items already saved in the current map, not the world at large.

Files:

- `index.html`
- `assets/scripts/app.js`
- docs

Acceptance criteria:

- search modal title/subtitle and empty state are clearer
- wording becomes mode-aware where practical
- no functionality changes are required beyond copy and labels

### B9. Add city-to-port helper

Goal:
Optionally help users choose a nearby port after selecting a city, without forcing full automation.

Files:

- `assets/scripts/app.js`
- docs

Acceptance criteria:

- workflow is explicitly optional
- user can keep the city itself or switch to a suggested nearby port
- implementation documents the data source and fallback behavior

## Track C: Presentation styling

### C1. Add presentation map style toggle

Goal:
Create a basemap option that uses flat styled land/sea presentation colors instead of CARTO tiles.

Files:

- `assets/scripts/app.js`
- `assets/styles/app.css`
- docs

Acceptance criteria:

- user can switch to a presentation style
- land and sea remain visually distinct
- export works in this mode

### C2. Add sea color control

Goal:
Let users choose the sea color in presentation mode.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- color control appears in settings
- changes are reflected visually
- JSON persists the value

### C3. Add land color control

Goal:
Let users choose the land color in presentation mode.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- land color is configurable
- export reflects the chosen color
- JSON persists the value

### C4. Add label/annotation contrast tuning

Goal:
Ensure labels and bubbles stay readable across custom palettes.

Files:

- `assets/styles/app.css`
- `assets/scripts/app.js`

Acceptance criteria:

- bubbles and labels remain readable in dark and light presentation palettes
- no severe contrast failures in obvious test cases

## Track D: Branding and corporate map support

### D1. Add brand presets section

Goal:
Provide reusable style presets oriented toward clean presentation maps.

Files:

- `assets/scripts/app.js`
- docs

Acceptance criteria:

- at least three non-maritime presets exist
- they change colors and typography in a visible way
- presets are exportable through JSON settings

### D2. Add custom logo/title block upload placeholder

Goal:
Allow a small logo image or badge to appear in the exported studio presentation.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`
- docs

Acceptance criteria:

- user can choose a local image
- preview appears in the studio UI
- PNG export captures it

### D3. Add legend block

Goal:
Provide an optional legend or note block for presentation exports.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- legend can be shown or hidden
- legend text is editable
- PNG export includes it when visible

### D4. Add copy cleanup pass for “atlas” vs “map”

Goal:
Keep `Open Atlas` as the product name while using simpler words like `map`, `location`, and `project` in UI copy where clearer.

Files:

- `index.html`
- `assets/scripts/app.js`
- `README.md`
- docs

Acceptance criteria:

- product name remains consistent
- ambiguous phrases such as “current atlas” are reduced where they confuse users
- help text and modal copy feel more natural for non-maritime use cases

## Track E: Export improvements

### E1. Add SVG export spike

Goal:
Create a first-pass SVG export for overlays and text, even if basemap support is limited initially.

Files:

- `assets/scripts/app.js`
- docs

Acceptance criteria:

- app can export a valid SVG file
- ports, labels, and routes appear
- README clearly documents any limitations

### E2. Add print layout preset

Goal:
Provide export presets for common print-friendly aspect ratios.

Files:

- `index.html`
- `assets/scripts/app.js`

Acceptance criteria:

- export modal offers at least two paper-like layout presets
- output dimensions change predictably

### E3. Add export background options

Goal:
Allow transparent or solid export backgrounds where feasible.

Files:

- `index.html`
- `assets/scripts/app.js`

Acceptance criteria:

- option is visible in export controls
- PNG respects the option when technically possible

## Track F: Editing workflow

### F1. Add route deletion from route popup

Goal:
Let users delete an existing route directly from its popup.

Files:

- `assets/scripts/app.js`

Acceptance criteria:

- popup exposes a delete action
- route disappears immediately
- undo restores it

### F2. Add location duplication

Goal:
Let users duplicate a selected port/location and nudge it slightly.

Files:

- `assets/scripts/app.js`
- maybe `index.html`

Acceptance criteria:

- duplication is accessible from the details modal
- new item gets a new ID
- undo removes the duplicate

### F3. Add layer visibility toggles

Goal:
Allow quick show/hide for labels, bubbles, and routes.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- toggles update the live map
- PNG export respects visibility state
- JSON persists visibility settings if needed

### F4. Add item picker chips in route creation

Goal:
Help users connect saved items by selecting them from a compact list, not only by clicking map markers.

Files:

- `index.html`
- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- user can pick origin and destination from saved items
- map still supports click-based selection
- picker stays usable with larger saved-item lists

## Track I: Air and network maps

### I1. Add air route preset in Connections mode

Goal:
Provide a ready-made flight-map style built on top of Connections mode.

Files:

- `assets/scripts/app.js`
- `assets/styles/app.css`
- docs

Acceptance criteria:

- preset is easy to discover
- routes default to a flight-friendly style
- no maritime behavior changes in Maritime mode

### I2. Add airport iconography and labels

Goal:
Visually distinguish airports from ports and generic locations.

Files:

- `assets/scripts/app.js`
- `assets/styles/app.css`
- maybe `index.html`

Acceptance criteria:

- airports render with their own icon or badge
- labels remain readable
- JSON preserves the airport type

### I3. Add airport-to-airport connection flow

Goal:
Make it easy to connect two airports with a straight or arc route.

Files:

- `assets/scripts/app.js`
- `index.html`
- docs

Acceptance criteria:

- user can create an air route between saved airports
- route exports in JSON and GeoJSON
- route works with both straight and arc styles

### I4. Add directional arrows for air routes

Goal:
Show travel direction more clearly on flight or network maps.

Files:

- `assets/scripts/app.js`
- `assets/styles/app.css`

Acceptance criteria:

- arrows can be enabled or disabled
- exported visuals show the direction markers cleanly
- maritime routes are not visually cluttered by default

## Track G: Performance

### G1. Move routing work into a Web Worker

Goal:
Prevent long route computations from blocking the UI.

Files:

- create worker script in `assets/scripts/`
- `assets/scripts/app.js`
- docs

Acceptance criteria:

- route plotting still works
- UI remains responsive while computing
- failure path is documented if worker loading fails

### G2. Cache land dataset locally after first fetch

Goal:
Reduce repeated startup fetches for the world land data.

Files:

- `assets/scripts/app.js`

Acceptance criteria:

- subsequent app loads can reuse cached land data
- fallback still works if cache is unavailable

## Track H: Documentation and repo maintenance

### H1. Keep README in sync after each shipped feature

Goal:
Refresh feature bullets and workflow steps whenever user-facing behavior changes.

Files:

- `README.md`

Acceptance criteria:

- README matches the current app

### H2. Keep current architecture doc in sync

Goal:
Update `docs/CURRENT_APP_DOCUMENTATION.md` when behavior or structure changes.

Files:

- `docs/CURRENT_APP_DOCUMENTATION.md`

Acceptance criteria:

- new modes, exports, or dependencies are documented

### H3. Keep third-party inventory in sync

Goal:
Whenever a dependency changes, update `THIRD_PARTY.md`.

Files:

- `THIRD_PARTY.md`

Acceptance criteria:

- no undocumented dependency additions

## Recommended execution order

1. B8
2. A1
3. A2
4. A3
5. A4
6. A5
7. D4
8. B1
9. B2
10. B3
11. B4
12. B5
13. B6
14. B7
15. B9
16. I1
17. I2
18. I3
19. D1
20. D2
21. D3
22. F1
23. F2
24. F3
25. F4
26. E1
27. E2
28. E3
29. G1
30. G2
