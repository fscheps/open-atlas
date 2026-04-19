# Open Atlas: Current App Documentation

This file is the current technical reference for the app in this repository.

## Product summary

Open Atlas is a static browser application for building visual map atlases with:

- ports or pinned locations
- selectable map modes: `Maritime`, `Pins`, and `Connections`
- maritime routes generated client-side
- straight or curved-arc connections for network and flight-style maps
- airport-aware directional air-route presentation inside `Connections` mode
- notes and draggable annotation bubbles with auto-fit plus manual size controls
- on-map title block, badge, optional logo image, and legend presentation blocks
- layer visibility toggles for labels, callouts, routes, and direction markers
- draft autosave
- undo and redo
- PNG export with framing, aspect, background, and quality controls
- JSON import and export
- GeoJSON export
- font and color controls

The project is intentionally:

- static
- build-free
- GitHub Pages friendly
- backend-free

## Repository layout

- `index.html`
  App shell and all visible markup
- `assets/styles/app.css`
  Visual system, layout, modals, panel styling, responsive rules
- `assets/scripts/app.js`
  App state, map behavior, routing, export logic, autosave, history
- `assets/fonts/`
  Self-hosted font files plus local `@font-face` stylesheet
- `assets/data/land-110m.json`
  Local world land dataset used for routing and presentation rendering
- `assets/vendor/leaflet/`
  Local Leaflet JS, CSS, and image assets
- `assets/vendor/fontawesome/`
  Local icon CSS and webfonts
- `assets/vendor/interact.min.js`
  Vendored drag interaction dependency used by the callout overlay system
- `docs/prototype_with_poe/`
  Historical prototype artifacts kept for reference
- `output/playwright/`
  Local verification artifacts, not source code

## Current feature set

### Mapping

- Add locations by clicking the map
- Add locations by on-demand place search using OpenStreetMap Nominatim
- Edit names and notes
- Classify points as `port`, `city`, `airport`, or `location`
- Choose per-point icons and colors
- Toggle draggable info bubbles
- Move callouts freely around the visible map while their tails stay anchored to the selected point
- Adjust callout width and height from the point details modal
- Adjust callout style between `Subtle`, `Editorial`, and `Bold`
- Let short callouts auto-fit their content while still allowing manual size overrides
- Search saved locations by name or notes
- Measure straight-line distance

### Routing

- Top-level map modes:
  - `Maritime`
    Port-focused wording plus routed sea paths
  - `Pins`
    Location-only maps with route creation disabled
  - `Connections`
    Location-focused wording plus straight or curved visual links between points
- Sea route plotting via A* pathfinding on a rasterized land/sea grid
- Alternative route choice when a second viable path is meaningfully different
- Configurable straight or arc connection drawing between two saved points in `Connections` mode
- Directional arrow markers on connection links, with plane icons when both endpoints are airports
- Optional direction-marker toggle for connection links
- Distance display in kilometers and nautical miles
- Route and connection removal directly from the popup

### Persistence

- JSON export/import as the editable project format
- Draft autosave to `localStorage`
- Draft restore/discard controls
- Undo/redo history stored in memory for the current session
- Local coastline dataset cache after first load
- Unsaved-changes guard before tab close when the live atlas differs from the last saved draft
- Atlas JSON validation with user-visible field-level errors during import

### Visual customization

- Title and subtitle
- Map mode
- Basemap style, including a built-in `Presentation Flat` mode
- Display, body, and UI fonts
- Callout style
- Connection style
- Direction marker visibility
- Title block badge text and optional uploaded logo image
- Editable legend block
- Layer visibility toggles
- Accent, marker, and route colors
- Sea and land colors for presentation styling
- Curated visual presets
- Live settings preview card in the appearance modal
- Raster-only title logo upload (`PNG`, `JPEG`, `WebP`)

### Workspace shell

- Header collapse button plus same-edge reopen tab for the studio
- Three-step workflow strip for `Add ports`, `Chart paths`, and `Export`
- Mode-aware copy so maritime maps use `Port` language while non-maritime maps use `Location`
- Scrollable sidebar with grouped sections for create, explore, save/share, workspace, and drafts
- Bottom-sheet presentation on smaller screens for tablet and mobile use

### Export

- PNG export with:
  - current-view or fit-atlas framing
  - native, 16:9, 4:5, 1:1, or A4 landscape aspect framing
  - map, sea, paper, or transparent background modes
  - checkbox-based include controls for markers, labels, callouts, routes, direction markers, title block, and legend
  - standard, high, or ultra quality
- direct clipboard copy of the current map view without the studio sidebar
- GeoJSON export for interoperability

### Runtime safeguards

