# Third-Party Components

This repository aims to stay transparent about every third-party component used by the app.

## Runtime dependencies

| Component | Current source | Purpose | Notes |
| --- | --- | --- | --- |
| Leaflet 1.9.4 | Vendored in `assets/vendor/leaflet/` | Interactive map rendering, markers, polylines, viewport management | Includes local CSS, JS, and marker/control images |
| topojson-client 3.x | Vendored at `assets/vendor/topojson-client.min.js` | Convert world land TopoJSON into GeoJSON features for rasterization | Loaded locally from the repo |
| html2canvas 1.4.1 | Vendored at `assets/vendor/html2canvas.min.js` | Render map or studio view to PNG | Loaded locally from the repo |
| Interact.js | Vendored at `assets/vendor/interact.min.js` | Drag and resize interactions for the overlay callout system | MIT-licensed, framework-agnostic |
| Font Awesome Free 6.4.0 | Vendored in `assets/vendor/fontawesome/` | Interface icons | Local CSS plus required webfonts are bundled |
| Open Atlas font set | Self-hosted in `assets/fonts/` | Typography for title, body, and UI fonts | Local `@font-face` sheet generated from the Google Fonts families used by the app |
| world-atlas land dataset | Vendored at `assets/data/land-110m.json` | 110m world land polygons used to build the sea/land grid | Loaded locally for routing and presentation rendering |
| CARTO raster tiles | Remote tile URLs in `assets/scripts/app.js` | Basemap imagery | External service, not vendored code |
| OpenStreetMap Nominatim | Remote fetch in `assets/scripts/app.js` | On-demand place search for adding locations by city, airport, port, or landmark name | Shared public service; no client-side autocomplete, cache repeat queries, and keep attribution visible |

## Current state

- core runtime JS is now vendored locally
- core runtime CSS and icon assets are now vendored locally
- app typography is now self-hosted locally
- the land dataset is now loaded locally
- the CSP is now scoped to the app's actual remaining external services
- attribution requirements are documented in `ATTRIBUTION.md`

## Remaining follow-up tasks
- Decide whether to keep Font Awesome Free long-term or replace it with a slimmer vendored OSS icon set
- Consider vendoring or replacing external basemap tiles if the project ever needs a fully offline or service-independent mode
