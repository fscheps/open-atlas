  /* ===== Theme + typography ===== */
  const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  if (systemThemeMedia.matches) {
    document.documentElement.classList.add('dark');
  }

  /* ===== Map ===== */
  const map = L.map('map', { zoomControl: true, worldCopyJump: true }).setView([25, -30], 3);
  const TILE_STYLES = {
    voyager_labels_under: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    voyager_nolabels: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    positron: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    dark_matter: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  };
  let baseLayer = null;

  function setBaseMap(styleKey) {
    const style = TILE_STYLES[styleKey] || TILE_STYLES.voyager_labels_under;
    if (baseLayer) map.removeLayer(baseLayer);
    baseLayer = L.tileLayer(style.url, {
      attribution: style.attribution,
      subdomains: 'abcd',
      maxZoom: 19,
      crossOrigin: 'anonymous'
    }).addTo(map);
  }

  /* ===== State ===== */
  const markers = [];   // {id, marker, name, latlng}
  const routes = [];    // layer groups
  let drawMode = false;
  let selectedForRoute = [];
  let nextId = 1;
  let seaReady = false;

  /* ===== DOM ===== */
  const drawBtn = document.getElementById('drawRouteBtn');
  const drawLabel = document.getElementById('drawRouteLabel');
  const clearBtn = document.getElementById('clearMapBtn');
  const hintEl = document.getElementById('hint');
  const hintText = document.getElementById('hintText');
  const portCountEl = document.getElementById('portCount');
  const routeCountEl = document.getElementById('routeCount');
  const chartState = document.getElementById('chartState');
  const loader = document.getElementById('loader');
  const loaderText = document.getElementById('loaderText');
  const loaderTitle = document.getElementById('loaderTitle');
  const charting = document.getElementById('charting');
  const findPortBtn = document.getElementById('findPortBtn');
  const measureBtn = document.getElementById('measureBtn');
  const measureLabel = document.getElementById('measureLabel');
  const atlasTitleText = document.getElementById('atlasTitleText');
  const atlasSubtitleText = document.getElementById('atlasSubtitleText');
  const settingsBtn = document.getElementById('settingsBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const historyNote = document.getElementById('historyNote');
  const restoreDraftBtn = document.getElementById('restoreDraftBtn');
  const discardDraftBtn = document.getElementById('discardDraftBtn');
  const draftNote = document.getElementById('draftNote');

  const nameModal = document.getElementById('nameModal');
  const portNameInput = document.getElementById('portNameInput');
  const modalLat = document.getElementById('modalLat');
  const modalLng = document.getElementById('modalLng');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');

  const routeChoiceModal = document.getElementById('routeChoiceModal');
  const routeChoices = document.getElementById('routeChoices');
  const routeChoiceSub = document.getElementById('routeChoiceSub');
  const routeChoiceCancel = document.getElementById('routeChoiceCancel');

  const searchModal = document.getElementById('searchModal');
  const portSearchInput = document.getElementById('portSearchInput');
  const portSearchResults = document.getElementById('portSearchResults');
  const searchCloseBtn = document.getElementById('searchCloseBtn');

  const confirmModal = document.getElementById('confirmModal');
  const confirmOk = document.getElementById('confirmOk');
  const confirmCancel = document.getElementById('confirmCancel');

  const settingsModal = document.getElementById('settingsModal');
  const settingsTitleInput = document.getElementById('settingsTitleInput');
  const settingsSubtitleInput = document.getElementById('settingsSubtitleInput');
  const themeModeSelect = document.getElementById('themeModeSelect');
  const mapStyleSelect = document.getElementById('mapStyleSelect');
  const displayFontSelect = document.getElementById('displayFontSelect');
  const bodyFontSelect = document.getElementById('bodyFontSelect');
  const uiFontSelect = document.getElementById('uiFontSelect');
  const accentColorInput = document.getElementById('accentColorInput');
  const markerColorInput = document.getElementById('markerColorInput');
  const routeColorInput = document.getElementById('routeColorInput');
  const routeAltColorInput = document.getElementById('routeAltColorInput');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const settingsResetBtn = document.getElementById('settingsResetBtn');
  const presetGrid = document.getElementById('presetGrid');

  let pendingLatLng = null;
  let isPlottingRoute = false;
  let measureMode = false;
  let measureStartLatLng = null;
  let measurePreviewLayer = null;
  let measurementLayer = null;
  let measurementMeta = null;
  let routeChoiceState = null;
  const SETTINGS_STORAGE_KEY = 'mariners-atlas-settings-v1';
  const DRAFT_STORAGE_KEY = 'mariners-atlas-draft-v1';
  const DEFAULT_VIEW = {
    center: [25, -30],
    zoom: 3
  };
  const HISTORY_LIMIT = 60;
  const EXPORT_QUALITY_SCALE = {
    standard: 1.5,
    high: 2,
    ultra: 3
  };
  const FONT_STACKS = {
    cormorant: "'Cormorant Garamond', serif",
    fraunces: "'Fraunces', serif",
    playfair: "'Playfair Display', serif",
    manrope: "'Manrope', sans-serif",
    space: "'Space Grotesk', sans-serif",
    jetbrains: "'JetBrains Mono', monospace",
    ibmplexmono: "'IBM Plex Mono', monospace"
  };
  const FONT_LABELS = {
    cormorant: 'Cormorant Garamond',
    fraunces: 'Fraunces',
    playfair: 'Playfair Display',
    manrope: 'Manrope',
    space: 'Space Grotesk',
    jetbrains: 'JetBrains Mono',
    ibmplexmono: 'IBM Plex Mono'
  };
  const THEME_PRESETS = {
    mariner: {
      label: 'Mariner',
      accentColor: '#8b2e1f',
      markerColor: '#8b2e1f',
      routeColor: '#1a4a6e',
      routeAltColor: '#8b2e1f',
      displayFont: 'cormorant',
      bodyFont: 'cormorant',
      uiFont: 'jetbrains',
      themeMode: 'auto',
      mapStyle: 'voyager_labels_under'
    },
    observatory: {
      label: 'Observatory',
      accentColor: '#18567a',
      markerColor: '#0b7a75',
      routeColor: '#18567a',
      routeAltColor: '#ca6702',
      displayFont: 'fraunces',
      bodyFont: 'manrope',
      uiFont: 'ibmplexmono',
      themeMode: 'light',
      mapStyle: 'positron'
    },
    midnight: {
      label: 'Midnight',
      accentColor: '#d4a95a',
      markerColor: '#d4a95a',
      routeColor: '#69d2e7',
      routeAltColor: '#ff9b71',
      displayFont: 'playfair',
      bodyFont: 'cormorant',
      uiFont: 'jetbrains',
      themeMode: 'dark',
      mapStyle: 'dark_matter'
    },
    expedition: {
      label: 'Expedition',
      accentColor: '#3f7d4c',
      markerColor: '#6b4f2a',
      routeColor: '#1d3557',
      routeAltColor: '#e76f51',
      displayFont: 'space',
      bodyFont: 'manrope',
      uiFont: 'ibmplexmono',
      themeMode: 'light',
      mapStyle: 'voyager_nolabels'
    }
  };
  const DEFAULT_SETTINGS = {
    atlasTitle: 'Open Atlas',
    atlasSubtitle: 'Map Studio',
    themeMode: 'light',
    mapStyle: 'positron',
    displayFont: 'fraunces',
    bodyFont: 'manrope',
    uiFont: 'ibmplexmono',
    accentColor: '#18567a',
    markerColor: '#0b7a75',
    routeColor: '#18567a',
    routeAltColor: '#ca6702'
  };
  let settings = { ...DEFAULT_SETTINGS };
  let draftSaveTimer = null;
  let autosaveSuspended = 0;
  let storedDraft = null;
  let historySaveTimer = null;
  let historySuspended = 0;
  let historyStack = [];
  let historyIndex = -1;

  function updateStats() {
    portCountEl.textContent = markers.length;
    routeCountEl.textContent = routes.length;
  }

  let hintTimer = null;
  function showHint(text, sticky = false) {
    hintText.textContent = text;
    hintEl.classList.add('visible');
    if (hintTimer) clearTimeout(hintTimer);
    if (!sticky) hintTimer = setTimeout(() => hintEl.classList.remove('visible'), 2800);
  }
  function hideHint() {
    hintEl.classList.remove('visible');
    if (hintTimer) clearTimeout(hintTimer);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hexToRgb(hex) {
    const cleaned = String(hex || '').replace('#', '');
    if (cleaned.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16)
    };
  }

  function tintHex(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const mix = amount >= 0 ? 255 : 0;
    const ratio = Math.abs(amount);
    const toHex = (value) => clamp(Math.round(value + (mix - value) * ratio), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbaFromHex(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function loadStoredSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to parse stored settings', err);
      return null;
    }
  }

  function saveStoredSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to persist settings', err);
    }
  }

  function withAutosaveSuspended(callback) {
    autosaveSuspended += 1;
    try {
      return callback();
    } finally {
      autosaveSuspended = Math.max(0, autosaveSuspended - 1);
    }
  }

  function formatDraftTimestamp(value) {
    if (!value) return 'recently';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch (err) {
      return 'recently';
    }
  }

  function settingsMatchDefaults(candidate) {
    return Object.keys(DEFAULT_SETTINGS).every((key) => candidate && candidate[key] === DEFAULT_SETTINGS[key]);
  }

  function hasMeaningfulAtlasState(atlasState) {
    return Boolean(
      (atlasState.ports && atlasState.ports.length) ||
      (atlasState.routes && atlasState.routes.length) ||
      !settingsMatchDefaults(atlasState.settings || {})
    );
  }

  function hasAtlasContent(atlasState) {
    return Boolean(
      (atlasState.ports && atlasState.ports.length) ||
      (atlasState.routes && atlasState.routes.length)
    );
  }

  function loadStoredDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.format !== 'mariners-atlas' || !Array.isArray(data.ports)) return null;
      return data;
    } catch (err) {
      console.warn('Failed to parse stored draft', err);
      return null;
    }
  }

  function refreshDraftUi() {
    const hasDraft = !!storedDraft;
    restoreDraftBtn.disabled = !hasDraft;
    discardDraftBtn.disabled = !hasDraft;
    draftNote.textContent = hasDraft
      ? `Draft saved ${formatDraftTimestamp(storedDraft.draftSavedAt || storedDraft.exported)}.`
      : 'Drafts autosave in your browser while you work.';
  }

  function clearStoredDraft(opts) {
    const options = opts || {};
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove stored draft', err);
    }
    storedDraft = null;
    refreshDraftUi();
    if (!options.silent) showHint('Saved draft discarded.');
  }

  function saveDraftNow() {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    if (autosaveSuspended) return;

    const atlasState = buildAtlasState();
    if (!hasMeaningfulAtlasState(atlasState)) {
      clearStoredDraft({ silent: true });
      return;
    }

    const draftState = {
      ...atlasState,
      draftSavedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));
      storedDraft = draftState;
      refreshDraftUi();
    } catch (err) {
      console.warn('Failed to persist draft', err);
    }
  }

  function scheduleDraftSave() {
    if (autosaveSuspended) return;
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    draftSaveTimer = setTimeout(saveDraftNow, 240);
  }

  function withHistorySuspended(callback) {
    historySuspended += 1;
    try {
      return callback();
    } finally {
      historySuspended = Math.max(0, historySuspended - 1);
    }
  }

  function buildHistoryState() {
    return buildAtlasState({ includeExported: false });
  }

  function atlasStateSignature(atlasState) {
    return JSON.stringify({
      view: atlasState.view,
      settings: atlasState.settings,
      ports: atlasState.ports,
      routes: atlasState.routes
    });
  }

  function refreshHistoryUi() {
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex >= 0 && historyIndex < historyStack.length - 1;
    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
    if (canUndo) {
      historyNote.textContent = `Step ${historyIndex + 1} of ${historyStack.length} in atlas history.`;
    } else if (historyStack.length > 1) {
      historyNote.textContent = 'You are at the oldest saved atlas step.';
    } else {
      historyNote.textContent = 'Use Cmd/Ctrl+Z to rewind changes.';
    }
  }

  function saveHistoryNow() {
    if (historySaveTimer) {
      clearTimeout(historySaveTimer);
      historySaveTimer = null;
    }
    if (historySuspended) return;

    const snapshot = buildHistoryState();
    const signature = atlasStateSignature(snapshot);
    const current = historyStack[historyIndex];
    if (current && current.signature === signature) {
      refreshHistoryUi();
      return;
    }

    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }

    historyStack.push({ signature, state: snapshot });
    if (historyStack.length > HISTORY_LIMIT) {
      historyStack.shift();
    }
    historyIndex = historyStack.length - 1;
    refreshHistoryUi();
  }

  function scheduleHistorySnapshot() {
    if (historySuspended) return;
    if (historySaveTimer) clearTimeout(historySaveTimer);
    historySaveTimer = setTimeout(saveHistoryNow, 220);
  }

  function restoreHistory(direction) {
    const nextIndex = historyIndex + direction;
    const entry = historyStack[nextIndex];
    if (!entry) return;

    withHistorySuspended(() => {
      applyAtlasState(entry.state, { source: 'history' });
    });

    historyIndex = nextIndex;
    refreshHistoryUi();
    showHint(direction < 0 ? 'Undid the last atlas change.' : 'Redid the atlas change.');
  }

  function populateFontSelect(select, keys) {
    select.innerHTML = keys.map((key) => `<option value="${key}">${FONT_LABELS[key]}</option>`).join('');
  }

  function populatePresetGrid() {
    presetGrid.innerHTML = Object.entries(THEME_PRESETS).map(([key, preset]) => `
      <button class="btn preset-btn" data-preset="${key}" type="button">
        <span class="preset-swatch">
          <span style="background:${preset.accentColor}"></span>
          <span style="background:${preset.routeColor}"></span>
          <span style="background:${preset.routeAltColor}"></span>
        </span>
        ${preset.label}
      </button>
    `).join('');
    presetGrid.querySelectorAll('[data-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = THEME_PRESETS[button.dataset.preset];
        applySettings(preset);
      });
    });
  }

  function refreshThemeMode() {
    const wantsDark = settings.themeMode === 'auto'
      ? systemThemeMedia.matches
      : settings.themeMode === 'dark';
    document.documentElement.classList.toggle('dark', wantsDark);
  }

  function refreshSettingsForm() {
    settingsTitleInput.value = settings.atlasTitle;
    settingsSubtitleInput.value = settings.atlasSubtitle;
    themeModeSelect.value = settings.themeMode;
    mapStyleSelect.value = settings.mapStyle;
    displayFontSelect.value = settings.displayFont;
    bodyFontSelect.value = settings.bodyFont;
    uiFontSelect.value = settings.uiFont;
    accentColorInput.value = settings.accentColor;
    markerColorInput.value = settings.markerColor;
    routeColorInput.value = settings.routeColor;
    routeAltColorInput.value = settings.routeAltColor;
  }

  function applySettings(nextSettings, opts) {
    const options = opts || {};
    settings = { ...settings, ...nextSettings };
    refreshThemeMode();
    document.documentElement.style.setProperty('--font-display', FONT_STACKS[settings.displayFont] || FONT_STACKS.cormorant);
    document.documentElement.style.setProperty('--font-body', FONT_STACKS[settings.bodyFont] || FONT_STACKS.cormorant);
    document.documentElement.style.setProperty('--font-ui', FONT_STACKS[settings.uiFont] || FONT_STACKS.jetbrains);
    document.documentElement.style.setProperty('--accent', settings.accentColor);
    document.documentElement.style.setProperty('--accent-hover', tintHex(settings.accentColor, 0.16));
    document.documentElement.style.setProperty('--gold', tintHex(settings.accentColor, 0.28));
    document.documentElement.style.setProperty('--marker-fill', settings.markerColor);
    document.documentElement.style.setProperty('--route-color', settings.routeColor);
    document.documentElement.style.setProperty('--route-alt-color', settings.routeAltColor);
    document.documentElement.style.setProperty('--route-glow', rgbaFromHex(settings.routeColor, 0.4));
    atlasTitleText.textContent = settings.atlasTitle;
    atlasSubtitleText.textContent = settings.atlasSubtitle;
    loaderTitle.textContent = settings.atlasTitle;
    setBaseMap(settings.mapStyle);
    refreshSettingsForm();
    refreshRouteLayers();
    if (options.persist !== false) saveStoredSettings();
    if (options.recordDraft !== false) scheduleDraftSave();
    if (options.recordHistory !== false) scheduleHistorySnapshot();
  }

  function openSettingsModal() {
    refreshSettingsForm();
    settingsModal.classList.add('show');
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('show');
  }

  function syncActionState() {
    const routeChoiceOpen = routeChoiceModal.classList.contains('show');
    drawBtn.disabled = !seaReady || isPlottingRoute || routeChoiceOpen;
    findPortBtn.disabled = isPlottingRoute || routeChoiceOpen;
    measureBtn.disabled = isPlottingRoute || routeChoiceOpen;
  }

  /* ===== Ports ===== */
  function makeIcon() {
    return L.divIcon({
      className: 'port-marker',
      html: '<div class="port-marker-inner"><i class="fa-solid fa-anchor"></i></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  function openNameModal(latlng) {
    pendingLatLng = latlng;
    modalLat.textContent = latlng.lat.toFixed(3);
    modalLng.textContent = latlng.lng.toFixed(3);
    portNameInput.value = '';
    nameModal.classList.add('show');
    setTimeout(() => portNameInput.focus(), 60);
  }
  function closeNameModal() {
    nameModal.classList.remove('show');
    pendingLatLng = null;
  }
  function savePort() {
    if (!pendingLatLng) return;
    const name = (portNameInput.value || '').trim() || `Port ${nextId}`;
    addMarker(pendingLatLng, name);
    closeNameModal();
  }

  function addMarker(latlng, name, opts) {
    opts = opts || {};
    const id = opts.id || nextId++;
    if (id >= nextId) nextId = id + 1;
    const marker = L.marker(latlng, { icon: makeIcon() }).addTo(map);
    // Permanent label
    marker.bindTooltip(name, {
      permanent: true,
      direction: 'right',
      offset: [10, -14],
      className: 'port-label'
    });

    const entry = {
      id, marker, name,
      latlng: L.latLng(latlng.lat, latlng.lng),
      details: opts.details || '',
      bubbleVisible: false,
      bubbleLatLng: opts.bubbleLatLng ? L.latLng(opts.bubbleLatLng.lat, opts.bubbleLatLng.lng) : null,
      bubble: null,
      bubbleLine: null
    };
    marker.on('click', (ev) => {
      L.DomEvent.stopPropagation(ev);
      if (drawMode) handleRouteSelection(entry);
      else if (measureMode) handleMeasurePoint(entry.latlng);
      else openPortModal(entry);
    });
    markers.push(entry);
    if (opts.bubbleVisible) showBubble(entry);
    updateStats();
    refreshMarkerVisuals();
    scheduleDraftSave();
    scheduleHistorySnapshot();
    return entry;
  }

  function findPort(id) { return markers.find(m => m.id === id); }

  /* ===== Port detail modal ===== */
  const portModal = document.getElementById('portModal');
  const portModalTitle = document.getElementById('portModalTitle');
  const portModalSub = document.getElementById('portModalSub');
  const portEditName = document.getElementById('portEditName');
  const portEditDetails = document.getElementById('portEditDetails');
  const bubbleToggle = document.getElementById('bubbleToggle');
  const portSaveBtn = document.getElementById('portSaveBtn');
  const portCancelBtn = document.getElementById('portCancelBtn');
  const portDeleteBtn = document.getElementById('portDeleteBtn');
  let editingPort = null;

  function openPortModal(entry) {
    editingPort = entry;
    portModalTitle.textContent = entry.name;
    portModalSub.textContent = `${entry.latlng.lat.toFixed(3)}° • ${entry.latlng.lng.toFixed(3)}°`;
    portEditName.value = entry.name;
    portEditDetails.value = entry.details || '';
    bubbleToggle.checked = !!entry.bubbleVisible;
    portModal.classList.add('show');
    setTimeout(() => portEditName.focus(), 60);
  }

  function closePortModal() {
    portModal.classList.remove('show');
    editingPort = null;
  }

  function savePortEdits() {
    if (!editingPort) return;
    const newName = (portEditName.value || '').trim() || editingPort.name;
    const newDetails = portEditDetails.value || '';
    const wantBubble = bubbleToggle.checked;

    const renamed = newName !== editingPort.name;
    editingPort.name = newName;
    editingPort.details = newDetails;

    if (renamed) {
      editingPort.marker.unbindTooltip();
      editingPort.marker.bindTooltip(newName, {
        permanent: true, direction: 'right', offset: [10, -14], className: 'port-label'
      });
      refreshRouteLayers();
    }

    if (wantBubble) {
      if (!editingPort.bubbleVisible) showBubble(editingPort);
      else updateBubbleContent(editingPort);
    } else if (editingPort.bubbleVisible) {
      hideBubble(editingPort);
    }

    closePortModal();
    showHint(`Port "${newName}" updated.`);
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  function deletePortEntry(entry) {
    // Remove routes involving this port
    for (let i = routes.length - 1; i >= 0; i--) {
      const r = routes[i];
      if (r.fromId === entry.id || r.toId === entry.id) {
        map.removeLayer(r.layer);
        routes.splice(i, 1);
      }
    }
    hideBubble(entry);
    map.removeLayer(entry.marker);
    const idx = markers.indexOf(entry);
    if (idx !== -1) markers.splice(idx, 1);
    updateStats();
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  /* ===== Info bubble ===== */
  function defaultBubbleLatLng(portLatLng) {
    const bounds = map.getBounds();
    const latSpan = Math.max(0.3, (bounds.getNorth() - bounds.getSouth()) * 0.12);
    const lngSpan = Math.max(0.3, (bounds.getEast() - bounds.getWest()) * 0.12);
    return L.latLng(portLatLng.lat + latSpan, portLatLng.lng + lngSpan);
  }

  function makeBubbleIcon(name, details) {
    const safeDetails = escapeHtml(details || '').trim() || '<em style="opacity:.6">No details yet</em>';
    return L.divIcon({
      className: 'bubble-marker',
      html: `<div class="info-bubble">
               <div class="bubble-title">${escapeHtml(name)}</div>
               <div class="bubble-handle"><i class="fa-solid fa-up-down-left-right"></i></div>
               <div class="bubble-body">${safeDetails}</div>
             </div>`,
      iconSize: null,
      iconAnchor: [0, 0]
    });
  }

  function showBubble(entry) {
    if (entry.bubble) return;
    if (!entry.bubbleLatLng) entry.bubbleLatLng = defaultBubbleLatLng(entry.latlng);
    entry.bubbleVisible = true;

    const bubble = L.marker(entry.bubbleLatLng, {
      icon: makeBubbleIcon(entry.name, entry.details),
      draggable: true,
      autoPan: false,
      zIndexOffset: 500
    }).addTo(map);

    bubble.on('drag', () => {
      entry.bubbleLatLng = bubble.getLatLng();
    });
    bubble.on('dragend', () => {
      scheduleDraftSave();
      scheduleHistorySnapshot();
    });
    bubble.on('click', (ev) => { L.DomEvent.stopPropagation(ev); });

    entry.bubble = bubble;
    entry.bubbleLine = null;
  }

  function updateBubbleContent(entry) {
    if (!entry.bubble) return;
    entry.bubble.setIcon(makeBubbleIcon(entry.name, entry.details));
  }

  function hideBubble(entry) {
    entry.bubbleVisible = false;
    if (entry.bubble) {
      map.removeLayer(entry.bubble);
      entry.bubble = null;
    }
    entry.bubbleLine = null;
  }

  portSaveBtn.addEventListener('click', savePortEdits);
  portCancelBtn.addEventListener('click', closePortModal);
  portDeleteBtn.addEventListener('click', () => {
    if (!editingPort) return;
    const ent = editingPort;
    closePortModal();
    deletePortEntry(ent);
    showHint('Port removed.');
  });
  portModal.addEventListener('click', (e) => { if (e.target === portModal) closePortModal(); });
  portEditName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); portEditDetails.focus(); }
    else if (e.key === 'Escape') { closePortModal(); }
  });
  portEditDetails.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePortModal(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (portModal.classList.contains('show')) closePortModal();
    else if (routeChoiceModal.classList.contains('show')) closeRouteChoice();
    else if (searchModal.classList.contains('show')) closeSearchModal();
    else if (exportModal.classList.contains('show')) closeExportModal();
    else if (settingsModal.classList.contains('show')) closeSettingsModal();
    else if (confirmModal.classList.contains('show')) confirmModal.classList.remove('show');
    else if (helpModal.classList.contains('show')) helpModal.classList.remove('show');
    else if (measureMode) setMeasureMode(false);
    else if (drawMode) setDrawMode(false);
  });

  /* ===== Help/FAQ ===== */
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpCloseBtn = document.getElementById('helpCloseBtn');

  helpBtn.addEventListener('click', () => helpModal.classList.add('show'));
  helpCloseBtn.addEventListener('click', () => helpModal.classList.remove('show'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('show');
  });
  settingsBtn.addEventListener('click', openSettingsModal);
  settingsCloseBtn.addEventListener('click', closeSettingsModal);
  settingsResetBtn.addEventListener('click', () => applySettings({ ...DEFAULT_SETTINGS }));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
  [
    [settingsTitleInput, 'input', () => applySettings({ atlasTitle: settingsTitleInput.value || DEFAULT_SETTINGS.atlasTitle })],
    [settingsSubtitleInput, 'input', () => applySettings({ atlasSubtitle: settingsSubtitleInput.value || DEFAULT_SETTINGS.atlasSubtitle })],
    [themeModeSelect, 'change', () => applySettings({ themeMode: themeModeSelect.value })],
    [mapStyleSelect, 'change', () => applySettings({ mapStyle: mapStyleSelect.value })],
    [displayFontSelect, 'change', () => applySettings({ displayFont: displayFontSelect.value })],
    [bodyFontSelect, 'change', () => applySettings({ bodyFont: bodyFontSelect.value })],
    [uiFontSelect, 'change', () => applySettings({ uiFont: uiFontSelect.value })],
    [accentColorInput, 'input', () => applySettings({ accentColor: accentColorInput.value })],
    [markerColorInput, 'input', () => applySettings({ markerColor: markerColorInput.value })],
    [routeColorInput, 'input', () => applySettings({ routeColor: routeColorInput.value })],
    [routeAltColorInput, 'input', () => applySettings({ routeAltColor: routeAltColorInput.value })]
  ].forEach(([el, eventName, handler]) => el.addEventListener(eventName, handler));

  function refreshMarkerVisuals() {
    markers.forEach(m => {
      const el = m.marker.getElement();
      if (!el) return;
      el.classList.toggle('selectable', drawMode);
      el.classList.toggle('selected', selectedForRoute.some(s => s.id === m.id));
    });
  }

  function flashPort(entry) {
    const el = entry.marker.getElement();
    if (!el) return;
    el.classList.remove('search-hit');
    void el.offsetWidth;
    el.classList.add('search-hit');
    setTimeout(() => el.classList.remove('search-hit'), 1300);
  }

  /* ===== Port search ===== */
  function renderSearchResults(query) {
    const q = (query || '').trim().toLowerCase();
    const matches = markers
      .filter(m => !q || m.name.toLowerCase().includes(q) || (m.details || '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));

    portSearchResults.innerHTML = '';
    if (!matches.length) {
      portSearchResults.innerHTML = '<div class="search-empty">No matching ports in the current atlas.</div>';
      return;
    }

    matches.forEach(entry => {
      const btn = document.createElement('button');
      btn.className = 'search-result';
      const notes = (entry.details || '').trim();
      btn.innerHTML = `
        <div class="search-result-name">${escapeHtml(entry.name)}</div>
        <div class="search-result-meta">${entry.latlng.lat.toFixed(3)}° • ${entry.latlng.lng.toFixed(3)}°</div>
        ${notes ? `<div class="search-result-notes">${escapeHtml(notes.slice(0, 96))}${notes.length > 96 ? '…' : ''}</div>` : ''}
      `;
      btn.addEventListener('click', () => {
        closeSearchModal();
        map.flyTo(entry.latlng, Math.max(map.getZoom(), 5), { animate: true, duration: 0.7 });
        flashPort(entry);
        showHint(`Centered on ${entry.name}.`);
      });
      portSearchResults.appendChild(btn);
    });
  }

  function openSearchModal() {
    setDrawMode(false);
    setMeasureMode(false);
    portSearchInput.value = '';
    renderSearchResults('');
    searchModal.classList.add('show');
    setTimeout(() => portSearchInput.focus(), 60);
  }

  function closeSearchModal() {
    searchModal.classList.remove('show');
  }

  findPortBtn.addEventListener('click', openSearchModal);
  searchCloseBtn.addEventListener('click', closeSearchModal);
  portSearchInput.addEventListener('input', () => renderSearchResults(portSearchInput.value));
  portSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearchModal();
    else if (e.key === 'Enter') {
      e.preventDefault();
      const first = portSearchResults.querySelector('.search-result');
      if (first) first.click();
    }
  });
  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) closeSearchModal();
  });

  /* ===== Sea grid (land/sea mask) =====
     We rasterize world land polygons (TopoJSON) into a grid, then run A*
     on sea cells. Longitude wraps around the antimeridian. */
  const GRID_W = 720;
  const GRID_H = 360;
  const isLand = new Uint8Array(GRID_W * GRID_H);

  function idx(x, y) { return y * GRID_W + x; }
  function latLngToCell(lat, lng) {
    // Normalize lng to [-180,180)
    let l = ((lng + 180) % 360 + 360) % 360 - 180;
    const x = Math.floor((l + 180) / 360 * GRID_W);
    const y = Math.floor((90 - lat) / 180 * GRID_H);
    return [
      Math.max(0, Math.min(GRID_W - 1, x)),
      Math.max(0, Math.min(GRID_H - 1, y))
    ];
  }
  function cellToLatLng(x, y) {
    const lng = (x + 0.5) / GRID_W * 360 - 180;
    const lat = 90 - (y + 0.5) / GRID_H * 180;
    return [lat, lng];
  }

  async function buildSeaGrid() {
    loaderText.textContent = 'Fetching coastlines…';
    const resp = await fetch('https://unpkg.com/world-atlas@2/land-110m.json');
    const topo = await resp.json();
    loaderText.textContent = 'Rasterizing land…';
    const land = topojson.feature(topo, topo.objects.land);

    const canvas = document.createElement('canvas');
    canvas.width = GRID_W;
    canvas.height = GRID_H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GRID_W, GRID_H);
    ctx.fillStyle = '#ffffff';

    function drawPoly(rings) {
      ctx.beginPath();
      rings.forEach(ring => {
        ring.forEach((pt, i) => {
          const x = (pt[0] + 180) / 360 * GRID_W;
          const y = (90 - pt[1]) / 180 * GRID_H;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      });
      ctx.fill('evenodd');
    }

    land.features.forEach(f => {
      const g = f.geometry;
      if (!g) return;
      if (g.type === 'Polygon') drawPoly(g.coordinates);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(drawPoly);
    });

    const data = ctx.getImageData(0, 0, GRID_W, GRID_H).data;
    for (let i = 0, n = GRID_W * GRID_H; i < n; i++) {
      isLand[i] = data[i * 4] > 128 ? 1 : 0;
    }

    // Carve canals & narrow straits that simplified 110m land omits
    carveCanal(9.35, -79.92, 9.10, -79.55, 1);   // Panama
    carveCanal(30.55, 32.33, 29.95, 32.58, 1);   // Suez
    carveCanal(41.25, 28.95, 41.04, 29.10, 1);   // Bosphorus
    carveCanal(40.20, 26.15, 40.45, 26.70, 1);   // Dardanelles
    carveCanal(35.95, -5.50, 35.95, -5.25, 1);   // Gibraltar (safety)
    carveCanal(12.60, 43.35, 12.65, 43.85, 1);   // Bab-el-Mandeb
    carveCanal(26.55, 56.25, 26.55, 56.75, 1);   // Hormuz
    carveCanal( 1.20, 103.30,  1.30, 104.10, 1); // Singapore/Malacca south
    carveCanal(55.60, 12.50, 55.80, 12.90, 1);   // Øresund
    loaderText.textContent = 'Charts ready.';
  }

  function carveCanal(lat1, lng1, lat2, lng2, width) {
    const [x1, y1] = latLngToCell(lat1, lng1);
    const [x2, y2] = latLngToCell(lat2, lng2);
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let t = 0; t <= steps; t++) {
      const x = Math.round(x1 + (x2 - x1) * t / steps);
      const y = Math.round(y1 + (y2 - y1) * t / steps);
      for (let dy = -width; dy <= width; dy++) {
        for (let dx = -width; dx <= width; dx++) {
          const ny = y + dy;
          if (ny < 0 || ny >= GRID_H) continue;
          const nx = ((x + dx) % GRID_W + GRID_W) % GRID_W;
          isLand[idx(nx, ny)] = 0;
        }
      }
    }
  }

  /* ===== A* with longitude wrap ===== */
  class MinHeap {
    constructor() { this.data = []; }
    size() { return this.data.length; }
    push(item) {
      this.data.push(item);
      this._up(this.data.length - 1);
    }
    pop() {
      const top = this.data[0];
      const last = this.data.pop();
      if (this.data.length) { this.data[0] = last; this._down(0); }
      return top;
    }
    _up(i) {
      const d = this.data;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (d[p].f <= d[i].f) break;
        [d[i], d[p]] = [d[p], d[i]];
        i = p;
      }
    }
    _down(i) {
      const d = this.data, n = d.length;
      while (true) {
        const l = 2 * i + 1, r = l + 1;
        let s = i;
        if (l < n && d[l].f < d[s].f) s = l;
        if (r < n && d[r].f < d[s].f) s = r;
        if (s === i) break;
        [d[i], d[s]] = [d[s], d[i]];
        i = s;
      }
    }
  }

  const DIRS = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]
  ];

  function heuristic(ax, ay, bx, by) {
    const dy = Math.abs(ay - by);
    let dx = Math.abs(ax - bx);
    dx = Math.min(dx, GRID_W - dx);
    return Math.hypot(dx, dy);
  }

  function nearestSea(x, y, maxRadius = 12) {
    if (!isLand[idx(x, y)]) return [x, y];
    // Spiral-ish BFS over a bounded radius
    const visited = new Uint8Array(GRID_W * GRID_H);
    visited[idx(x, y)] = 1;
    const queue = [[x, y, 0]];
    let head = 0;
    while (head < queue.length) {
      const [cx, cy, d] = queue[head++];
      if (d > maxRadius) break;
      if (!isLand[idx(cx, cy)]) return [cx, cy];
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let nx = cx + dx, ny = cy + dy;
        if (ny < 0 || ny >= GRID_H) continue;
        nx = (nx + GRID_W) % GRID_W;
        const k = idx(nx, ny);
        if (visited[k]) continue;
        visited[k] = 1;
        queue.push([nx, ny, d + 1]);
      }
    }
    return null;
  }

  function astar(startX, startY, goalX, goalY, penalty) {
    const N = GRID_W * GRID_H;
    const g = new Float32Array(N);
    for (let i = 0; i < N; i++) g[i] = Infinity;
    const came = new Int32Array(N);
    for (let i = 0; i < N; i++) came[i] = -1;
    const closed = new Uint8Array(N);

    const startI = idx(startX, startY);
    const goalI = idx(goalX, goalY);
    g[startI] = 0;

    const heap = new MinHeap();
    heap.push({ f: heuristic(startX, startY, goalX, goalY), i: startI });

    while (heap.size()) {
      const cur = heap.pop();
      if (closed[cur.i]) continue;
      closed[cur.i] = 1;
      if (cur.i === goalI) break;
      const cx = cur.i % GRID_W;
      const cy = (cur.i - cx) / GRID_W;
      for (const [dx, dy, cost] of DIRS) {
        let nx = cx + dx, ny = cy + dy;
        if (ny < 0 || ny >= GRID_H) continue;
        nx = (nx + GRID_W) % GRID_W;
        const ni = idx(nx, ny);
        if (isLand[ni] || closed[ni]) continue;
        // Disallow diagonal squeezing between land corners
        if (dx && dy) {
          if (isLand[idx((cx + dx + GRID_W) % GRID_W, cy)] &&
              isLand[idx(cx, cy + dy)]) continue;
        }
        const extra = penalty ? penalty[ni] : 0;
        const t = g[cur.i] + cost + extra;
        if (t < g[ni]) {
          g[ni] = t;
          came[ni] = cur.i;
          heap.push({ f: t + heuristic(nx, ny, goalX, goalY), i: ni });
        }
      }
    }

    if (came[goalI] === -1 && startI !== goalI) return null;
    const path = [];
    let c = goalI;
    let guard = 0;
    while (c !== -1 && guard++ < N) {
      path.unshift(c);
      if (c === startI) break;
      c = came[c];
    }
    return path;
  }

  /* ===== Path helpers ===== */
  function cellsToLatLngs(cells, hintLng) {
    // Unwrap longitudes continuously so Leaflet draws correctly across antimeridian
    const out = [];
    let prevLng = hintLng;
    for (const ci of cells) {
      const cx = ci % GRID_W;
      const cy = (ci - cx) / GRID_W;
      let [lat, lng] = cellToLatLng(cx, cy);
      if (prevLng !== null && prevLng !== undefined) {
        while (lng - prevLng > 180) lng -= 360;
        while (lng - prevLng < -180) lng += 360;
      }
      out.push([lat, lng]);
      prevLng = lng;
    }
    return out;
  }

  // Douglas-Peucker simplification for smoother lines
  function simplify(points, tol = 0.5) {
    if (points.length < 3) return points.slice();
    const sqTol = tol * tol;
    const keep = new Uint8Array(points.length);
    keep[0] = 1; keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let maxD = 0, maxI = -1;
      const [ax, ay] = points[a], [bx, by] = points[b];
      const dx = bx - ax, dy = by - ay;
      const denom = dx*dx + dy*dy || 1;
      for (let i = a + 1; i < b; i++) {
        const [px, py] = points[i];
        const t = ((px - ax) * dx + (py - ay) * dy) / denom;
        const cx = ax + t * dx, cy = ay + t * dy;
        const ddx = px - cx, ddy = py - cy;
        const d = ddx*ddx + ddy*ddy;
        if (d > maxD) { maxD = d; maxI = i; }
      }
      if (maxD > sqTol && maxI !== -1) {
        keep[maxI] = 1;
        stack.push([a, maxI], [maxI, b]);
      }
    }
    const out = [];
    for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
    return out;
  }

  function pathLengthKm(latlngs) {
    let sum = 0;
    for (let i = 1; i < latlngs.length; i++) {
      sum += haversine({ lat: latlngs[i-1][0], lng: latlngs[i-1][1] },
                       { lat: latlngs[i][0],   lng: latlngs[i][1] });
    }
    return sum;
  }

  function haversine(a, b) {
    const R = 6371;
    const toRad = v => v * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.sin(dLng/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ===== Alternative-path search =====
     Run A* a second time with a penalty corridor around the first path.
     If the new path is significantly different, offer it as a choice. */
  function findAlternative(start, goal, primaryCells) {
    const penalty = new Float32Array(GRID_W * GRID_H);
    const radius = 4;
    for (const ci of primaryCells) {
      const cx = ci % GRID_W;
      const cy = (ci - cx) / GRID_W;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = cy + dy;
          if (ny < 0 || ny >= GRID_H) continue;
          const nx = ((cx + dx) % GRID_W + GRID_W) % GRID_W;
          const d2 = dx*dx + dy*dy;
          if (d2 > radius*radius) continue;
          penalty[idx(nx, ny)] += 20 * (1 - Math.sqrt(d2)/(radius + 0.001));
        }
      }
    }
    return astar(start[0], start[1], goal[0], goal[1], penalty);
  }

  function cellOverlap(a, b) {
    const setA = new Set(a);
    let overlap = 0;
    for (const c of b) if (setA.has(c)) overlap++;
    return overlap / Math.min(a.length, b.length);
  }

  /* ===== Route plotting ===== */
  async function plotRoute(portA, portB) {
    if (isPlottingRoute) {
      showHint('A route is already being charted.');
      return;
    }
    isPlottingRoute = true;
    syncActionState();
    charting.classList.add('show');
    // Yield so UI updates
    await new Promise(r => setTimeout(r, 30));
    try {
      let [sx, sy] = latLngToCell(portA.latlng.lat, portA.latlng.lng);
      let [gx, gy] = latLngToCell(portB.latlng.lat, portB.latlng.lng);
      const startSnap = nearestSea(sx, sy, 15);
      const goalSnap = nearestSea(gx, gy, 15);

      if (!startSnap || !goalSnap) {
        showHint('Unable to reach open sea from one of the ports.');
        return;
      }
      [sx, sy] = startSnap;
      [gx, gy] = goalSnap;

      const primaryCells = astar(sx, sy, gx, gy);
      if (!primaryCells) {
        showHint('No sea route found between these ports.');
        return;
      }

      const primaryLL = cellsToLatLngs(primaryCells, portA.latlng.lng);
      // Splice in actual port locations at each end for pretty anchoring
      const primaryFull = [[portA.latlng.lat, portA.latlng.lng], ...primaryLL, [portB.latlng.lat, portB.latlng.lng]];
      const primarySimpl = simplify(primaryFull, 0.4);
      const primaryKm = pathLengthKm(primarySimpl);

      // Search alternative
      const altCells = findAlternative([sx, sy], [gx, gy], primaryCells);
      let altSimpl = null, altKm = null;
      if (altCells) {
        const overlap = cellOverlap(primaryCells, altCells);
        const altLL = cellsToLatLngs(altCells, portA.latlng.lng);
        const altFull = [[portA.latlng.lat, portA.latlng.lng], ...altLL, [portB.latlng.lat, portB.latlng.lng]];
        const candidate = simplify(altFull, 0.4);
        const candidateKm = pathLengthKm(candidate);
        // Only offer if routes differ meaningfully and alt isn't absurdly longer
        if (overlap < 0.75 && candidateKm < primaryKm * 2.2) {
          altSimpl = candidate;
          altKm = candidateKm;
        }
      }

      if (altSimpl) {
        offerRouteChoice(portA, portB, primarySimpl, primaryKm, altSimpl, altKm);
      } else {
        commitRoute(portA, portB, primarySimpl, primaryKm, 'primary');
      }
    } finally {
      charting.classList.remove('show');
      isPlottingRoute = false;
      syncActionState();
    }
  }

  /* ===== Route layers ===== */
  function drawRouteLayer(latlngs, style = 'primary', preview = false) {
    const color = style === 'primary'
      ? getComputedStyle(document.documentElement).getPropertyValue('--route-color').trim()
      : getComputedStyle(document.documentElement).getPropertyValue('--route-alt-color').trim();

    const halo = L.polyline(latlngs, {
      color, weight: preview ? 10 : 8, opacity: preview ? 0.25 : 0.18, lineCap: 'round'
    });
    const line = L.polyline(latlngs, {
      color, weight: preview ? 3 : 2.5, opacity: 0.95,
      dashArray: '8, 10', lineCap: 'round'
    });
    return L.layerGroup([halo, line]);
  }

  function bindRoutePopup(group, portAName, portBName, km, variant) {
    const nm = Math.round(km / 1.852);
    group.eachLayer(l => {
      l.bindPopup(`
        <div class="port-popup">
          <strong>${escapeHtml(portAName)} → ${escapeHtml(portBName)}</strong>
          <div class="coord">${Math.round(km).toLocaleString()} km • ${nm.toLocaleString()} nautical mi • ${variant === 'primary' ? 'Primary' : 'Alternative'}</div>
        </div>
      `);
    });
  }

  function refreshRouteLayers() {
    routes.forEach((route) => {
      if (route.layer) map.removeLayer(route.layer);
      const nextGroup = drawRouteLayer(route.latlngs, route.variant).addTo(map);
      const from = findPort(route.fromId);
      const to = findPort(route.toId);
      bindRoutePopup(nextGroup, from ? from.name : route.fromName || 'Port', to ? to.name : route.toName || 'Port', route.km, route.variant);
      route.layer = nextGroup;
      route.fromName = from ? from.name : route.fromName;
      route.toName = to ? to.name : route.toName;
    });
  }

  function offerRouteChoice(portA, portB, primLL, primKm, altLL, altKm) {
    closeRouteChoice({ silent: true });
    // Show both as previews on map
    const primPreview = drawRouteLayer(primLL, 'primary', true).addTo(map);
    const altPreview  = drawRouteLayer(altLL,  'alt',     true).addTo(map);
    map.fitBounds(primPreview.getLayers()[0].getBounds().extend(altPreview.getLayers()[0].getBounds()), { padding: [60, 60] });

    routeChoiceSub.textContent = `Two viable sea routes from ${portA.name} to ${portB.name}.`;
    routeChoices.innerHTML = '';

    const makeCard = (label, km, color, variant, latlngs) => {
      const btn = document.createElement('button');
      btn.className = 'route-card';
      btn.innerHTML = `
        <div class="swatch" style="background:${color}"></div>
        <div>
          <div class="route-title">${label}</div>
          <div class="route-dist">${Math.round(km).toLocaleString()} km • ${Math.round(km/1.852).toLocaleString()} nmi</div>
        </div>
      `;
      btn.addEventListener('click', () => {
        closeRouteChoice({ silent: true });
        commitRoute(portA, portB, latlngs, km, variant);
      });
      return btn;
    };

    const primColor = getComputedStyle(document.documentElement).getPropertyValue('--route-color').trim();
    const altColor = getComputedStyle(document.documentElement).getPropertyValue('--route-alt-color').trim();
    const primLabel = primKm <= altKm ? 'Route A — Shortest' : 'Route A';
    const altLabel  = altKm  <  primKm ? 'Route B — Shortest' : 'Route B — Scenic';

    routeChoices.appendChild(makeCard(primLabel, primKm, primColor, 'primary', primLL));
    routeChoices.appendChild(makeCard(altLabel, altKm, altColor, 'alt', altLL));

    routeChoiceState = { primPreview, altPreview };
    routeChoiceModal.classList.add('show');
    syncActionState();
  }

  function closeRouteChoice(opts) {
    const { silent = false } = opts || {};
    if (routeChoiceState) {
      map.removeLayer(routeChoiceState.primPreview);
      map.removeLayer(routeChoiceState.altPreview);
      routeChoiceState = null;
    }
    routeChoiceModal.classList.remove('show');
    routeChoices.innerHTML = '';
    syncActionState();
    if (!silent) showHint('Route selection cancelled.');
  }

  routeChoiceCancel.addEventListener('click', () => closeRouteChoice());
  routeChoiceModal.addEventListener('click', (e) => {
    if (e.target === routeChoiceModal) closeRouteChoice();
  });

  function commitRoute(portA, portB, latlngs, km, variant) {
    const group = drawRouteLayer(latlngs, variant).addTo(map);
    const nm = Math.round(km / 1.852);
    bindRoutePopup(group, portA.name, portB.name, km, variant);
    routes.push({ layer: group, fromId: portA.id, toId: portB.id, fromName: portA.name, toName: portB.name, variant, km, latlngs });
    updateStats();
    showHint(`Route charted: ${portA.name} → ${portB.name} (${nm.toLocaleString()} nmi)`);
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  /* ===== Draw mode interaction ===== */
  function handleRouteSelection(entry) {
    if (isPlottingRoute || routeChoiceModal.classList.contains('show')) return;
    if (selectedForRoute.some(s => s.id === entry.id)) {
      selectedForRoute = selectedForRoute.filter(s => s.id !== entry.id);
      refreshMarkerVisuals();
      showHint('Port deselected. Choose a port to continue.');
      return;
    }
    selectedForRoute.push(entry);
    refreshMarkerVisuals();
    if (selectedForRoute.length === 1) {
      showHint(`Origin: ${entry.name}. Select destination…`, true);
    } else if (selectedForRoute.length === 2) {
      const [a, b] = selectedForRoute;
      selectedForRoute = [];
      setDrawMode(false);
      plotRoute(a, b);
    }
  }

  function setDrawMode(on) {
    if (on && !seaReady) {
      showHint('Sea charts still loading…');
      return;
    }
    if (on && (isPlottingRoute || routeChoiceModal.classList.contains('show'))) {
      showHint('Finish the current route choice first.');
      return;
    }
    if (on) setMeasureMode(false);
    drawMode = on;
    drawBtn.classList.toggle('active', on);
    drawLabel.textContent = on ? 'Cancel Route' : 'Draw Route';
    if (!on) {
      selectedForRoute = [];
      hideHint();
    } else {
      if (markers.length < 2) {
        showHint('Place at least two ports first.');
        drawMode = false;
        drawBtn.classList.remove('active');
        drawLabel.textContent = 'Draw Route';
        return;
      }
      showHint('Click two ports to chart a sea route.', true);
    }
    refreshMarkerVisuals();
  }

  /* ===== Distance ruler ===== */
  function clearMeasurePreview() {
    if (measurePreviewLayer) {
      map.removeLayer(measurePreviewLayer);
      measurePreviewLayer = null;
    }
    measureStartLatLng = null;
    map.off('mousemove', updateMeasurePreview);
  }

  function clearMeasurement() {
    if (measurementLayer) {
      map.removeLayer(measurementLayer);
      measurementLayer = null;
      measurementMeta = null;
    }
  }

  function updateMeasurePreview(ev) {
    if (!measurePreviewLayer || !measureStartLatLng) return;
    const layers = measurePreviewLayer.getLayers();
    layers[1].setLatLngs([measureStartLatLng, ev.latlng]);
  }

  function setMeasureMode(on, opts) {
    const { preserveHint = false } = opts || {};
    if (on && (isPlottingRoute || routeChoiceModal.classList.contains('show'))) {
      showHint('Finish the current route choice first.');
      return;
    }
    if (on) setDrawMode(false);
    measureMode = on;
    measureBtn.classList.toggle('btn-tool-active', on);
    measureLabel.textContent = on ? 'Cancel Measure' : 'Measure Distance';
    if (!on) {
      clearMeasurePreview();
      if (!preserveHint) hideHint();
    } else {
      showHint('Click two points to measure a straight-line distance.', true);
    }
  }

  function commitMeasurement(a, b) {
    clearMeasurement();
    const km = haversine(a, b);
    const nm = Math.round(km / 1.852);
    const color = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
    const halo = L.polyline([a, b], {
      color,
      weight: 8,
      opacity: 0.16,
      lineCap: 'round'
    });
    const line = L.polyline([a, b], {
      color,
      weight: 2.5,
      opacity: 0.95,
      dashArray: '6, 8',
      lineCap: 'round'
    });
    const start = L.circleMarker(a, {
      radius: 5,
      color,
      weight: 2,
      fillColor: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
      fillOpacity: 1
    });
    const end = L.circleMarker(b, {
      radius: 5,
      color,
      weight: 2,
      fillColor: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
      fillOpacity: 1
    });
    measurementLayer = L.layerGroup([halo, line, start, end]).addTo(map);
    measurementMeta = { km, nm, start: [a.lat, a.lng], end: [b.lat, b.lng] };
    line.bindPopup(`
      <div class="port-popup">
        <strong>Straight-Line Measure</strong>
        <div class="coord">${Math.round(km).toLocaleString()} km • ${nm.toLocaleString()} nautical mi</div>
      </div>
    `).openPopup();
    showHint(`Measured ${nm.toLocaleString()} nmi straight-line distance.`);
  }

  function handleMeasurePoint(latlng) {
    if (!measureMode) return;
    if (!measureStartLatLng) {
      clearMeasurePreview();
      measureStartLatLng = L.latLng(latlng.lat, latlng.lng);
      const color = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
      const start = L.circleMarker(measureStartLatLng, {
        radius: 5,
        color,
        weight: 2,
        fillColor: getComputedStyle(document.documentElement).getPropertyValue('--panel').trim(),
        fillOpacity: 1
      });
      const line = L.polyline([measureStartLatLng, measureStartLatLng], {
        color,
        weight: 2,
        opacity: 0.8,
        dashArray: '6, 8'
      });
      measurePreviewLayer = L.layerGroup([start, line]).addTo(map);
      map.on('mousemove', updateMeasurePreview);
      showHint('First point set. Click a second point to finish measuring.', true);
      return;
    }

    const start = L.latLng(measureStartLatLng.lat, measureStartLatLng.lng);
    const end = L.latLng(latlng.lat, latlng.lng);
    clearMeasurePreview();
    commitMeasurement(start, end);
    setMeasureMode(false, { preserveHint: true });
  }

  measureBtn.addEventListener('click', () => setMeasureMode(!measureMode));

  /* ===== Events ===== */
  map.on('click', (e) => {
    if (drawMode) return;
    if (measureMode) {
      handleMeasurePoint(e.latlng);
      return;
    }
    openNameModal(e.latlng);
  });

  drawBtn.addEventListener('click', () => setDrawMode(!drawMode));

  clearBtn.addEventListener('click', () => {
    if (markers.length === 0 && routes.length === 0 && !measurementLayer) {
      showHint('The atlas is already empty.');
      return;
    }
    confirmModal.classList.add('show');
  });
  confirmCancel.addEventListener('click', () => confirmModal.classList.remove('show'));
  confirmOk.addEventListener('click', () => {
    clearAll();
    confirmModal.classList.remove('show');
    showHint('Atlas cleared.');
  });

  function clearAll(opts) {
    const options = opts || {};
    closeRouteChoice({ silent: true });
    closeSearchModal();
    markers.forEach(m => {
      hideBubble(m);
      map.removeLayer(m.marker);
    });
    routes.forEach(r => map.removeLayer(r.layer));
    markers.length = 0;
    routes.length = 0;
    selectedForRoute = [];
    nextId = 1;
    clearMeasurePreview();
    clearMeasurement();
    setDrawMode(false);
    setMeasureMode(false);
    updateStats();
    if (!options.skipDraftSave) scheduleDraftSave();
    if (!options.skipHistorySave) scheduleHistorySnapshot();
  }

  modalSave.addEventListener('click', savePort);
  modalCancel.addEventListener('click', closeNameModal);
  portNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); savePort(); }
    else if (e.key === 'Escape') { closeNameModal(); }
  });
  nameModal.addEventListener('click', (e) => { if (e.target === nameModal) closeNameModal(); });
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) confirmModal.classList.remove('show'); });

  /* ===== Export / Import ===== */
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportGeoJsonBtn = document.getElementById('exportGeoJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const jsonFileInput = document.getElementById('jsonFileInput');
  const exportModal = document.getElementById('exportModal');
  const exportModalTitle = document.getElementById('exportModalTitle');
  const exportModalSub = document.getElementById('exportModalSub');
  const exportScopeSelect = document.getElementById('exportScopeSelect');
  const exportAreaSelect = document.getElementById('exportAreaSelect');
  const exportQualitySelect = document.getElementById('exportQualitySelect');
  const exportTip = document.getElementById('exportTip');
  const exportCloseBtn = document.getElementById('exportCloseBtn');
  const exportConfirmBtn = document.getElementById('exportConfirmBtn');

  function setExportBusy(isBusy, title, sub) {
    exportModalTitle.textContent = title;
    exportModalSub.textContent = sub;
    [exportScopeSelect, exportAreaSelect, exportQualitySelect, exportCloseBtn, exportConfirmBtn].forEach((el) => {
      el.disabled = isBusy;
    });
  }

  function updateExportTip() {
    const layoutLabel = exportScopeSelect.value === 'studio' ? 'the full studio view with the sidebar' : 'only the map canvas without UI chrome';
    const frameLabel = exportAreaSelect.value === 'fit-atlas'
      ? 'The camera will temporarily frame all ports and routes before capture.'
      : 'The PNG will match the exact viewport currently on screen.';
    const qualityLabel = exportQualitySelect.value === 'ultra'
      ? 'Ultra quality is best for print but creates the heaviest file.'
      : exportQualitySelect.value === 'standard'
        ? 'Standard quality keeps file size lighter for quick sharing.'
        : 'High quality is the recommended balance for most atlases.';
    exportTip.textContent = `This export will capture ${layoutLabel}. ${frameLabel} ${qualityLabel}`;
  }

  function openExportModal() {
    setExportBusy(false, 'Export PNG', 'Choose the framing and output quality.');
    updateExportTip();
    exportModal.classList.add('show');
  }

  function closeExportModal() {
    exportModal.classList.remove('show');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 400);
  }

  function slugifyFilename(value) {
    return String(value || 'open-atlas')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'open-atlas';
  }

  function getAtlasBounds() {
    const bounds = L.latLngBounds([]);
    let hasContent = false;

    markers.forEach((markerEntry) => {
      bounds.extend(markerEntry.latlng);
      hasContent = true;
    });

    routes.forEach((route) => {
      route.latlngs.forEach(([lat, lng]) => {
        bounds.extend([lat, lng]);
        hasContent = true;
      });
    });

    return hasContent ? bounds : null;
  }

  async function withPreparedExportFrame(frameMode, callback) {
    const previousView = {
      center: [map.getCenter().lat, map.getCenter().lng],
      zoom: map.getZoom()
    };
    let changedView = false;

    if (frameMode === 'fit-atlas') {
      const bounds = getAtlasBounds();
      if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        if (sw.lat === ne.lat && sw.lng === ne.lng) {
          map.setView(bounds.getCenter(), Math.max(map.getZoom(), 5), { animate: false });
        } else {
          map.fitBounds(bounds.pad(0.16), { padding: [48, 48], animate: false, maxZoom: 6 });
        }
        changedView = true;
        await new Promise((resolve) => setTimeout(resolve, 180));
      } else {
        showHint('No plotted atlas content yet, exporting the current view.');
      }
    }

    try {
      return await callback();
    } finally {
      if (changedView) {
        map.setView(previousView.center, previousView.zoom, { animate: false });
        map.invalidateSize(false);
      }
    }
  }

  function buildAtlasState(opts) {
    const options = opts || {};
    const atlasState = {
      format: 'mariners-atlas',
      version: 2,
      view: {
        center: [map.getCenter().lat, map.getCenter().lng],
        zoom: map.getZoom()
      },
      settings: { ...settings },
      ports: markers.map(m => ({
        id: m.id,
        name: m.name,
        lat: m.latlng.lat,
        lng: m.latlng.lng,
        details: m.details || '',
        bubbleVisible: !!m.bubbleVisible,
        bubbleLat: m.bubbleLatLng ? m.bubbleLatLng.lat : null,
        bubbleLng: m.bubbleLatLng ? m.bubbleLatLng.lng : null
      })),
      routes: routes.map(r => ({
        fromId: r.fromId,
        toId: r.toId,
        fromName: r.fromName,
        toName: r.toName,
        variant: r.variant,
        km: r.km,
        latlngs: r.latlngs
      }))
    };

    if (options.includeExported !== false) {
      atlasState.exported = new Date().toISOString();
    }

    return atlasState;
  }

  function applyAtlasState(data, opts) {
    const options = opts || {};

    withAutosaveSuspended(() => {
      withHistorySuspended(() => {
        clearAll({ skipDraftSave: true, skipHistorySave: true });

        if (data.settings) {
          applySettings({ ...DEFAULT_SETTINGS, ...data.settings }, { recordDraft: false, recordHistory: false });
        }

        const idMap = {};
        (data.ports || []).forEach((p) => {
          const latlng = L.latLng(p.lat, p.lng);
          const entry = addMarker(latlng, p.name || 'Port', {
            id: p.id,
            details: p.details || '',
            bubbleVisible: !!p.bubbleVisible,
            bubbleLatLng: (p.bubbleLat != null && p.bubbleLng != null)
              ? { lat: p.bubbleLat, lng: p.bubbleLng }
              : null
          });
          idMap[p.id] = entry;
        });

        (data.routes || []).forEach((r) => {
          const a = idMap[r.fromId];
          const b = idMap[r.toId];
          if (!a || !b) return;
          const latlngs = r.latlngs || [[a.latlng.lat, a.latlng.lng], [b.latlng.lat, b.latlng.lng]];
          const km = r.km != null ? r.km : pathLengthKm(latlngs);
          commitRoute(a, b, latlngs, km, r.variant || 'primary');
        });

        if (data.view && Array.isArray(data.view.center)) {
          map.setView(data.view.center, data.view.zoom || map.getZoom());
        } else {
          map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
        }
      });
    });

    if (options.source === 'draft') {
      storedDraft = data;
      refreshDraftUi();
      saveHistoryNow();
      showHint(`Draft restored — ${markers.length} ports, ${routes.length} routes.`);
      return;
    }

    if (options.source === 'history') {
      saveDraftNow();
      return;
    }

    saveDraftNow();
    saveHistoryNow();
    showHint(`Atlas imported — ${markers.length} ports, ${routes.length} routes.`);
  }

  function buildGeoJsonExport() {
    const atlasState = buildAtlasState();
    return {
      type: 'FeatureCollection',
      metadata: {
        format: 'mariners-atlas-geojson',
        version: 1,
        exported: atlasState.exported,
        atlasTitle: atlasState.settings.atlasTitle,
        atlasSubtitle: atlasState.settings.atlasSubtitle,
        settings: atlasState.settings,
        view: atlasState.view
      },
      features: [
        ...atlasState.ports.map((port) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [port.lng, port.lat]
          },
          properties: {
            featureType: 'port',
            id: port.id,
            name: port.name,
            details: port.details,
            bubbleVisible: port.bubbleVisible,
            bubbleLat: port.bubbleLat,
            bubbleLng: port.bubbleLng
          }
        })),
        ...atlasState.routes.map((route) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: route.latlngs.map(([lat, lng]) => [lng, lat])
          },
          properties: {
            featureType: 'route',
            fromId: route.fromId,
            toId: route.toId,
            fromName: route.fromName,
            toName: route.toName,
            variant: route.variant,
            km: route.km
          }
        }))
      ]
    };
  }

  async function exportPNG() {
    if (typeof html2canvas === 'undefined') {
      showHint('Export library unavailable.');
      return;
    }
    const exportScope = exportScopeSelect.value;
    const exportArea = exportAreaSelect.value;
    const exportQuality = exportQualitySelect.value;
    const exportScale = EXPORT_QUALITY_SCALE[exportQuality] || EXPORT_QUALITY_SCALE.high;

    setExportBusy(true, 'Rendering PNG…', 'Preparing the selected frame and quality.');
    map.closePopup();

    try {
      await withPreparedExportFrame(exportArea, async () => {
        document.body.classList.add('exporting', exportScope === 'studio' ? 'export-studio' : 'export-map-only');
        await new Promise((resolve) => setTimeout(resolve, 160));

        const target = exportScope === 'studio' ? document.body : document.getElementById('map');
        const targetRect = target.getBoundingClientRect();
        const canvas = await html2canvas(target, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff',
          logging: false,
          scale: exportScale,
          width: exportScope === 'studio' ? window.innerWidth : Math.ceil(targetRect.width),
          height: exportScope === 'studio' ? window.innerHeight : Math.ceil(targetRect.height),
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: 0,
          scrollY: 0
        });

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG blob generation failed');

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filenameBase = slugifyFilename(settings.atlasTitle || 'open-atlas');
        triggerDownload(blob, `${filenameBase}-${ts}.png`);
      });

      closeExportModal();
      showHint(`PNG exported: ${exportScope === 'studio' ? 'studio view' : 'map only'}, ${exportQuality} quality.`);
    } catch (err) {
      console.error('PNG export error', err);
      showHint('PNG export failed — check console.');
      setExportBusy(false, 'Export PNG', 'Choose the framing and output quality.');
    } finally {
      document.body.classList.remove('exporting', 'export-studio', 'export-map-only');
    }
  }

  function exportJSON() {
    const state = buildAtlasState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(blob, `mariners-atlas-${ts}.json`);
    showHint('Atlas exported as JSON.');
  }

  function exportGeoJSON() {
    const state = buildGeoJsonExport();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/geo+json' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(blob, `mariners-atlas-${ts}.geojson`);
    showHint('Atlas exported as GeoJSON.');
  }

  async function importJSONFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || data.format !== 'mariners-atlas' || !Array.isArray(data.ports)) {
        showHint('Invalid atlas JSON file.');
        return;
      }
      applyAtlasState(data, { source: 'import' });
    } catch (err) {
      console.error('Import failed', err);
      showHint('Import failed — invalid JSON.');
    }
  }

  function restoreDraft() {
    const draft = loadStoredDraft();
    if (!draft) {
      storedDraft = null;
      refreshDraftUi();
      showHint('No saved draft is available.');
      return;
    }

    const currentState = buildAtlasState();
    if (hasAtlasContent(currentState) && !window.confirm('Restore the saved draft and replace the current atlas?')) {
      return;
    }

    applyAtlasState(draft, { source: 'draft' });
  }

  function isEditableTarget(target) {
    return Boolean(target && (target.closest('input, textarea, select') || target.isContentEditable));
  }

  exportPngBtn.addEventListener('click', openExportModal);
  exportJsonBtn.addEventListener('click', exportJSON);
  exportGeoJsonBtn.addEventListener('click', exportGeoJSON);
  importJsonBtn.addEventListener('click', () => jsonFileInput.click());
  undoBtn.addEventListener('click', () => restoreHistory(-1));
  redoBtn.addEventListener('click', () => restoreHistory(1));
  restoreDraftBtn.addEventListener('click', restoreDraft);
  discardDraftBtn.addEventListener('click', () => clearStoredDraft());
  exportCloseBtn.addEventListener('click', closeExportModal);
  exportConfirmBtn.addEventListener('click', exportPNG);
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) closeExportModal();
  });
  [exportScopeSelect, exportAreaSelect, exportQualitySelect].forEach((el) => {
    el.addEventListener('change', updateExportTip);
  });
  jsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importJSONFile(file);
    jsonFileInput.value = '';
  });
  document.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || isEditableTarget(e.target)) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && e.shiftKey) {
      if (historyIndex >= historyStack.length - 1) return;
      e.preventDefault();
      restoreHistory(1);
      return;
    }
    if (key === 'z') {
      if (historyIndex <= 0) return;
      e.preventDefault();
      restoreHistory(-1);
      return;
    }
    if (key === 'y' && !e.shiftKey) {
      if (historyIndex >= historyStack.length - 1) return;
      e.preventDefault();
      restoreHistory(1);
    }
  });

  /* ===== Init ===== */
  populateFontSelect(displayFontSelect, ['cormorant', 'fraunces', 'playfair', 'space']);
  populateFontSelect(bodyFontSelect, ['cormorant', 'fraunces', 'playfair', 'manrope', 'space']);
  populateFontSelect(uiFontSelect, ['jetbrains', 'ibmplexmono', 'space', 'manrope']);
  populatePresetGrid();
  storedDraft = loadStoredDraft();
  refreshDraftUi();
  applySettings(loadStoredSettings() || DEFAULT_SETTINGS, { persist: false, recordDraft: false, recordHistory: false });
  updateExportTip();
  saveHistoryNow();
  systemThemeMedia.addEventListener('change', () => {
    if (settings.themeMode === 'auto') refreshThemeMode();
  });
  map.on('moveend', scheduleDraftSave);

  buildSeaGrid()
    .then(() => {
      seaReady = true;
      chartState.textContent = 'Sea charts loaded';
      chartState.classList.add('ready');
      syncActionState();
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
      }, 250);
      setTimeout(() => showHint('Click the map to anchor a port.'), 800);
    })
    .catch(err => {
      console.error('Failed to load sea charts', err);
      chartState.textContent = 'Charts failed to load';
      loaderText.textContent = 'Failed to load sea charts. Check connection.';
      syncActionState();
    });

  updateStats();
  syncActionState();