- Place search uses a submit-only flow against OpenStreetMap Nominatim
- Nominatim requests are cached, rate-limited to at least one second between dispatches, and aborted after a timeout
- Draft/settings persistence surfaces browser storage quota failures to the user
- Route plotting uses a wait cursor while pathfinding is in progress
- Toasts are mirrored into an `aria-live` status region for screen reader feedback
- All app modals now use `role="dialog"` plus focus trapping and focus return
- The map workspace is wrapped in a semantic `<main aria-label="Map canvas">` landmark

## State model

### In-memory collections

- `markers`
  Port or location entries, each with map marker instance and metadata
- `routes`
  Route entries, each with rendered layer references and exportable geometry

### JSON atlas format

The editable atlas export shape currently includes:

```json
{
  "format": "open-atlas",
  "version": 9,
  "exported": "ISO timestamp",
  "view": {
    "center": [25, -30],
    "zoom": 3
  },
  "settings": {
    "atlasTitle": "Open Atlas",
    "atlasSubtitle": "Map Studio",
    "atlasMode": "maritime",
    "mapStyle": "positron",
    "displayFont": "fraunces",
    "bodyFont": "manrope",
    "uiFont": "ibmplexmono",
    "calloutStyle": "editorial",
    "connectionStyle": "arc",
    "showDirectionArrows": true,
    "showTitleBlock": true,
    "titleBadge": "",
    "titleLogoDataUrl": "",
    "showLegend": false,
    "legendTitle": "Legend",
    "legendBody": "Markers, routes, and callouts can be styled in Appearance.",
    "showLabels": true,
    "showCallouts": true,
    "showRoutes": true,
    "accentColor": "#18567a",
    "markerColor": "#0b7a75",
    "routeColor": "#18567a",
    "routeAltColor": "#ca6702",
    "seaColor": "#d7e7f1",
    "landColor": "#f7f4ea"
  },
  "ports": [
    {
      "id": 1,
      "name": "Port of Lisbon",
      "lat": 38.722,
      "lng": -9.139,
      "pointType": "port",
      "iconKey": "anchor",
      "markerColor": "#0b7a75",
      "details": "",
      "bubbleVisible": false,
      "bubbleWidth": null,
      "bubbleHeight": null,
      "bubbleWidthUserSized": false,
      "bubbleHeightUserSized": false,
      "bubbleOffsetX": 52,
      "bubbleOffsetY": -122,
      "bubbleLat": null,
      "bubbleLng": null
    }
  ],
  "routes": []
}
```

Notes:

- `version` is currently `9`
- JSON is the source-of-truth editable format
- GeoJSON is an export convenience format, not the primary editable schema
- draft autosaves reuse the same atlas shape plus a `draftSavedAt` timestamp
- the app still accepts legacy `mariners-atlas` JSON on import and during browser draft migration
- legacy `themeMode` values are accepted on import and ignored because the app is now light-only
- routes may now include a `routeMode` field such as `maritime` or `connection`
- routes may now include a stable `id`
- point records may now include a `pointType` field such as `port`, `city`, `airport`, or `location`
- bubbles now store width, height, and offset-from-point values

## Main code areas in `assets/scripts/app.js`

- theme and settings
- draft persistence
- history snapshots
- marker, point-type, and bubble management
- overlay-based callout geometry and interaction
- saved-item search and on-demand place search
- sea-grid generation
- A* routing and alternative route detection
- measurement tools
- atlas import/export
- PNG export preparation and rendering
- map presentation overlay rendering

## External services and assets

See [THIRD_PARTY.md](/Users/fernandoscheps/Documents/Vibe_Coding_Projects/Custom_Maps/THIRD_PARTY.md:1).

Important current runtime dependencies:

- Leaflet
- html2canvas
- Interact.js
- topojson-client
- world-atlas land data
- CARTO basemap tiles
- OpenStreetMap Nominatim search endpoint
- Font Awesome Free

Important note:

- only the basemap tiles and Nominatim search remain network-dependent at runtime; the app libraries, fonts, icons, and land dataset are now shipped locally

Notes:

- `Presentation Flat` uses the built-in world land geometry instead of a tile layer
- tile-based styles still depend on external CARTO basemap requests
- place search intentionally uses a submit-based query flow rather than autocomplete because the public Nominatim usage policy forbids client-side autocomplete on the shared endpoint
- title-block logo uploads are intentionally restricted to raster formats to avoid unsafe embedded SVG content

## Known architectural constraints

- No build step
- No backend
- No user accounts
- No server-side storage
- Current history is session-only, not persisted across reloads
- Current export system renders DOM to canvas, so it is raster-first

## Verification expectations for contributors

Before calling a change done, verify:

- the app loads from a simple static server
- ports or locations can be added, edited, searched, and deleted
- maritime routes and connection links can still be drawn in their respective modes
- JSON import/export still works
- PNG export still works
- no obvious console errors appear

## Best next directions

The best product expansion paths are:

1. smarter city-to-port helper suggestions after place search
2. richer airport-specific presets beyond the current `Airway` theme
3. more brand-ready export and presentation tooling
4. optional vector export paths such as SVG or print PDFs
