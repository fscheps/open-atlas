# Open Atlas — Code & Feature Audit

**Date**: 2026-04-19  
**Audited files**: `index.html`, `assets/scripts/app.js`, `assets/styles/app.css`, all `docs/`  
**Purpose**: Identify improvements for a follow-up implementation pass

---

## 1. Security

### 1.1 SVG Logo Upload (HIGH)
**File**: `assets/scripts/app.js` ~line 2186–2196  
SVG files uploaded as the atlas logo are stored as raw data URLs and included in JSON exports. SVG can contain `<script>` elements and event handlers. Anyone who receives a shared JSON export could trigger XSS if their viewer renders the embedded SVG.

**Fix**: On upload, parse the SVG with `DOMParser`, strip `<script>` nodes, `on*` attributes, and `javascript:` hrefs before storing the data URL. Alternatively, reject SVG outright and restrict to PNG/JPEG/WebP only.

---

### 1.2 JSON Import Validation (MEDIUM)
**File**: `assets/scripts/app.js` ~line 4216–4227  
`normalizeAtlasFormat()` checks `format` and `version` keys but does not validate lat/lng ranges, array item types, or required fields on each port/route object. A corrupted or hand-crafted import can inject malformed coordinates that break routing or rendering silently.

**Fix**: After format detection, run a schema check: validate `lat` ∈ [−90, 90], `lng` ∈ [−180, 180], required string fields are non-empty, IDs are unique. Reject the import with a specific error message listing the first failing field.

---

### 1.3 localStorage Contains Full Atlas Data (LOW)
Autosave writes all port names, coordinates, and notes to `localStorage` every 240 ms. On shared or public devices, this data is readable by any script on the same origin and visible in DevTools.

**Fix**: No change required for typical single-user deployment. Document the risk explicitly in the help modal ("Data stored locally in this browser — do not use on shared devices for sensitive maps").

---

## 2. Performance

### 2.1 `buildSeaGrid()` Blocks the Main Thread (HIGH)
**File**: `assets/scripts/app.js` ~line 2435–2517  
The sea-grid rasterisation (parse TopoJSON → rasterise land polygons to 720×360 canvas → fill `isLand` array) runs synchronously on load and blocks the UI for 2–3 seconds on a mid-range device. The backlog already lists this as **G1**.

**Fix**: Move `buildSeaGrid()` into a `Worker`. Post the `land-110m.json` ArrayBuffer (transferable), compute the grid inside the worker, and `postMessage` the flat `Uint8Array` back. Render a "building sea grid…" overlay in the meantime. The `worker-src 'self' blob:` CSP directive is already present.

---

### 2.2 Nominatim Fetch Has No Timeout (MEDIUM)
**File**: `assets/scripts/app.js` ~line 2327–2372  
Place search calls Nominatim with no `AbortController` or timeout. On a slow or unresponsive connection the UI spinner can hang indefinitely. Nominatim's own usage policy also requires ≤ 1 request/second; the current debounce (300 ms) does not guarantee this.

**Fix**:
```js
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 8000);
const res = await fetch(url, { signal: controller.signal });
clearTimeout(timer);
```
Add a `429`/timeout catch branch that shows a user-visible toast ("Search timed out — try again"). Track last-request timestamp and enforce ≥ 1000 ms gap between dispatches.

---

### 2.3 `applySettings()` Triggers Four Full Re-renders (MEDIUM)
**File**: `assets/scripts/app.js` ~line 1216–1278  
Every preset change calls `refreshAllMarkers()`, `refreshAllLabels()`, `refreshAllBubbles()`, and `refreshRouteLayers()` sequentially. Each iterates the full marker/route arrays. With 50+ points this causes 200+ DOM queries per settings change.

**Fix**: Pass a dirty-flags bitmask to `applySettings()` so only the affected subsystem re-renders. E.g. changing the route color should only call `refreshRouteLayers()`, not `refreshAllBubbles()`.

---

### 2.4 No Cache-Busting on Vendored Assets (LOW)
**File**: `index.html`  
Scripts are loaded as `assets/vendor/leaflet/leaflet.js` with no version hash in the filename. Browser caches may serve stale files for weeks after an update.

**Fix**: Rename files on version bump (e.g. `leaflet.1.9.4.js`) or append `?v=X.Y.Z`. A simple build step (`sed` or find-replace in package.json scripts) is sufficient given the no-bundler philosophy.

---

### 2.5 No `font-display: swap` (LOW)
**File**: `assets/fonts/open-atlas-fonts.css`  
Web fonts load without `font-display: swap`, causing FOIT (Flash of Invisible Text) on slow connections while the browser waits for fonts before rendering any text.

