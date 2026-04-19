# Attribution

Open Atlas is open source, but some runtime data and services still require attribution when you use or redistribute the app.

## External hosted services

### CARTO basemaps

Used for:
- `Voyager Labels`
- `Voyager No Labels`
- `Positron`

Required attribution:
- OpenStreetMap
- CARTO

The app already shows this attribution in the map footer when tile basemaps are active.

References:
- [OpenStreetMap copyright](https://www.openstreetmap.org/copyright)
- [CARTO attribution](https://carto.com/attributions)

### OpenStreetMap Nominatim

Used for:
- on-demand place search in the `Search places` flow

Requirements:
- do not use client-side autocomplete against the shared public endpoint
- keep attribution visible in project docs
- cache repeat queries where practical

The app follows that policy by using explicit submit-based search only.

References:
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)

## Bundled datasets

### world-atlas / Natural Earth land polygons

Used for:
- local coastline rasterization for maritime routing
- `Presentation Flat` land rendering

Shipped locally at:
- `assets/data/land-110m.json`

Reference:
- [world-atlas](https://github.com/topojson/world-atlas)

## Bundled libraries

These are vendored into the repository and do not require end-user attribution in the map footer, but they should remain documented in `THIRD_PARTY.md`:

- Leaflet
- topojson-client
- html2canvas
- Interact.js
- Font Awesome Free

## Bundled fonts

Typography is self-hosted in `assets/fonts/` using local font files generated from Google Fonts families used by the app.

These font assets should remain documented in `THIRD_PARTY.md`.
