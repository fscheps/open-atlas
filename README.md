# Open Atlas

Open Atlas is a static, open-source map storytelling app built for easy sharing and zero-backend hosting.

![Open Atlas screenshot](assets/open-atlas-verification.png)

## What it does

- Place ports or locations directly on the map
- Search real-world places on demand and add them directly to the map
- Switch between `Maritime`, `Pins`, and `Connections` map modes
- Draw sea routes that avoid land using client-side pathfinding
- Draw straight or curved arc connections for network and flight-style maps
- Add airport-ready directional air routes when connecting two airport points
- Choose point icons and per-point colors for clearer map storytelling
- Classify points as `Port`, `City`, `Airport`, or generic `Location`
- Drag map callouts freely while keeping them anchored to their points
- Switch between `Subtle`, `Editorial`, and `Bold` callout treatments
- Let short callouts auto-fit their content, then fine-tune width and height from the point details modal
- Use the studio comfortably on desktop, tablet, and mobile layouts
- Save and reopen atlases as JSON for continued editing
- Autosave local drafts and restore them later from the control panel
- Undo and redo atlas changes in the browser
- Export maps as PNG with framing and quality controls
- Copy the current map view straight to the clipboard without downloading a file
- Export map data as GeoJSON for GIS and downstream tooling
- Customize title, subtitle, fonts, colors, basemap style, and flat presentation sea/land colors
- Choose connection style and callout style in the appearance controls
- Keep everything fully static and GitHub Pages friendly

## Use it

Open Atlas is designed for a simple workflow:

1. Create ports, locations, or connections depending on the chosen mode.
2. Use `Search places` when you want to add a real-world city, airport, port, or landmark without clicking manually.
3. Tweak the visual identity in `Studio Settings`.
4. Let the in-browser draft system keep your latest working state close at hand.
5. Export JSON as the editable master file.
6. Re-import that JSON later to continue working.
7. Use `Undo` / `Redo` when refining the atlas.
8. Copy the current map view when you want a quick paste-ready image.
9. Export PNG for sharing or GeoJSON for interoperability.

## Project layout

- `index.html`
- `assets/styles/app.css`
- `assets/scripts/app.js`
- `assets/fonts/open-atlas-fonts.css`
- `assets/data/land-110m.json`
- `assets/vendor/leaflet/`
- `assets/vendor/fontawesome/`
- `assets/vendor/interact.min.js`
- `assets/open-atlas-verification.png`
- `docs/prototype_with_poe/`

## Documentation

For handoff and continued iteration, use these files as the current source of truth:

- `README.md`
- `docs/CURRENT_APP_DOCUMENTATION.md`
- `docs/IMPLEMENTATION_BACKLOG.md`
- `docs/LLM_HANDOFF.md`
- `THIRD_PARTY.md`
- `ATTRIBUTION.md`

## Run locally

Because the app loads coastline data and tiles over HTTP(S), do not open it with `file://`.

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

This repo is a strong GitHub Pages candidate because it is fully static.

The repository now includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

Recommended setup:

1. Push the repository to GitHub.
2. In repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` to deploy.
5. If you later add a custom domain, enable HTTPS and verify the domain in GitHub.

## Data model

JSON exports are the editable source of truth for the app. They include:

- map view
- ports or locations
- routes or connections
- current visual settings

Draft autosaves reuse the same atlas shape and live only in the browser via `localStorage`.

The app now writes the canonical `open-atlas` JSON format and still accepts the older prototype-era `mariners-atlas` format on import.

Point records now also store point type metadata such as `port`, `city`, `airport`, or `location`.

GeoJSON exports are for interoperability. They include:

- point features for ports or locations
- line features for routes or connections
- atlas metadata and theme settings

## Contributing

Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [SECURITY.md](SECURITY.md)
- [THIRD_PARTY.md](THIRD_PARTY.md)
- [ATTRIBUTION.md](ATTRIBUTION.md)
- [docs/CURRENT_APP_DOCUMENTATION.md](docs/CURRENT_APP_DOCUMENTATION.md)
- [docs/IMPLEMENTATION_BACKLOG.md](docs/IMPLEMENTATION_BACKLOG.md)

Short version:

- keep it static and easy to host
- preserve export compatibility
- prefer focused PRs
- include screenshots for UI changes

## Next good enhancements

See [docs/IMPLEMENTATION_BACKLOG.md](docs/IMPLEMENTATION_BACKLOG.md) for the execution-ready backlog.

## License

MIT. See [LICENSE](LICENSE).