**Fix**: Add `font-display: swap;` to every `@font-face` rule.

---

## 3. Error Handling

### 3.1 localStorage `QuotaExceededError` is Silently Swallowed (MEDIUM)
**File**: `assets/scripts/app.js` ~line 774–814  
Draft saves catch all errors and log `console.warn`. If the quota is exceeded (possible with large logos embedded as data URLs), the user gets no feedback and believes their work is saved when it is not.

**Fix**: Specifically catch `DOMException` with `name === 'QuotaExceededError'` and show a persistent warning toast: "Draft could not be saved — storage full. Export your atlas to keep your work."

---

### 3.2 PNG Export Errors Not Surfaced (MEDIUM)
**File**: `assets/scripts/app.js` ~line 4156–4168  
The `html2canvas` call is wrapped in a try-catch but errors are only logged to the console. Users who click Export and get nothing see no failure message.

**Fix**: In the catch block, show a toast with actionable text: "Export failed — try reducing quality or simplifying the map." Log the original error to console for debugging.

---

### 3.3 Route Plotting UI Freeze Without Feedback (LOW)
**File**: `assets/scripts/app.js` ~line 2539–2697  
A* runs synchronously. For long routes (>5,000 km on a congested grid) this can freeze the browser for 1–2 seconds with no visual indicator. Users may double-click thinking the first click failed.

**Fix** (short-term before G1 is implemented): Set `cursor: wait` and disable the route-drawing button during computation. Show "Plotting route…" in the status area. This costs nothing and prevents duplicate inputs.

---

## 4. Accessibility

### 4.1 Modals Missing `role="dialog"` and Focus Trap (MEDIUM)
**File**: `index.html` — all modal `<div>` elements  
Modals are styled `<div>` containers with no `role="dialog"`, `aria-modal="true"`, or `aria-labelledby`. Screen readers do not announce modal boundaries, and focus is not trapped inside. Tab can escape to background content.

**Fix**: Add `role="dialog" aria-modal="true" aria-labelledby="<heading-id>"` to each modal root. On open, move focus to the first interactive element inside. On close, return focus to the trigger element. A minimal focus-trap (15 lines of JS) is sufficient — no library needed.

---

### 4.2 Toast Notifications Not Announced (MEDIUM)
**File**: `assets/scripts/app.js` — toast/hint rendering  
`.hint` toasts appear visually but are not in an `aria-live` region. Screen reader users receive no feedback for success/error states (e.g. "Route added", "Export failed").

**Fix**: Add a visually-hidden `<div role="status" aria-live="polite" id="sr-announcer"></div>` to `index.html`. In the `showHint()` function, also set `document.getElementById('sr-announcer').textContent = message`.

---

### 4.3 No `<main>` Landmark (LOW)
**File**: `index.html`  
The map `<div id="map">` and the workflow strip are not wrapped in a `<main>` landmark. Screen reader users using landmark navigation cannot jump directly to the map.

**Fix**: Wrap `#map` and `#workflow-strip` in `<main aria-label="Map canvas">`.

---

### 4.4 Callout Bubble Color Contrast (LOW)
User-customizable bubble background colors have no contrast validation against the text color (always white or dark). Custom themes can produce unreadable combinations.

**Fix**: When a bubble color is set, calculate the WCAG relative luminance of the background and switch text to black or white accordingly. This is ~10 lines of JS.

---

## 5. Code Quality

### 5.1 Dark Mode Is Dead Code (LOW)
**File**: `assets/styles/app.css` — `html.dark` ruleset; `assets/scripts/app.js` ~line 1069  
`refreshThemeMode()` unconditionally removes the `dark` class. The full dark-mode CSS ruleset (~80 lines) is compiled but never activated. The commit history shows dark mode was removed but the CSS was not cleaned up.

**Fix**: Delete all `html.dark` CSS rules and remove `refreshThemeMode()`. If dark mode is planned for re-introduction, that work should start from scratch against the new design system.

---

### 5.2 `BUBBLE_LEGACY_DISTANCE_LIMIT` Complexity (LOW)
**File**: `assets/scripts/app.js` ~line 37, ~line 756  
`bubbleOffsetFromLegacyLatLng()` exists solely to migrate bubble positions from an older format. If the app no longer reads files older than the current format version, this function and its constant are dead weight.

**Fix**: Confirm via git log whether any user would still open a pre-migration file. If not, delete the function and constant, and remove the legacy format path from `normalizeAtlasFormat()`.

---

### 5.3 Monolithic `app.js` (LOW)
`app.js` is 4,340 lines covering routing, UI, export, persistence, and map management in a single file. This works now but makes targeted edits risky — a change to the routing algorithm sits 100 lines from the export logic.

