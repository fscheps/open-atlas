# Open Atlas: Current App Documentation

This file is the current technical reference for the app in this repository.

## Product summary

Open Atlas is a static browser application for building visual map atlases with:

- ports or pinned locations
- maritime routes generated client-side
- notes and draggable annotation bubbles
- draft autosave
- undo and redo
- PNG export with framing and quality controls
- JSON import and export
- GeoJSON export
- theme, font, and color controls

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
- `docs/prototype_with_poe/`
  Historical prototype artifacts kept for reference
- `output/playwright/`
  Local verification artifacts, not source code

## Current feature set

### Mapping

- Add locations by clicking the map
- Edit names and notes
- Toggle draggable info bubbles
- Search ports by name or notes
- Measure straight-line distance

### Routing

- Sea route plotting via A* pathfinding on a rasterized land/sea grid
- Alternative route choice when a second viable path is meaningfully different
- Distance display in kilometers and nautical miles

### Persistence

- JSON export/import as the editable project format
- Draft autosave to `localStorage`
- Draft restore/discard controls
- Undo/redo history stored in memory for the current session

### Visual customization

- Title and subtitle
- Theme mode
- Basemap style, including a built-in `Presentation Flat` mode
- Display, body, and UI fonts
- Accent, marker, and route colors
- Sea and land colors for presentation styling
- Curated visual presets
- Live settings preview card in the appearance modal

### Workspace shell

- Floating `Focus map` toggle to hide or restore the sidebar
- Three-step workflow strip for `Add ports`, `Chart paths`, and `Export`
- Scrollable sidebar with grouped sections for create, explore, save/share, workspace, and drafts

### Export

- PNG export with:
  - map-only or studio-view layout
  - current-view or fit-atlas framing
  - standard, high, or ultra quality
- GeoJSON export for interoperability

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
  "format": "mariners-atlas",
  "version": 2,
  "exported": "ISO timestamp",
  "view": {
    "center": [25, -30],
    "zoom": 3
  },
  "settings": {
    "atlasTitle": "Open Atlas",
    "atlasSubtitle": "Map Studio",
    "themeMode": "light",
    "mapStyle": "positron",
    "displayFont": "fraunces",
    "bodyFont": "manrope",
    "uiFont": "ibmplexmono",
    "accentColor": "#18567a",
    "markerColor": "#0b7a75",
    "routeColor": "#18567a",
    "routeAltColor": "#ca6702",
    "seaColor": "#d7e7f1",
    "landColor": "#f7f4ea"
  },
  "ports": [],
  "routes": []
}
```

Notes:

- `version` is currently `2`
- JSON is the source-of-truth editable format
- GeoJSON is an export convenience format, not the primary editable schema
- draft autosaves reuse the same atlas shape plus a `draftSavedAt` timestamp
- exported filenames currently use the `open-atlas-...` prefix, while the JSON `format` field remains `mariners-atlas` for backward compatibility

## Main code areas in `assets/scripts/app.js`

- theme and settings
- draft persistence
- history snapshots
- marker and bubble management
- port search
- sea-grid generation
- A* routing and alternative route detection
- measurement tools
- atlas import/export
- PNG export preparation and rendering

## External services and assets

See [THIRD_PARTY.md](/Users/fernandoscheps/Documents/Vibe_Coding_Projects/Custom_Maps/THIRD_PARTY.md:1).

Important current external dependencies:

- Leaflet
- html2canvas
- topojson-client
- world-atlas land data
- CARTO basemap tiles
- Google Fonts
- Font Awesome Free

Notes:

- `Presentation Flat` uses the built-in world land geometry instead of a tile layer
- tile-based styles still depend on external CARTO basemap requests

## Known architectural constraints

- No build step
- No backend
- No user accounts
- No server-side storage
- Current routing is maritime-specific
- Current history is session-only, not persisted across reloads
- Current export system renders DOM to canvas, so it is raster-first

## Verification expectations for contributors

Before calling a change done, verify:

- the app loads from a simple static server
- ports can be added, edited, searched, and deleted
- routes can still be drawn
- JSON import/export still works
- PNG export still works
- no obvious console errors appear

## Best next directions

The best product expansion paths are:

1. `Pins & Labels` mode for location-only maps
2. `Presentation` mode with custom sea and land colors
3. `Connections` mode for simple flight or network-style lines
4. vendored dependencies and attribution docs for a cleaner OSS story
