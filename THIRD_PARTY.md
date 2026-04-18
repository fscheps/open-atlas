# Third-Party Components

This repository aims to stay transparent about every third-party component used by the app.

## Runtime dependencies

| Component | Current source | Purpose | Notes |
| --- | --- | --- | --- |
| Leaflet 1.9.4 | CDN in `index.html` | Interactive map rendering, markers, polylines, viewport management | Candidate for self-hosting |
| topojson-client 3.x | CDN in `index.html` | Convert world land TopoJSON into GeoJSON features for rasterization | Candidate for self-hosting |
| html2canvas 1.4.1 | CDN in `index.html` | Render map or studio view to PNG | Candidate for self-hosting |
| Font Awesome Free 6.4.0 | CDN in `index.html` | Interface icons | Candidate for replacement with a simpler fully vendored icon set |
| Google Fonts families | Google Fonts stylesheet in `index.html` | Typography for title, body, and UI fonts | Candidate for self-hosting |
| world-atlas land dataset | Remote fetch in `assets/scripts/app.js` | 110m world land polygons used to build the sea/land grid | Candidate for vendoring into `assets/data/` |
| CARTO raster tiles | Remote tile URLs in `assets/scripts/app.js` | Basemap imagery | External service, not vendored code |

## Transparency goals

The project should move toward:

1. vendored local copies for the JS and CSS libraries above
2. self-hosted fonts
3. explicit attribution and licensing notes for tiles and data
4. a tighter Content Security Policy once CDN dependencies are reduced

## Current follow-up tasks

- Add `ATTRIBUTION.md` for basemap and data attribution requirements
- Vendor local copies of Leaflet, html2canvas, and topojson-client
- Replace broad CSP allowlists with a minimal policy
- Decide whether to keep Font Awesome Free or switch to a lighter open-source icon set