**Recommendation**: This is a low-urgency structural improvement. A suggested split:
- `routing.js` — A*, MinHeap, sea grid
- `bubbles.js` — callout creation, resize, tail geometry
- `export.js` — PNG/JSON/GeoJSON
- `persistence.js` — localStorage read/write, draft/settings
- `ui.js` — modals, toasts, sidebar, panel collapse
- `map.js` — Leaflet init, marker management, route layers

No bundler is needed — use ES modules with `<script type="module">`.

---

## 6. Missing Features (Backlog vs. Reality)

These items are listed in `docs/IMPLEMENTATION_BACKLOG.md` but not yet implemented:

| ID | Feature | Impact | Notes |
|----|---------|--------|-------|
| **B9** | City-to-port helper | Medium | After searching a city, suggest nearest sea port to snap to |
| **E1** | SVG export | Medium | Resolution-independent output; needed for print and large-format maps |
| **F4** | Item-picker for route endpoints | Medium | Select route start/end from a list instead of clicking the map; essential when ports overlap |
| **G1** | Web Worker for routing | High | Eliminates main-thread freeze during A* calculation |
| **I2** | Undo/redo persistence across sessions | Low | History lost on reload; export is the workaround |

---

## 7. UX Improvements Not in Backlog

### 7.1 Route Overlap Visualisation
When two routes share the same port pair (or nearly the same path), they render on top of each other. There is no visual indication of multiplicity. Add a slight lateral offset (arc offset by route index) for overlapping routes.

### 7.2 Bulk Port Actions
No multi-select. Users cannot delete 10 ports at once or change their icon in bulk. A shift-click selection model with a context menu ("Delete selected", "Change icon for selected") would unblock common editing workflows.

### 7.3 Keyboard Route Creation
Currently, route drawing requires two mouse clicks on the map. For accessibility and power users, add a keyboard flow: open a "New route" modal, type the start port name, type the end port name, confirm. Autocomplete from existing port names.

### 7.4 Export Progress Indicator
`html2canvas` can take 5–10 seconds on complex maps. The Export button currently shows no progress. Add a spinner inside the button and disable it during rendering to prevent double-submits and reassure the user.

### 7.5 "Unsaved Changes" Guard
Navigating away or closing the tab with unsaved draft changes gives no warning. Add a `beforeunload` handler that fires when the in-memory state differs from the last saved draft (compare a hash or version counter).

---

## 8. Implementation Priority Order

For a follow-up model or developer working from this audit, suggested order:

**Do first** (security/reliability, low effort):
1. SVG upload sanitisation or restriction (§1.1)
2. Nominatim fetch timeout + rate-limit guard (§2.2)
3. `QuotaExceededError` user notification (§3.1)
4. PNG export error surfaced to UI (§3.2)
5. Route plotting UI freeze feedback — `cursor: wait` + button disable (§3.3)

**Do second** (accessibility, medium effort):
6. `role="dialog"` + focus trap on all modals (§4.1)
7. `aria-live` announcer for toasts (§4.2)
8. `<main>` landmark wrapping map canvas (§4.3)
9. `font-display: swap` on all `@font-face` (§2.5)

**Do third** (performance, higher effort):
10. Web Worker for `buildSeaGrid()` — backlog G1 (§2.1)
11. Dirty-flags bitmask in `applySettings()` (§2.3)

**Do fourth** (features, highest effort):
12. F4 item-picker for route endpoints (§6)
13. E1 SVG export (§6)
14. Bulk port actions (§7.2)
15. Keyboard route creation (§7.3)

**Cleanup** (low risk, do anytime):
16. Delete dark-mode dead code (§5.1)
17. Remove legacy format + `BUBBLE_LEGACY_DISTANCE_LIMIT` (§5.2)
18. Cache-bust vendored assets (§2.4)
19. Add `bubbleColor` contrast auto-switch (§4.4)

---

## 9. What Is Already Good

- HTML escaping via `escapeHtml()` is applied consistently at all user-input render sites.
- CSP is tight and correctly scoped to actual runtime needs.
- Autosave debounce (240 ms) is well-tuned.
- Bottom-sheet responsive layout for mobile is polished and functional.
- Vendored assets eliminate external CDN dependencies and the associated availability/integrity risks.
- Documentation (`LLM_HANDOFF.md`, `CURRENT_APP_DOCUMENTATION.md`, `IMPLEMENTATION_BACKLOG.md`) is unusually thorough for a solo project and makes onboarding fast.
- `escapeHtml` is pure and reused consistently — no ad-hoc encoding scattered through the codebase.
- undo/redo history is well-implemented for a session-scoped store (60-snapshot limit is reasonable).
