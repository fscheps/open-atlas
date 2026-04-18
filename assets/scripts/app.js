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
  let landFeature = null;
  let presentationLandLayer = null;
  let customAttribution = null;

  map.createPane('presentationLand');
  map.getPane('presentationLand').style.zIndex = 250;
  const BUBBLE_DEFAULT_WIDTH = 236;
  const BUBBLE_MIN_WIDTH = 152;
  const BUBBLE_MAX_WIDTH = 520;
  const BUBBLE_DEFAULT_HEIGHT = 172;
  const BUBBLE_MIN_HEIGHT = 92;
  const BUBBLE_MAX_HEIGHT = 420;
  const BUBBLE_DEFAULT_RIGHT_OFFSET = 76;
  const BUBBLE_DEFAULT_LEFT_GAP = 56;
  const BUBBLE_DEFAULT_TOP_OFFSET = -104;
  const BUBBLE_DEFAULT_BOTTOM_OFFSET = 24;
  const BUBBLE_LEGACY_DISTANCE_LIMIT = 250;
  const BUBBLE_VIEW_MARGIN = 12;
  const bubbleOverlay = L.DomUtil.create('div', 'bubble-overlay', map.getContainer());
  bubbleOverlay.setAttribute('aria-hidden', 'true');

  function refreshPresentationLayerStyle() {
    if (!presentationLandLayer) return;
    presentationLandLayer.setStyle({
      fillColor: settings.landColor,
      fillOpacity: 1,
      color: 'transparent',
      opacity: 0,
      weight: 0,
      stroke: false,
      className: 'presentation-land'
    });
  }

  function setBaseMap(styleKey) {
    if (baseLayer) {
      map.removeLayer(baseLayer);
      baseLayer = null;
    }
    if (presentationLandLayer) {
      map.removeLayer(presentationLandLayer);
    }
    if (customAttribution) {
      map.attributionControl.removeAttribution(customAttribution);
      customAttribution = null;
    }

    if (styleKey === 'presentation') {
      if (presentationLandLayer) presentationLandLayer.addTo(map);
      customAttribution = 'Land data via world-atlas / Natural Earth';
      map.attributionControl.addAttribution(customAttribution);
      return;
    }

    const style = TILE_STYLES[styleKey] || TILE_STYLES.voyager_labels_under;
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
  const panelCollapseBtn = document.getElementById('panelCollapseBtn');
  const panelReopenBtn = document.getElementById('panelReopenBtn');
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
  const workflowPortsBtn = document.getElementById('workflowPortsBtn');
  const workflowRoutesBtn = document.getElementById('workflowRoutesBtn');
  const workflowExportBtn = document.getElementById('workflowExportBtn');
  const panelIntroText = document.getElementById('panelIntroText');
  const pointCountLabel = document.getElementById('pointCountLabel');
  const routeCountLabel = document.getElementById('routeCountLabel');
  const createSectionNote = document.getElementById('createSectionNote');
  const findSavedLabel = document.getElementById('findSavedLabel');

  const nameModal = document.getElementById('nameModal');
  const nameModalTitle = document.getElementById('nameModalTitle');
  const portNameInput = document.getElementById('portNameInput');
  const modalLat = document.getElementById('modalLat');
  const modalLng = document.getElementById('modalLng');
  const nameIconPicker = document.getElementById('nameIconPicker');
  const nameColorPicker = document.getElementById('nameColorPicker');
  const modalSave = document.getElementById('modalSave');
  const modalCancel = document.getElementById('modalCancel');

  const routeChoiceModal = document.getElementById('routeChoiceModal');
  const routeChoices = document.getElementById('routeChoices');
  const routeChoiceSub = document.getElementById('routeChoiceSub');
  const routeChoiceCancel = document.getElementById('routeChoiceCancel');

  const searchModal = document.getElementById('searchModal');
  const searchModalTitle = document.getElementById('searchModalTitle');
  const searchModalSub = document.getElementById('searchModalSub');
  const portSearchInput = document.getElementById('portSearchInput');
  const portSearchResults = document.getElementById('portSearchResults');
  const searchCloseBtn = document.getElementById('searchCloseBtn');

  const confirmModal = document.getElementById('confirmModal');
  const confirmOk = document.getElementById('confirmOk');
  const confirmCancel = document.getElementById('confirmCancel');

  const settingsModal = document.getElementById('settingsModal');
  const settingsTitleInput = document.getElementById('settingsTitleInput');
  const settingsSubtitleInput = document.getElementById('settingsSubtitleInput');
  const atlasModeSelect = document.getElementById('atlasModeSelect');
  const themeModeSelect = document.getElementById('themeModeSelect');
  const mapStyleSelect = document.getElementById('mapStyleSelect');
  const displayFontSelect = document.getElementById('displayFontSelect');
  const bodyFontSelect = document.getElementById('bodyFontSelect');
  const uiFontSelect = document.getElementById('uiFontSelect');
  const calloutStyleSelect = document.getElementById('calloutStyleSelect');
  const connectionStyleSelect = document.getElementById('connectionStyleSelect');
  const accentColorInput = document.getElementById('accentColorInput');
  const markerColorInput = document.getElementById('markerColorInput');
  const routeColorInput = document.getElementById('routeColorInput');
  const routeAltColorInput = document.getElementById('routeAltColorInput');
  const seaColorInput = document.getElementById('seaColorInput');
  const landColorInput = document.getElementById('landColorInput');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const settingsResetBtn = document.getElementById('settingsResetBtn');
  const presetGrid = document.getElementById('presetGrid');
  const settingsPreviewTitle = document.getElementById('settingsPreviewTitle');
  const settingsPreviewSubtitle = document.getElementById('settingsPreviewSubtitle');
  const settingsPreviewNote = document.getElementById('settingsPreviewNote');
  const previewAccentSwatch = document.getElementById('previewAccentSwatch');
  const previewMarkerSwatch = document.getElementById('previewMarkerSwatch');
  const previewRouteSwatch = document.getElementById('previewRouteSwatch');
  const previewAltRouteSwatch = document.getElementById('previewAltRouteSwatch');
  const previewSeaSwatch = document.getElementById('previewSeaSwatch');
  const previewLandSwatch = document.getElementById('previewLandSwatch');
  const portNameFieldLabel = document.getElementById('portNameFieldLabel');
  const deletePointLabel = document.getElementById('deletePointLabel');

  let pendingLatLng = null;
  let isPlottingRoute = false;
  let measureMode = false;
  let measureStartLatLng = null;
  let measurePreviewLayer = null;
  let measurementLayer = null;
  let measurementMeta = null;
  let routeChoiceState = null;
  const ATLAS_FORMAT = 'open-atlas';
  const LEGACY_ATLAS_FORMAT = 'mariners-atlas';
  const ATLAS_GEOJSON_FORMAT = 'open-atlas-geojson';
  const ATLAS_VERSION = 6;
  const SETTINGS_STORAGE_KEY = 'open-atlas-settings-v2';
  const LEGACY_SETTINGS_STORAGE_KEY = 'mariners-atlas-settings-v1';
  const DRAFT_STORAGE_KEY = 'open-atlas-draft-v2';
  const LEGACY_DRAFT_STORAGE_KEY = 'mariners-atlas-draft-v1';
  const UI_STORAGE_KEY = 'open-atlas-ui-v1';
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
  const POINT_ICON_OPTIONS = [
    { key: 'anchor', label: 'Anchor', iconClass: 'fa-anchor' },
    { key: 'location', label: 'Pin', iconClass: 'fa-location-dot' },
    { key: 'ship', label: 'Ship', iconClass: 'fa-ship' },
    { key: 'plane', label: 'Plane', iconClass: 'fa-plane' },
    { key: 'flag', label: 'Flag', iconClass: 'fa-flag' },
    { key: 'building', label: 'City', iconClass: 'fa-building' },
    { key: 'star', label: 'Star', iconClass: 'fa-star' },
    { key: 'mountain', label: 'Landmark', iconClass: 'fa-mountain-sun' }
  ];
  const POINT_COLOR_OPTIONS = [
    '#0b7a75',
    '#18567a',
    '#ca6702',
    '#8b2e1f',
    '#3f7d4c',
    '#6b4f2a',
    '#355070',
    '#d1495b'
  ];
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
      calloutStyle: 'bold',
      connectionStyle: 'straight',
      themeMode: 'auto',
      mapStyle: 'voyager_labels_under',
      seaColor: '#d6e1ea',
      landColor: '#f2eadc'
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
      calloutStyle: 'editorial',
      connectionStyle: 'arc',
      themeMode: 'light',
      mapStyle: 'presentation',
      seaColor: '#d7e7f1',
      landColor: '#f7f4ea'
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
      calloutStyle: 'bold',
      connectionStyle: 'arc',
      themeMode: 'dark',
      mapStyle: 'presentation',
      seaColor: '#0f2636',
      landColor: '#21394d'
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
      calloutStyle: 'subtle',
      connectionStyle: 'arc',
      themeMode: 'light',
      mapStyle: 'voyager_nolabels',
      seaColor: '#d8e7e0',
      landColor: '#efe7d7'
    }
  };
  const DEFAULT_SETTINGS = {
    atlasTitle: 'Open Atlas',
    atlasSubtitle: 'Map Studio',
    atlasMode: 'maritime',
    themeMode: 'light',
    mapStyle: 'positron',
    displayFont: 'fraunces',
    bodyFont: 'manrope',
    uiFont: 'ibmplexmono',
    calloutStyle: 'editorial',
    connectionStyle: 'arc',
    accentColor: '#18567a',
    markerColor: '#0b7a75',
    routeColor: '#18567a',
    routeAltColor: '#ca6702',
    seaColor: '#d7e7f1',
    landColor: '#f7f4ea'
  };
  let settings = { ...DEFAULT_SETTINGS };
  let pendingPointStyle = {
    iconKey: 'anchor',
    markerColor: DEFAULT_SETTINGS.markerColor
  };
  let editingPointStyle = null;
  let draftSaveTimer = null;
  let autosaveSuspended = 0;
  let storedDraft = null;
  let panelHidden = false;
  let historySaveTimer = null;
  let historySuspended = 0;
  let historyStack = [];
  let historyIndex = -1;

  const ATLAS_MODES = ['maritime', 'pins', 'connections'];
  const CALLOUT_STYLES = ['subtle', 'editorial', 'bold'];
  const CONNECTION_STYLES = ['straight', 'arc'];

  function updateStats() {
    portCountEl.textContent = markers.length;
    routeCountEl.textContent = routes.length;
    refreshWorkflowState();
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

  function normalizePointIcon(iconKey) {
    return POINT_ICON_OPTIONS.some((option) => option.key === iconKey) ? iconKey : 'anchor';
  }

  function normalizePointColor(color) {
    return /^#[0-9a-f]{6}$/i.test(String(color || '')) ? String(color) : settings.markerColor || DEFAULT_SETTINGS.markerColor;
  }

  function normalizeAtlasMode(mode) {
    return ATLAS_MODES.includes(mode) ? mode : DEFAULT_SETTINGS.atlasMode;
  }

  function normalizeCalloutStyle(style) {
    return CALLOUT_STYLES.includes(style) ? style : DEFAULT_SETTINGS.calloutStyle;
  }

  function normalizeConnectionStyle(style) {
    return CONNECTION_STYLES.includes(style) ? style : DEFAULT_SETTINGS.connectionStyle;
  }

  function getAtlasMode() {
    return normalizeAtlasMode(settings.atlasMode);
  }

  function isPinsMode() {
    return getAtlasMode() === 'pins';
  }

  function isConnectionsMode() {
    return getAtlasMode() === 'connections';
  }

  function getModeCopy() {
    const mode = getAtlasMode();
    if (mode === 'pins') {
      return {
        mode,
        pointSingular: 'Location',
        pointPlural: 'Locations',
        nameAction: 'Name this Location',
        pointPlaceholder: 'e.g. Buenos Aires',
        findSavedLabel: 'Find saved location',
        searchTitle: 'Find a Saved Location',
        searchSubtitle: 'Search the locations already in this map and jump to one quickly',
        searchEmpty: 'No matching locations in the current map.',
        workflowPoints: '1 Add locations',
        workflowRoutes: '2 Connections off',
        routesLabel: 'Routes',
        intro: 'Click anywhere on the map to add locations, then annotate, save, and share your map.',
        createNote: 'Pins mode keeps this map location-only so you can focus on places, labels, and callouts.',
        drawIdle: 'Connections off in Pins mode',
        drawActive: 'Connections off in Pins mode',
        drawHint: 'Pins mode keeps this atlas location-only.',
        selectionFirst: 'Focus on placing and annotating locations in Pins mode.',
        selectionRepeat: 'Pins mode does not chart routes or connections.',
        chartButtonLabel: 'Connections off',
        deleteLabel: 'Delete Location'
      };
    }
    if (mode === 'connections') {
      return {
        mode,
        pointSingular: 'Location',
        pointPlural: 'Locations',
        nameAction: 'Name this Location',
        pointPlaceholder: 'e.g. Madrid',
        findSavedLabel: 'Find saved location',
        searchTitle: 'Find a Saved Location',
        searchSubtitle: 'Search the locations already in this map and jump to one quickly',
        searchEmpty: 'No matching locations in the current map.',
        workflowPoints: '1 Add locations',
        workflowRoutes: '2 Connect points',
        routesLabel: 'Connections',
        intro: 'Click anywhere on the map to add locations, then connect, annotate, save, and share your map.',
        createNote: 'Connections mode links saved locations with clean straight or arced visuals for network and flight-style maps.',
        drawIdle: 'Add connection',
        drawActive: 'Cancel connection',
        drawHint: `Click two locations to add a ${normalizeConnectionStyle(settings.connectionStyle) === 'arc' ? 'curved arc' : 'straight'} connection.`,
        selectionFirst: 'Start point: ',
        selectionRepeat: 'Location deselected. Choose another location to continue.',
        chartButtonLabel: 'Add connection',
        deleteLabel: 'Delete Location'
      };
    }
    return {
      mode,
      pointSingular: 'Port',
      pointPlural: 'Ports',
      nameAction: 'Name this Port',
      pointPlaceholder: 'e.g. Port of Lisbon',
      findSavedLabel: 'Find saved port',
      searchTitle: 'Find a Saved Port',
      searchSubtitle: 'Search the ports already in this atlas and jump to one quickly',
      searchEmpty: 'No matching ports in the current atlas.',
      workflowPoints: '1 Add ports',
      workflowRoutes: '2 Chart paths',
      routesLabel: 'Routes',
      intro: 'Click anywhere on the map to add ports, then use the tools here to chart, annotate, save, and share your atlas.',
      createNote: 'Build your atlas directly on the map, then refine or clear it from here.',
      drawIdle: 'Chart route',
      drawActive: 'Cancel route',
      drawHint: 'Click two ports to chart a sea route.',
      selectionFirst: 'Origin: ',
      selectionRepeat: 'Port deselected. Choose a port to continue.',
      chartButtonLabel: 'Chart route',
      deleteLabel: 'Delete Port'
    };
  }

  function getPointIcon(iconKey) {
    return POINT_ICON_OPTIONS.find((option) => option.key === normalizePointIcon(iconKey)) || POINT_ICON_OPTIONS[0];
  }

  function buildPointStyle(style) {
    const source = style || {};
    return {
      iconKey: normalizePointIcon(source.iconKey),
      markerColor: normalizePointColor(source.markerColor)
    };
  }

  function normalizeBubbleWidth(value) {
    return Number.isFinite(value) ? Math.round(clamp(value, BUBBLE_MIN_WIDTH, BUBBLE_MAX_WIDTH)) : null;
  }

  function normalizeBubbleHeight(value) {
    return Number.isFinite(value) ? Math.round(clamp(value, BUBBLE_MIN_HEIGHT, BUBBLE_MAX_HEIGHT)) : null;
  }

  function estimateBubbleWidth(name, details) {
    const content = `${name || ''}\n${details || ''}`.trim();
    const longestLine = content
      .split('\n')
      .reduce((max, line) => Math.max(max, line.trim().length), 0);
    const estimated = 184 + longestLine * 3.2;
    return normalizeBubbleWidth(estimated) || BUBBLE_DEFAULT_WIDTH;
  }

  function normalizeBubbleOffset(offset) {
    if (!offset || !Number.isFinite(offset.x) || !Number.isFinite(offset.y)) return null;
    return {
      x: Math.round(offset.x),
      y: Math.round(offset.y)
    };
  }

  function defaultBubbleOffset(portLatLng, width = BUBBLE_DEFAULT_WIDTH) {
    const markerPoint = map.latLngToContainerPoint(portLatLng);
    const mapSize = map.getSize();
    const placeRight = mapSize.x - markerPoint.x >= markerPoint.x;
    return normalizeBubbleOffset({
      x: placeRight ? BUBBLE_DEFAULT_RIGHT_OFFSET : -(width + BUBBLE_DEFAULT_LEFT_GAP),
      y: markerPoint.y < 170 ? BUBBLE_DEFAULT_BOTTOM_OFFSET : BUBBLE_DEFAULT_TOP_OFFSET
    });
  }

  function bubbleOffsetFromLegacyLatLng(portLatLng, bubbleLatLng, width = BUBBLE_DEFAULT_WIDTH) {
    if (!bubbleLatLng) return null;
    const markerPoint = map.latLngToContainerPoint(portLatLng);
    const bubblePoint = map.latLngToContainerPoint(bubbleLatLng);
    const placeRight = bubblePoint.x >= markerPoint.x;
    const offset = normalizeBubbleOffset({
      x: bubblePoint.x - markerPoint.x + (placeRight ? 18 : -(width - 18)),
      y: bubblePoint.y - markerPoint.y - 10
    });
    if (!offset) return null;
    return Math.hypot(offset.x, offset.y) > BUBBLE_LEGACY_DISTANCE_LIMIT ? null : offset;
  }

  function isSupportedAtlasFormat(format) {
    return format === ATLAS_FORMAT || format === LEGACY_ATLAS_FORMAT;
  }

  function normalizeAtlasFormat(data) {
    if (!data || typeof data !== 'object') return null;
    if (!isSupportedAtlasFormat(data.format) || !Array.isArray(data.ports)) return null;
    return {
      ...data,
      format: ATLAS_FORMAT,
      version: typeof data.version === 'number' ? Math.max(data.version, ATLAS_VERSION) : ATLAS_VERSION
    };
  }

  function loadStoredSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY) || localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY) && !localStorage.getItem(SETTINGS_STORAGE_KEY)) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to parse stored settings', err);
      return null;
    }
  }

  function loadUiPrefs() {
    try {
      const raw = localStorage.getItem(UI_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to parse UI preferences', err);
      return null;
    }
  }

  function saveUiPrefs() {
    try {
      localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({ panelHidden }));
    } catch (err) {
      console.warn('Failed to persist UI preferences', err);
    }
  }

  function saveStoredSettings() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      localStorage.removeItem(LEGACY_SETTINGS_STORAGE_KEY);
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
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const data = normalizeAtlasFormat(JSON.parse(raw));
      if (!data) return null;
      if (localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY) && !localStorage.getItem(DRAFT_STORAGE_KEY)) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
      }
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
      : 'Drafts autosave in this browser while you work.';
  }

  function refreshPanelToggleUi() {
    panelCollapseBtn.setAttribute('aria-expanded', String(!panelHidden));
    panelCollapseBtn.setAttribute('aria-label', panelHidden ? 'Map studio is collapsed' : 'Collapse the map studio');
    panelReopenBtn.setAttribute('aria-expanded', String(!panelHidden));
    panelReopenBtn.setAttribute('aria-label', panelHidden ? 'Open the map studio' : 'Map studio is open');
  }

  function setPanelHidden(nextHidden, opts) {
    const options = opts || {};
    panelHidden = !!nextHidden;
    document.body.classList.toggle('panel-hidden', panelHidden);
    refreshPanelToggleUi();
    if (options.persist !== false) saveUiPrefs();
  }

  function clearStoredDraft(opts) {
    const options = opts || {};
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
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
      historyNote.textContent = 'Undo with Cmd/Ctrl+Z. Redo with Shift+Cmd/Ctrl+Z.';
    }
  }

  function refreshWorkflowState() {
    const exportOpen = typeof exportModal !== 'undefined' && exportModal.classList.contains('show');
    const activeStep = exportOpen || routes.length
      ? 'export'
      : (isPinsMode() ? 'ports' : (drawMode || markers.length >= 2 ? 'routes' : 'ports'));

    [
      [workflowPortsBtn, activeStep === 'ports'],
      [workflowRoutesBtn, !isPinsMode() && activeStep === 'routes'],
      [workflowExportBtn, activeStep === 'export']
    ].forEach(([button, active]) => {
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
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
    atlasModeSelect.value = getAtlasMode();
    themeModeSelect.value = settings.themeMode;
    mapStyleSelect.value = settings.mapStyle;
    displayFontSelect.value = settings.displayFont;
    bodyFontSelect.value = settings.bodyFont;
    uiFontSelect.value = settings.uiFont;
    calloutStyleSelect.value = normalizeCalloutStyle(settings.calloutStyle);
    connectionStyleSelect.value = normalizeConnectionStyle(settings.connectionStyle);
    accentColorInput.value = settings.accentColor;
    markerColorInput.value = settings.markerColor;
    routeColorInput.value = settings.routeColor;
    routeAltColorInput.value = settings.routeAltColor;
    seaColorInput.value = settings.seaColor;
    landColorInput.value = settings.landColor;
    refreshSettingsPreview();
  }

  function refreshSettingsPreview() {
    const copy = getModeCopy();
    settingsPreviewTitle.textContent = settings.atlasTitle || DEFAULT_SETTINGS.atlasTitle;
    settingsPreviewSubtitle.textContent = settings.atlasSubtitle || DEFAULT_SETTINGS.atlasSubtitle;
    settingsPreviewTitle.style.fontFamily = FONT_STACKS[settings.displayFont] || FONT_STACKS.fraunces;
    settingsPreviewSubtitle.style.fontFamily = FONT_STACKS[settings.uiFont] || FONT_STACKS.ibmplexmono;
    settingsPreviewNote.style.fontFamily = FONT_STACKS[settings.bodyFont] || FONT_STACKS.manrope;
    settingsPreviewTitle.style.color = settings.accentColor;
    previewAccentSwatch.style.background = settings.accentColor;
    previewMarkerSwatch.style.background = settings.markerColor;
    previewRouteSwatch.style.background = settings.routeColor;
    previewAltRouteSwatch.style.background = settings.routeAltColor;
    previewSeaSwatch.style.background = settings.seaColor;
    previewLandSwatch.style.background = settings.landColor;
    const calloutLabel = normalizeCalloutStyle(settings.calloutStyle);
    const connectionLabel = normalizeConnectionStyle(settings.connectionStyle);
    settingsPreviewNote.textContent = settings.mapStyle === 'presentation'
      ? `Presentation Flat uses your custom sea and land palette for quieter ${copy.mode === 'maritime' ? 'atlas' : 'map'} exports, with ${calloutLabel} callouts and ${connectionLabel} connections.`
      : `Tile basemaps keep geographic labels while your overlays inherit the palette, type choices, ${calloutLabel} callout treatment, and ${connectionLabel} connections.`;
    settingsPreview.dataset.calloutStyle = normalizeCalloutStyle(settings.calloutStyle);
  }

  function refreshModeUi() {
    const copy = getModeCopy();
    panelIntroText.textContent = copy.intro;
    workflowPortsBtn.textContent = copy.workflowPoints;
    workflowRoutesBtn.textContent = copy.workflowRoutes;
    pointCountLabel.textContent = copy.pointPlural;
    routeCountLabel.textContent = copy.routesLabel;
    createSectionNote.textContent = copy.createNote;
    findSavedLabel.textContent = copy.findSavedLabel;
    nameModalTitle.textContent = copy.nameAction;
    portNameInput.placeholder = copy.pointPlaceholder;
    portNameFieldLabel.textContent = `${copy.pointSingular} Name`;
    deletePointLabel.textContent = copy.deleteLabel;
    searchModalTitle.textContent = copy.searchTitle;
    searchModalSub.textContent = copy.searchSubtitle;
    workflowRoutesBtn.hidden = isPinsMode();
    drawBtn.hidden = isPinsMode();
    drawBtn.disabled = isPinsMode();
    drawLabel.textContent = drawMode ? copy.drawActive : copy.drawIdle;
  }

  function renderIconPicker(container, selectedIconKey, onSelect) {
    const activeIcon = normalizePointIcon(selectedIconKey);
    container.innerHTML = POINT_ICON_OPTIONS.map((option) => `
      <button class="icon-choice${option.key === activeIcon ? ' is-selected' : ''}" type="button" data-icon-key="${option.key}" aria-label="${option.label}" title="${option.label}">
        <i class="fa-solid ${option.iconClass}"></i>
      </button>
    `).join('');
    container.querySelectorAll('[data-icon-key]').forEach((button) => {
      button.addEventListener('click', () => onSelect(button.dataset.iconKey));
    });
  }

  function renderColorPicker(container, selectedColor, onSelect) {
    const activeColor = normalizePointColor(selectedColor);
    container.innerHTML = POINT_COLOR_OPTIONS.map((color) => `
      <button class="color-choice${color.toLowerCase() === activeColor.toLowerCase() ? ' is-selected' : ''}" type="button" data-color-value="${color}" aria-label="Select ${color} marker color" title="${color}" style="background:${color};"></button>
    `).join('');
    container.querySelectorAll('[data-color-value]').forEach((button) => {
      button.addEventListener('click', () => onSelect(button.dataset.colorValue));
    });
  }

  function refreshPendingPointStyleUi() {
    renderIconPicker(nameIconPicker, pendingPointStyle.iconKey, (iconKey) => {
      pendingPointStyle.iconKey = iconKey;
      refreshPendingPointStyleUi();
    });
    renderColorPicker(nameColorPicker, pendingPointStyle.markerColor, (markerColor) => {
      pendingPointStyle.markerColor = markerColor;
      refreshPendingPointStyleUi();
    });
  }

  function refreshEditingPointStyleUi() {
    renderIconPicker(portEditIconPicker, editingPointStyle.iconKey, (iconKey) => {
      editingPointStyle.iconKey = iconKey;
      refreshEditingPointStyleUi();
    });
    renderColorPicker(portEditColorPicker, editingPointStyle.markerColor, (markerColor) => {
      editingPointStyle.markerColor = markerColor;
      refreshEditingPointStyleUi();
    });
  }

  function applySettings(nextSettings, opts) {
    const options = opts || {};
    const previousSettings = { ...settings };
    settings = {
      ...settings,
      ...nextSettings,
      atlasMode: normalizeAtlasMode(nextSettings && nextSettings.atlasMode !== undefined ? nextSettings.atlasMode : settings.atlasMode),
      calloutStyle: normalizeCalloutStyle(nextSettings && nextSettings.calloutStyle !== undefined ? nextSettings.calloutStyle : settings.calloutStyle),
      connectionStyle: normalizeConnectionStyle(nextSettings && nextSettings.connectionStyle !== undefined ? nextSettings.connectionStyle : settings.connectionStyle)
    };
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
    document.documentElement.style.setProperty('--sea-color', settings.seaColor);
    document.documentElement.style.setProperty('--land-color', settings.landColor);
    if (nextSettings.markerColor && nextSettings.markerColor !== previousSettings.markerColor) {
      markers.forEach((entry) => {
        if (normalizePointColor(entry.markerColor).toLowerCase() === previousSettings.markerColor.toLowerCase()) {
          entry.markerColor = nextSettings.markerColor;
          updateMarkerAppearance(entry);
        }
      });
    }
    atlasTitleText.textContent = settings.atlasTitle;
    atlasSubtitleText.textContent = settings.atlasSubtitle;
    loaderTitle.textContent = settings.atlasTitle;
    refreshPresentationLayerStyle();
    setBaseMap(settings.mapStyle);
    if (isPinsMode() && drawMode) {
      drawMode = false;
      selectedForRoute = [];
      refreshMarkerVisuals();
      hideHint();
    }
    refreshSettingsForm();
    refreshModeUi();
    refreshRouteLayers();
    syncActionState();
    refreshWorkflowState();
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
    requestAnimationFrame(() => {
      map.invalidateSize(false);
      refreshAllBubbles();
    });
  }

  function syncActionState() {
    const routeChoiceOpen = routeChoiceModal.classList.contains('show');
    const routeUnavailable = isPinsMode()
      || isPlottingRoute
      || routeChoiceOpen
      || (!isConnectionsMode() && !seaReady);
    drawBtn.disabled = routeUnavailable;
    findPortBtn.disabled = isPlottingRoute || routeChoiceOpen;
    measureBtn.disabled = isPlottingRoute || routeChoiceOpen;
  }

  /* ===== Ports ===== */
  function makeIcon(style) {
    const pointStyle = buildPointStyle(style);
    const icon = getPointIcon(pointStyle.iconKey);
    return L.divIcon({
      className: 'port-marker',
      html: `<div class="port-marker-inner" style="--point-fill:${pointStyle.markerColor}"><i class="fa-solid ${icon.iconClass}"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  function updateMarkerAppearance(entry) {
    entry.marker.setIcon(makeIcon(entry));
    if (entry.bubbleVisible) {
      updateBubbleContent(entry);
    }
  }

  function openNameModal(latlng) {
    pendingLatLng = latlng;
    modalLat.textContent = latlng.lat.toFixed(3);
    modalLng.textContent = latlng.lng.toFixed(3);
    portNameInput.value = '';
    pendingPointStyle = {
      iconKey: 'anchor',
      markerColor: settings.markerColor
    };
    refreshPendingPointStyleUi();
    nameModal.classList.add('show');
    setTimeout(() => portNameInput.focus(), 60);
  }
  function closeNameModal() {
    nameModal.classList.remove('show');
    pendingLatLng = null;
  }
  function savePort() {
    if (!pendingLatLng) return;
    const name = (portNameInput.value || '').trim() || `${getModeCopy().pointSingular} ${nextId}`;
    addMarker(pendingLatLng, name, pendingPointStyle);
    closeNameModal();
  }

  function addMarker(latlng, name, opts) {
    opts = opts || {};
    const id = opts.id || nextId++;
    if (id >= nextId) nextId = id + 1;
    const pointStyle = buildPointStyle(opts);
    const marker = L.marker(latlng, { icon: makeIcon(pointStyle) }).addTo(map);
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
      iconKey: pointStyle.iconKey,
      markerColor: pointStyle.markerColor,
      details: opts.details || '',
      bubbleVisible: false,
      bubbleWidth: normalizeBubbleWidth(opts.bubbleWidth) || estimateBubbleWidth(name, opts.details || ''),
      bubbleHeight: normalizeBubbleHeight(opts.bubbleHeight) || estimateBubbleHeight({ details: opts.details || '' }),
      bubbleOffset: normalizeBubbleOffset({
        x: opts.bubbleOffsetX,
        y: opts.bubbleOffsetY
      }) || bubbleOffsetFromLegacyLatLng(
        L.latLng(latlng.lat, latlng.lng),
        opts.bubbleLatLng ? L.latLng(opts.bubbleLatLng.lat, opts.bubbleLatLng.lng) : null,
        normalizeBubbleWidth(opts.bubbleWidth) || BUBBLE_DEFAULT_WIDTH
      ),
      bubble: null,
      bubbleInteractable: null
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
  const portEditIconPicker = document.getElementById('portEditIconPicker');
  const portEditColorPicker = document.getElementById('portEditColorPicker');
  const portEditDetails = document.getElementById('portEditDetails');
  const bubbleToggle = document.getElementById('bubbleToggle');
  const portSaveBtn = document.getElementById('portSaveBtn');
  const portCancelBtn = document.getElementById('portCancelBtn');
  const portDeleteBtn = document.getElementById('portDeleteBtn');
  let editingPort = null;

  function openPortModal(entry) {
    editingPort = entry;
    editingPointStyle = {
      iconKey: entry.iconKey,
      markerColor: entry.markerColor
    };
    portModalTitle.textContent = entry.name;
    portModalSub.textContent = `${entry.latlng.lat.toFixed(3)}° • ${entry.latlng.lng.toFixed(3)}°`;
    portEditName.value = entry.name;
    refreshEditingPointStyleUi();
    portEditDetails.value = entry.details || '';
    bubbleToggle.checked = !!entry.bubbleVisible;
    portModal.classList.add('show');
    setTimeout(() => portEditName.focus(), 60);
  }

  function closePortModal() {
    portModal.classList.remove('show');
    editingPort = null;
    editingPointStyle = null;
  }

  function savePortEdits() {
    if (!editingPort) return;
    const newName = (portEditName.value || '').trim() || editingPort.name;
    const newDetails = portEditDetails.value || '';
    const wantBubble = bubbleToggle.checked;
    editingPort.iconKey = normalizePointIcon(editingPointStyle.iconKey);
    editingPort.markerColor = normalizePointColor(editingPointStyle.markerColor);

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

    updateMarkerAppearance(editingPort);

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
  function getBubbleWidth(entry) {
    return normalizeBubbleWidth(entry.bubbleWidth) || BUBBLE_DEFAULT_WIDTH;
  }

  function getBubbleHeight(entry) {
    return normalizeBubbleHeight(entry.bubbleHeight) || estimateBubbleHeight(entry) || BUBBLE_DEFAULT_HEIGHT;
  }

  function getMarkerRect(entry) {
    const markerEl = entry.marker && entry.marker.getElement();
    if (!markerEl) return null;
    const markerRect = markerEl.getBoundingClientRect();
    const mapRect = map.getContainer().getBoundingClientRect();
    return {
      left: markerRect.left - mapRect.left,
      top: markerRect.top - mapRect.top,
      right: markerRect.right - mapRect.left,
      bottom: markerRect.bottom - mapRect.top,
      width: markerRect.width,
      height: markerRect.height
    };
  }

  function getMarkerAnchorPoint(markerRect, targetX, targetY, fallbackX, fallbackY) {
    if (!markerRect) return { x: fallbackX, y: fallbackY };
    const cx = markerRect.left + markerRect.width / 2;
    const cy = markerRect.top + markerRect.height / 2;
    const dx = targetX - cx;
    const dy = targetY - cy;
    const halfW = Math.max(1, markerRect.width / 2);
    const halfH = Math.max(1, markerRect.height / 2);
    const scale = 1 / Math.max(Math.abs(dx) / halfW || 0, Math.abs(dy) / halfH || 0, 1);
    return {
      x: cx + dx * scale,
      y: cy + dy * scale
    };
  }

  function getBubbleOffset(entry) {
    const offset = normalizeBubbleOffset(entry.bubbleOffset);
    if (!offset) return defaultBubbleOffset(entry.latlng, getBubbleWidth(entry));
    return offset;
  }

  function estimateBubbleHeight(entry) {
    const detailLines = String(entry.details || '')
      .split('\n')
      .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 22)), 0);
    return clamp(BUBBLE_DEFAULT_HEIGHT + detailLines * 20, 132, 320);
  }

  function getBubbleTypography(entry, layout) {
    const titleLength = (entry.name || '').trim().length;
    const bodyLength = (entry.details || '').trim().length;
    const widthRatio = clamp(
      (layout.width - BUBBLE_MIN_WIDTH) / Math.max(1, BUBBLE_DEFAULT_WIDTH - BUBBLE_MIN_WIDTH),
      0,
      1.35
    );
    const heightRatio = clamp(
      (layout.height - BUBBLE_MIN_HEIGHT) / Math.max(1, BUBBLE_DEFAULT_HEIGHT - BUBBLE_MIN_HEIGHT),
      0,
      1.65
    );
    const sizeRatio = widthRatio * 0.58 + heightRatio * 0.42;
    const textPressure = clamp((titleLength * 0.8 + bodyLength - 96) / 150, 0, 1.55);
    const compactness = clamp(
      (BUBBLE_DEFAULT_WIDTH - layout.width) / 92 + (BUBBLE_DEFAULT_HEIGHT - layout.height) / 92,
      0,
      1.55
    );

    return {
      padX: Math.round(clamp(12, 14 + widthRatio * 5 - compactness * 2.2, 20)),
      padTop: Math.round(clamp(10, 12 + heightRatio * 4 - compactness * 1.5, 18)),
      padBottom: Math.round(clamp(10, 14 + heightRatio * 4 - compactness * 2.1, 20)),
      gap: Math.round(clamp(4, 6 + heightRatio * 3 - compactness * 2.2, 10)),
      titleSize: Math.round(clamp(9.2, 10 + sizeRatio * 1 - textPressure * 0.35, 11.8) * 10) / 10,
      titleSpacing: Math.round(clamp(1.05, 1.45 + sizeRatio * 0.22 - textPressure * 0.1, 1.78) * 100) / 100,
      bodySize: Math.round(clamp(12.2, 13.6 + sizeRatio * 1.7 - textPressure * 1.18, 16.8) * 10) / 10,
      lineHeight: Math.round(clamp(1.18, 1.3 + sizeRatio * 0.08 - textPressure * 0.08, 1.44) * 100) / 100,
      bodyRight: Math.round(clamp(8, 10 + widthRatio * 4 - compactness * 1.6, 18))
    };
  }

  function buildBubbleTailGeometry(anchorX, anchorY, left, top, width, height, calloutStyle) {
    const rect = { left, top, right: left + width, bottom: top + height };
    const anchor = { x: anchorX, y: anchorY };
    const radius = 18;
    const style = normalizeCalloutStyle(calloutStyle);
    const baseHalf = style === 'bold'
      ? clamp(14, Math.min(width, height) * 0.12, 22)
      : style === 'subtle'
        ? clamp(7, Math.min(width, height) * 0.06, 12)
        : clamp(10, Math.min(width, height) * 0.08, 18);
    let p1;
    let p2;
    let baseCenter;

    if (anchor.x < rect.left) {
      const cy = clamp(anchor.y, rect.top + radius + baseHalf, rect.bottom - radius - baseHalf);
      p1 = { x: rect.left, y: cy - baseHalf };
      p2 = { x: rect.left, y: cy + baseHalf };
      baseCenter = { x: rect.left, y: cy };
    } else if (anchor.x > rect.right) {
      const cy = clamp(anchor.y, rect.top + radius + baseHalf, rect.bottom - radius - baseHalf);
      p1 = { x: rect.right, y: cy + baseHalf };
      p2 = { x: rect.right, y: cy - baseHalf };
      baseCenter = { x: rect.right, y: cy };
    } else if (anchor.y < rect.top) {
      const cx = clamp(anchor.x, rect.left + radius + baseHalf, rect.right - radius - baseHalf);
      p1 = { x: cx + baseHalf, y: rect.top };
      p2 = { x: cx - baseHalf, y: rect.top };
      baseCenter = { x: cx, y: rect.top };
    } else {
      const cx = clamp(anchor.x, rect.left + radius + baseHalf, rect.right - radius - baseHalf);
      p1 = { x: cx - baseHalf, y: rect.bottom };
      p2 = { x: cx + baseHalf, y: rect.bottom };
      baseCenter = { x: cx, y: rect.bottom };
    }

    const dx = anchor.x - baseCenter.x;
    const dy = anchor.y - baseCenter.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / distance;
    const uy = dy / distance;
    const px = -uy;
    const py = ux;
    const tipHalf = style === 'bold'
      ? clamp(4, distance * 0.04, 7)
      : style === 'subtle'
        ? clamp(1.8, distance * 0.018, 3.2)
        : clamp(2.5, distance * 0.03, 5);
    const tip1 = { x: anchor.x + px * tipHalf, y: anchor.y + py * tipHalf };
    const tip2 = { x: anchor.x - px * tipHalf, y: anchor.y - py * tipHalf };
    const curvePull = style === 'bold'
      ? Math.min(84, distance * 0.5)
      : style === 'subtle'
        ? Math.min(56, distance * 0.32)
        : Math.min(70, distance * 0.42);
    const basePull = style === 'bold'
      ? Math.min(50, distance * 0.28)
      : style === 'subtle'
        ? Math.min(30, distance * 0.16)
        : Math.min(42, distance * 0.22);
    const control1a = {
      x: p1.x + ux * basePull,
      y: p1.y + uy * basePull
    };
    const control1b = {
      x: tip1.x - ux * curvePull,
      y: tip1.y - uy * curvePull
    };
    const control2a = {
      x: tip2.x - ux * curvePull,
      y: tip2.y - uy * curvePull
    };
    const control2b = {
      x: p2.x + ux * basePull,
      y: p2.y + uy * basePull
    };
    const baseReturn1 = {
      x: p2.x + (baseCenter.x - p2.x) * 0.42,
      y: p2.y + (baseCenter.y - p2.y) * 0.42
    };
    const baseReturn2 = {
      x: p1.x + (baseCenter.x - p1.x) * 0.42,
      y: p1.y + (baseCenter.y - p1.y) * 0.42
    };

    return {
      path: `M ${p1.x} ${p1.y} C ${control1a.x} ${control1a.y} ${control1b.x} ${control1b.y} ${tip1.x} ${tip1.y} Q ${anchor.x} ${anchor.y} ${tip2.x} ${tip2.y} C ${control2a.x} ${control2a.y} ${control2b.x} ${control2b.y} ${p2.x} ${p2.y} C ${baseReturn1.x} ${baseReturn1.y} ${baseReturn2.x} ${baseReturn2.y} ${p1.x} ${p1.y} Z`
    };
  }

  function getBubbleLayout(entry, overrides) {
    const options = overrides || {};
    const size = map.getSize();
    const anchorPoint = map.latLngToContainerPoint(entry.latlng);
    const maxWidth = Math.max(BUBBLE_MIN_WIDTH, size.x - BUBBLE_VIEW_MARGIN * 2);
    const maxHeight = Math.max(BUBBLE_MIN_HEIGHT, size.y - BUBBLE_VIEW_MARGIN * 2);
    const width = Math.round(clamp(
      normalizeBubbleWidth(options.width != null ? options.width : entry.bubbleWidth) || BUBBLE_DEFAULT_WIDTH,
      BUBBLE_MIN_WIDTH,
      maxWidth
    ));
    const height = Math.round(clamp(
      normalizeBubbleHeight(options.height != null ? options.height : entry.bubbleHeight) || estimateBubbleHeight(entry),
      BUBBLE_MIN_HEIGHT,
      maxHeight
    ));
    const offset = normalizeBubbleOffset(options.offset != null ? options.offset : entry.bubbleOffset)
      || defaultBubbleOffset(entry.latlng, width);
    const unclampedLeft = anchorPoint.x + offset.x;
    const unclampedTop = anchorPoint.y + offset.y;
    const left = clamp(unclampedLeft, BUBBLE_VIEW_MARGIN, Math.max(BUBBLE_VIEW_MARGIN, size.x - width - BUBBLE_VIEW_MARGIN));
    const top = clamp(unclampedTop, BUBBLE_VIEW_MARGIN, Math.max(BUBBLE_VIEW_MARGIN, size.y - height - BUBBLE_VIEW_MARGIN));

    return {
      anchorX: anchorPoint.x,
      anchorY: anchorPoint.y,
      left: Math.round(left),
      top: Math.round(top),
      width,
      height,
      offset: {
        x: Math.round(left - anchorPoint.x),
        y: Math.round(top - anchorPoint.y)
      }
    };
  }

  function getLegacyBubbleLatLng(entry) {
    const layout = getBubbleLayout(entry);
    const bubblePoint = L.point(layout.left + Math.min(layout.width * 0.45, 96), layout.top + 28);
    return map.containerPointToLatLng(bubblePoint);
  }

  function ensureBubbleDom(entry) {
    if (!entry.bubble) return null;
    let tailSvg = entry.bubble.querySelector('.bubble-tail-svg');
    let tailPath = tailSvg && tailSvg.querySelector('path');
    let card = entry.bubble.querySelector('.info-bubble');
    if (!tailSvg || !tailPath || !card) {
      entry.bubble.innerHTML = `
        <svg class="bubble-tail-svg" aria-hidden="true"><path></path></svg>
        <div class="info-bubble" data-bubble-id="${entry.id}">
          <div class="bubble-title"></div>
          <div class="bubble-handle"><i class="fa-solid fa-up-down-left-right"></i></div>
          <div class="bubble-body"></div>
          <div class="bubble-resize-grip" aria-hidden="true"></div>
        </div>
      `;
      tailSvg = entry.bubble.querySelector('.bubble-tail-svg');
      tailPath = tailSvg.querySelector('path');
      card = entry.bubble.querySelector('.info-bubble');
    }
    return { tailSvg, tailPath, card };
  }

  function applyBubbleDom(entry, layout) {
    const dom = ensureBubbleDom(entry);
    if (!dom) return;
    const { name, details } = entry;
    const safeDetails = escapeHtml(details || '').trim() || '<em style="opacity:.6">No details yet</em>';
    const bubbleAccent = normalizePointColor(entry.markerColor);
    const baseCenterX = layout.left + layout.width / 2;
    const baseCenterY = layout.top + layout.height / 2;
    const markerRect = getMarkerRect(entry);
    const markerAnchor = getMarkerAnchorPoint(markerRect, baseCenterX, baseCenterY, layout.anchorX, layout.anchorY);
    const calloutStyle = normalizeCalloutStyle(settings.calloutStyle);
    const tail = buildBubbleTailGeometry(markerAnchor.x, markerAnchor.y, layout.left, layout.top, layout.width, layout.height, calloutStyle);
    const mapSize = map.getSize();
    dom.tailSvg.setAttribute('viewBox', `0 0 ${mapSize.x} ${mapSize.y}`);
    dom.tailPath.setAttribute('d', tail.path);
    dom.card.dataset.bubbleId = String(entry.id);
    dom.card.dataset.calloutStyle = calloutStyle;
    entry.bubble.dataset.calloutStyle = calloutStyle;
    dom.card.style.setProperty('--bubble-accent', bubbleAccent);
    dom.card.style.left = `${layout.left}px`;
    dom.card.style.top = `${layout.top}px`;
    dom.card.style.width = `${layout.width}px`;
    dom.card.style.height = `${layout.height}px`;
    const typography = getBubbleTypography(entry, layout);
    dom.card.style.setProperty('--bubble-pad-x', `${typography.padX}px`);
    dom.card.style.setProperty('--bubble-pad-top', `${typography.padTop}px`);
    dom.card.style.setProperty('--bubble-pad-bottom', `${typography.padBottom}px`);
    dom.card.style.setProperty('--bubble-gap', `${typography.gap}px`);
    dom.card.style.setProperty('--bubble-title-size', `${typography.titleSize}px`);
    dom.card.style.setProperty('--bubble-title-spacing', `${typography.titleSpacing}px`);
    dom.card.style.setProperty('--bubble-body-size', `${typography.bodySize}px`);
    dom.card.style.setProperty('--bubble-body-line-height', `${typography.lineHeight}`);
    dom.card.style.setProperty('--bubble-body-right', `${typography.bodyRight}px`);
    const titleEl = dom.card.querySelector('.bubble-title');
    const bodyEl = dom.card.querySelector('.bubble-body');
    if (titleEl) titleEl.textContent = name;
    if (bodyEl) bodyEl.innerHTML = safeDetails;
  }

  function persistBubbleLayout(entry, layout) {
    entry.bubbleOffset = normalizeBubbleOffset(layout.offset);
    entry.bubbleWidth = normalizeBubbleWidth(layout.width) || BUBBLE_DEFAULT_WIDTH;
    entry.bubbleHeight = normalizeBubbleHeight(layout.height) || estimateBubbleHeight(entry);
  }

  function teardownBubbleInteraction(entry) {
    if (entry.bubbleInteractable) {
      entry.bubbleInteractable.unset();
      entry.bubbleInteractable = null;
    }
  }

  function initBubbleInteraction(entry) {
    if (!entry.bubble || typeof interact !== 'function') return;
    const card = entry.bubble.querySelector('.info-bubble');
    const grip = entry.bubble.querySelector('.bubble-resize-grip');
    if (!card) return;
    teardownBubbleInteraction(entry);
    const finish = () => {
      map.dragging.enable();
      scheduleDraftSave();
      scheduleHistorySnapshot();
    };
    card.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    const interactable = interact(card)
      .draggable({
        ignoreFrom: '.bubble-resize-grip',
        listeners: {
          start() {
            map.dragging.disable();
          },
          move(event) {
            const nextOffset = normalizeBubbleOffset({
              x: getBubbleOffset(entry).x + event.dx,
              y: getBubbleOffset(entry).y + event.dy
            });
            const layout = getBubbleLayout(entry, { offset: nextOffset });
            persistBubbleLayout(entry, layout);
            updateBubbleContent(entry);
          },
          end: finish
        }
      });
    entry.bubbleInteractable = interactable;

    if (grip) {
      grip.onpointerdown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = getBubbleWidth(entry);
        const startHeight = getBubbleHeight(entry);
        map.dragging.disable();

        const onMove = (moveEvent) => {
          const layout = getBubbleLayout(entry, {
            width: startWidth + (moveEvent.clientX - startX),
            height: startHeight + (moveEvent.clientY - startY)
          });
          persistBubbleLayout(entry, layout);
          updateBubbleContent(entry);
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          finish();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      };
    }
  }

  function refreshAllBubbles() {
    markers.forEach((entry) => {
      if (entry.bubbleVisible) updateBubbleContent(entry);
    });
  }

  function showBubble(entry) {
    if (entry.bubble) return;
    if (!entry.bubbleOffset) entry.bubbleOffset = defaultBubbleOffset(entry.latlng, getBubbleWidth(entry));
    entry.bubbleVisible = true;
    const bubble = document.createElement('div');
    bubble.className = 'map-bubble-wrapper';
    bubble.dataset.bubbleId = String(entry.id);
    bubbleOverlay.appendChild(bubble);
    entry.bubble = bubble;
    updateBubbleContent(entry);
    initBubbleInteraction(entry);
  }

  function updateBubbleContent(entry) {
    if (!entry.bubble) return;
    const layout = getBubbleLayout(entry);
    persistBubbleLayout(entry, layout);
    applyBubbleDom(entry, layout);
    if (!entry.bubbleInteractable) initBubbleInteraction(entry);
  }

  function hideBubble(entry) {
    entry.bubbleVisible = false;
    if (entry.bubble) {
      teardownBubbleInteraction(entry);
      entry.bubble.remove();
      entry.bubble = null;
    }
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
  panelCollapseBtn.addEventListener('click', () => setPanelHidden(true));
  panelReopenBtn.addEventListener('click', () => setPanelHidden(false));
  workflowPortsBtn.addEventListener('click', () => {
    setPanelHidden(false);
    setDrawMode(false);
    setMeasureMode(false);
    showHint(`Click anywhere on the map to add a ${getModeCopy().pointSingular.toLowerCase()}.`, true);
  });
  workflowRoutesBtn.addEventListener('click', () => {
    setPanelHidden(false);
    if (isPinsMode()) {
      showHint(getModeCopy().drawHint);
      return;
    }
    if (markers.length < 2) {
      showHint(`Add at least two ${getModeCopy().pointPlural.toLowerCase()} before continuing.`);
      return;
    }
    setDrawMode(true);
  });
  workflowExportBtn.addEventListener('click', () => {
    setPanelHidden(false);
    openExportModal();
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
    [atlasModeSelect, 'change', () => applySettings({ atlasMode: atlasModeSelect.value })],
    [themeModeSelect, 'change', () => applySettings({ themeMode: themeModeSelect.value })],
    [mapStyleSelect, 'change', () => applySettings({ mapStyle: mapStyleSelect.value })],
    [displayFontSelect, 'change', () => applySettings({ displayFont: displayFontSelect.value })],
    [bodyFontSelect, 'change', () => applySettings({ bodyFont: bodyFontSelect.value })],
    [uiFontSelect, 'change', () => applySettings({ uiFont: uiFontSelect.value })],
    [calloutStyleSelect, 'change', () => applySettings({ calloutStyle: calloutStyleSelect.value })],
    [connectionStyleSelect, 'change', () => applySettings({ connectionStyle: connectionStyleSelect.value })],
    [accentColorInput, 'input', () => applySettings({ accentColor: accentColorInput.value })],
    [markerColorInput, 'input', () => applySettings({ markerColor: markerColorInput.value })],
    [routeColorInput, 'input', () => applySettings({ routeColor: routeColorInput.value })],
    [routeAltColorInput, 'input', () => applySettings({ routeAltColor: routeAltColorInput.value })],
    [seaColorInput, 'input', () => applySettings({ seaColor: seaColorInput.value })],
    [landColorInput, 'input', () => applySettings({ landColor: landColorInput.value })]
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
      portSearchResults.innerHTML = `<div class="search-empty">${escapeHtml(getModeCopy().searchEmpty)}</div>`;
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
    landFeature = land;

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
    presentationLandLayer = L.geoJSON(landFeature, {
      pane: 'presentationLand',
      interactive: false,
      style: () => ({
        fillColor: settings.landColor,
        fillOpacity: 1,
        color: 'transparent',
        opacity: 0,
        weight: 0,
        stroke: false,
        className: 'presentation-land'
      })
    });
    if (settings.mapStyle === 'presentation') {
      setBaseMap('presentation');
    }
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
      showHint(isConnectionsMode() ? 'A connection is already being added.' : 'A route is already being charted.');
      return;
    }
    if (isConnectionsMode()) {
      const latlngs = [[portA.latlng.lat, portA.latlng.lng], [portB.latlng.lat, portB.latlng.lng]];
      const km = haversine(portA.latlng, portB.latlng);
      commitRoute(portA, portB, latlngs, km, 'primary', 'connection');
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
  function drawRouteLayer(latlngs, style = 'primary', preview = false, routeMode = 'maritime') {
    const color = style === 'primary'
      ? getComputedStyle(document.documentElement).getPropertyValue('--route-color').trim()
      : getComputedStyle(document.documentElement).getPropertyValue('--route-alt-color').trim();
    const renderLatLngs = getRenderableRouteLatLngs(latlngs, routeMode);

    if (routeMode === 'connection') {
      const halo = L.polyline(renderLatLngs, {
        color,
        weight: preview ? 9 : 7,
        opacity: preview ? 0.18 : 0.12,
        lineCap: 'round'
      });
      const line = L.polyline(renderLatLngs, {
        color,
        weight: preview ? 3 : 2.5,
        opacity: 0.95,
        dashArray: preview ? '10, 10' : '12, 10',
        lineCap: 'round'
      });
      return L.layerGroup([halo, line]);
    }

    const halo = L.polyline(renderLatLngs, {
      color, weight: preview ? 10 : 8, opacity: preview ? 0.25 : 0.18, lineCap: 'round'
    });
    const line = L.polyline(renderLatLngs, {
      color, weight: preview ? 3 : 2.5, opacity: 0.95,
      dashArray: '8, 10', lineCap: 'round'
    });
    return L.layerGroup([halo, line]);
  }

  function bindRoutePopup(group, portAName, portBName, km, variant, routeMode = 'maritime') {
    const nm = Math.round(km / 1.852);
    group.eachLayer(l => {
      l.bindPopup(`
        <div class="port-popup">
          <strong>${escapeHtml(portAName)} → ${escapeHtml(portBName)}</strong>
          <div class="coord">${Math.round(km).toLocaleString()} km • ${nm.toLocaleString()} nautical mi • ${routeMode === 'connection' ? 'Connection' : (variant === 'primary' ? 'Primary' : 'Alternative')}</div>
        </div>
      `);
    });
  }

  function refreshRouteLayers() {
    const fallbackPointName = getModeCopy().pointSingular;
    routes.forEach((route) => {
      if (route.layer) map.removeLayer(route.layer);
      const nextGroup = drawRouteLayer(route.latlngs, route.variant, false, route.routeMode || 'maritime').addTo(map);
      const from = findPort(route.fromId);
      const to = findPort(route.toId);
      bindRoutePopup(nextGroup, from ? from.name : route.fromName || fallbackPointName, to ? to.name : route.toName || fallbackPointName, route.km, route.variant, route.routeMode || 'maritime');
      route.layer = nextGroup;
      route.fromName = from ? from.name : route.fromName;
      route.toName = to ? to.name : route.toName;
    });
  }

  function offerRouteChoice(portA, portB, primLL, primKm, altLL, altKm) {
    closeRouteChoice({ silent: true });
    // Show both as previews on map
    const primPreview = drawRouteLayer(primLL, 'primary', true, 'maritime').addTo(map);
    const altPreview  = drawRouteLayer(altLL,  'alt',     true, 'maritime').addTo(map);
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
        commitRoute(portA, portB, latlngs, km, variant, 'maritime');
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
    refreshWorkflowState();
    if (!silent) showHint('Route selection cancelled.');
  }

  routeChoiceCancel.addEventListener('click', () => closeRouteChoice());
  routeChoiceModal.addEventListener('click', (e) => {
    if (e.target === routeChoiceModal) closeRouteChoice();
  });

  function getNormalizedLngDelta(fromLng, toLng) {
    let delta = toLng - fromLng;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  }

  function getRenderableConnectionLatLngs(latlngs) {
    if (normalizeConnectionStyle(settings.connectionStyle) !== 'arc' || !Array.isArray(latlngs) || latlngs.length < 2) {
      return latlngs;
    }
    const start = L.latLng(latlngs[0]);
    const endSource = L.latLng(latlngs[latlngs.length - 1]);
    const end = L.latLng(endSource.lat, start.lng + getNormalizedLngDelta(start.lng, endSource.lng));
    const projectionZoom = 4;
    const startPoint = map.project(start, projectionZoom);
    const endPoint = map.project(end, projectionZoom);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 18) return [start, endSource];

    const midpoint = L.point((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2);
    const normal = L.point(-dy / distance, dx / distance);
    const lift = clamp(distance * 0.22, 24, 96);
    const optionA = L.point(normal.x * lift, normal.y * lift);
    const optionB = L.point(-normal.x * lift, -normal.y * lift);
    const chosen = optionA.y < optionB.y ? optionA : optionB;
    const control = L.point(midpoint.x + chosen.x, midpoint.y + chosen.y);
    const points = [];
    let previousLng = null;

    for (let step = 0; step <= 28; step += 1) {
      const t = step / 28;
      const mt = 1 - t;
      const x = mt * mt * startPoint.x + 2 * mt * t * control.x + t * t * endPoint.x;
      const y = mt * mt * startPoint.y + 2 * mt * t * control.y + t * t * endPoint.y;
      const next = map.unproject(L.point(x, y), projectionZoom);
      let lng = next.lng;
      if (previousLng != null) {
        while (lng - previousLng > 180) lng -= 360;
        while (lng - previousLng < -180) lng += 360;
      }
      previousLng = lng;
      points.push(L.latLng(next.lat, lng));
    }
    return points;
  }

  function getRenderableRouteLatLngs(latlngs, routeMode = 'maritime') {
    if (routeMode === 'connection') return getRenderableConnectionLatLngs(latlngs);
    return latlngs;
  }

  function commitRoute(portA, portB, latlngs, km, variant, routeMode = 'maritime') {
    const group = drawRouteLayer(latlngs, variant, false, routeMode).addTo(map);
    const nm = Math.round(km / 1.852);
    bindRoutePopup(group, portA.name, portB.name, km, variant, routeMode);
    routes.push({ layer: group, fromId: portA.id, toId: portB.id, fromName: portA.name, toName: portB.name, variant, km, latlngs, routeMode });
    updateStats();
    refreshWorkflowState();
    showHint(routeMode === 'connection'
      ? `Connection added: ${portA.name} → ${portB.name} (${Math.round(km).toLocaleString()} km)`
      : `Route charted: ${portA.name} → ${portB.name} (${nm.toLocaleString()} nmi)`);
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  /* ===== Draw mode interaction ===== */
  function handleRouteSelection(entry) {
    if (isPlottingRoute || routeChoiceModal.classList.contains('show')) return;
    if (selectedForRoute.some(s => s.id === entry.id)) {
      selectedForRoute = selectedForRoute.filter(s => s.id !== entry.id);
      refreshMarkerVisuals();
      showHint(getModeCopy().selectionRepeat);
      return;
    }
    selectedForRoute.push(entry);
    refreshMarkerVisuals();
    if (selectedForRoute.length === 1) {
      showHint(`${getModeCopy().selectionFirst}${entry.name}. Select destination…`, true);
    } else if (selectedForRoute.length === 2) {
      const [a, b] = selectedForRoute;
      selectedForRoute = [];
      setDrawMode(false);
      plotRoute(a, b);
    }
  }

  function setDrawMode(on) {
    const copy = getModeCopy();
    if (on && isPinsMode()) {
      showHint(copy.drawHint);
      return;
    }
    if (on && !isConnectionsMode() && !seaReady) {
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
    drawLabel.textContent = on ? copy.drawActive : copy.drawIdle;
    if (!on) {
      selectedForRoute = [];
      hideHint();
    } else {
      if (markers.length < 2) {
        showHint(`Place at least two ${copy.pointPlural.toLowerCase()} first.`);
        drawMode = false;
        drawBtn.classList.remove('active');
        drawLabel.textContent = copy.drawIdle;
        refreshWorkflowState();
        return;
      }
      showHint(copy.drawHint, true);
    }
    refreshMarkerVisuals();
    refreshWorkflowState();
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
    measureLabel.textContent = on ? 'Cancel measure' : 'Measure distance';
    if (!on) {
      clearMeasurePreview();
      if (!preserveHint) hideHint();
    } else {
      showHint('Click two points to measure a straight-line distance.', true);
    }
    refreshWorkflowState();
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
  const copyViewBtn = document.getElementById('copyViewBtn');
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportGeoJsonBtn = document.getElementById('exportGeoJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const jsonFileInput = document.getElementById('jsonFileInput');
  const exportModal = document.getElementById('exportModal');
  const exportModalTitle = document.getElementById('exportModalTitle');
  const exportModalSub = document.getElementById('exportModalSub');
  const exportAreaSelect = document.getElementById('exportAreaSelect');
  const exportQualitySelect = document.getElementById('exportQualitySelect');
  const exportTip = document.getElementById('exportTip');
  const exportCloseBtn = document.getElementById('exportCloseBtn');
  const exportConfirmBtn = document.getElementById('exportConfirmBtn');

  function setExportBusy(isBusy, title, sub) {
    exportModalTitle.textContent = title;
    exportModalSub.textContent = sub;
    [exportAreaSelect, exportQualitySelect, exportCloseBtn, exportConfirmBtn].forEach((el) => {
      el.disabled = isBusy;
    });
  }

  function updateExportTip() {
    const frameLabel = exportAreaSelect.value === 'fit-atlas'
      ? 'The camera will temporarily frame all ports, labels, bubbles, and routes before capture.'
      : 'The PNG will match the exact viewport currently on screen.';
    const qualityLabel = exportQualitySelect.value === 'ultra'
      ? 'Ultra quality is best for print but creates the heaviest file.'
      : exportQualitySelect.value === 'standard'
        ? 'Standard quality keeps file size lighter for quick sharing.'
        : 'High quality is the recommended balance for most atlases.';
    exportTip.textContent = `This export captures only the map canvas without the studio sidebar. ${frameLabel} ${qualityLabel}`;
  }

  function openExportModal() {
    setExportBusy(false, 'Export PNG', 'Choose the framing and output quality.');
    updateExportTip();
    exportModal.classList.add('show');
    refreshWorkflowState();
  }

  function closeExportModal() {
    exportModal.classList.remove('show');
    refreshWorkflowState();
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
      if (markerEntry.bubbleVisible && markerEntry.bubble && markerEntry.bubble.isConnected) {
        const bubbleCard = markerEntry.bubble.querySelector('.info-bubble');
        if (bubbleCard) {
          const rect = bubbleCard.getBoundingClientRect();
          const mapRect = map.getContainer().getBoundingClientRect();
          bounds.extend(map.containerPointToLatLng([rect.left - mapRect.left, rect.top - mapRect.top]));
          bounds.extend(map.containerPointToLatLng([rect.right - mapRect.left, rect.bottom - mapRect.top]));
        }
      }
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

  function getAtlasOverlayClientRects() {
    const rects = [];
    const pushRect = (el) => {
      if (!el || !el.isConnected) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      rects.push(rect);
    };

    markers.forEach((entry) => {
      pushRect(entry.marker.getElement());
      const tooltip = entry.marker.getTooltip();
      pushRect(tooltip && tooltip.getElement());
      pushRect(entry.bubble && entry.bubble.querySelector('.info-bubble'));
    });

    return rects;
  }

  async function nudgeViewToFitOverlayRects(margin) {
    const mapRect = map.getContainer().getBoundingClientRect();
    const overlayRects = getAtlasOverlayClientRects();
    if (!overlayRects.length) return;

    const minLeft = Math.min(...overlayRects.map((rect) => rect.left));
    const maxRight = Math.max(...overlayRects.map((rect) => rect.right));
    const minTop = Math.min(...overlayRects.map((rect) => rect.top));
    const maxBottom = Math.max(...overlayRects.map((rect) => rect.bottom));

    const leftOverflow = minLeft - (mapRect.left + margin);
    const rightOverflow = maxRight - (mapRect.right - margin);
    const topOverflow = minTop - (mapRect.top + margin);
    const bottomOverflow = maxBottom - (mapRect.bottom - margin);

    const dx = rightOverflow > 0 ? rightOverflow : (leftOverflow < 0 ? leftOverflow : 0);
    const dy = bottomOverflow > 0 ? bottomOverflow : (topOverflow < 0 ? topOverflow : 0);

    if (dx || dy) {
      map.panBy([dx, dy], { animate: false });
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
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
          map.fitBounds(bounds.pad(0.22), { padding: [112, 112], animate: false, maxZoom: 5 });
        }
        changedView = true;
        await new Promise((resolve) => setTimeout(resolve, 220));
        await nudgeViewToFitOverlayRects(88);
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

  async function renderMapCanvas(frameMode, quality) {
    const exportQuality = quality || 'high';
    const exportScale = EXPORT_QUALITY_SCALE[exportQuality] || EXPORT_QUALITY_SCALE.high;
    map.closePopup();

    return withPreparedExportFrame(frameMode, async () => {
      document.body.classList.add('exporting');
      await new Promise((resolve) => setTimeout(resolve, 180));

      const target = document.getElementById('map');
      const targetRect = target.getBoundingClientRect();
      return html2canvas(target, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff',
        logging: false,
        scale: exportScale,
        width: Math.ceil(targetRect.width),
        height: Math.ceil(targetRect.height),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0
      });
    }).finally(() => {
      document.body.classList.remove('exporting');
    });
  }

  function buildAtlasState(opts) {
    const options = opts || {};
    const atlasState = {
      format: ATLAS_FORMAT,
      version: ATLAS_VERSION,
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
        iconKey: m.iconKey,
        markerColor: m.markerColor,
        details: m.details || '',
        bubbleVisible: !!m.bubbleVisible,
        bubbleWidth: getBubbleWidth(m),
        bubbleHeight: getBubbleHeight(m),
        bubbleOffsetX: getBubbleOffset(m).x,
        bubbleOffsetY: getBubbleOffset(m).y,
        bubbleLat: m.bubbleVisible ? getLegacyBubbleLatLng(m).lat : null,
        bubbleLng: m.bubbleVisible ? getLegacyBubbleLatLng(m).lng : null
      })),
      routes: routes.map(r => ({
        fromId: r.fromId,
        toId: r.toId,
        fromName: r.fromName,
        toName: r.toName,
        variant: r.variant,
        routeMode: r.routeMode || 'maritime',
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
    const normalizedData = normalizeAtlasFormat(data);
    if (!normalizedData) {
      showHint('Import failed — invalid atlas data.');
      return;
    }

    withAutosaveSuspended(() => {
      withHistorySuspended(() => {
        clearAll({ skipDraftSave: true, skipHistorySave: true });

        if (normalizedData.settings) {
          applySettings({ ...DEFAULT_SETTINGS, ...normalizedData.settings }, { recordDraft: false, recordHistory: false });
        }

        if (normalizedData.view && Array.isArray(normalizedData.view.center)) {
          map.setView(normalizedData.view.center, normalizedData.view.zoom || map.getZoom());
        } else {
          map.setView(DEFAULT_VIEW.center, DEFAULT_VIEW.zoom);
        }

        const idMap = {};
        (normalizedData.ports || []).forEach((p) => {
          const latlng = L.latLng(p.lat, p.lng);
          const entry = addMarker(latlng, p.name || getModeCopy().pointSingular, {
            id: p.id,
            iconKey: p.iconKey,
            markerColor: p.markerColor,
            details: p.details || '',
            bubbleVisible: !!p.bubbleVisible,
            bubbleWidth: p.bubbleWidth,
            bubbleHeight: p.bubbleHeight,
            bubbleOffsetX: p.bubbleOffsetX,
            bubbleOffsetY: p.bubbleOffsetY,
            bubbleLatLng: (p.bubbleLat != null && p.bubbleLng != null)
              ? { lat: p.bubbleLat, lng: p.bubbleLng }
              : null
          });
          idMap[p.id] = entry;
        });

        (normalizedData.routes || []).forEach((r) => {
          const a = idMap[r.fromId];
          const b = idMap[r.toId];
          if (!a || !b) return;
          const latlngs = r.latlngs || [[a.latlng.lat, a.latlng.lng], [b.latlng.lat, b.latlng.lng]];
          const km = r.km != null ? r.km : pathLengthKm(latlngs);
          commitRoute(a, b, latlngs, km, r.variant || 'primary', r.routeMode || 'maritime');
        });

      });
    });

    if (options.source === 'draft') {
      storedDraft = normalizedData;
      refreshDraftUi();
      saveHistoryNow();
      showHint(`Draft restored — ${markers.length} ${getModeCopy().pointPlural.toLowerCase()}, ${routes.length} ${getModeCopy().routesLabel.toLowerCase()}.`);
      return;
    }

    if (options.source === 'history') {
      saveDraftNow();
      return;
    }

    saveDraftNow();
    saveHistoryNow();
    showHint(`Atlas imported — ${markers.length} ${getModeCopy().pointPlural.toLowerCase()}, ${routes.length} ${getModeCopy().routesLabel.toLowerCase()}.`);
  }

  function buildGeoJsonExport() {
    const atlasState = buildAtlasState();
    return {
      type: 'FeatureCollection',
      metadata: {
        format: ATLAS_GEOJSON_FORMAT,
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
            featureType: atlasState.settings.atlasMode === 'maritime' ? 'port' : 'location',
            id: port.id,
            name: port.name,
            iconKey: port.iconKey,
            markerColor: port.markerColor,
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
            coordinates: getRenderableRouteLatLngs(route.latlngs, route.routeMode || 'maritime').map(([lat, lng]) => [lng, lat])
          },
          properties: {
            featureType: route.routeMode === 'connection' ? 'connection' : 'route',
            fromId: route.fromId,
            toId: route.toId,
            fromName: route.fromName,
            toName: route.toName,
            variant: route.variant,
            routeMode: route.routeMode || 'maritime',
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
    const exportArea = exportAreaSelect.value;
    const exportQuality = exportQualitySelect.value;

    setExportBusy(true, 'Rendering PNG…', 'Preparing the selected framing and quality.');

    try {
      const canvas = await renderMapCanvas(exportArea, exportQuality);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG blob generation failed');

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filenameBase = slugifyFilename(settings.atlasTitle || 'open-atlas');
      triggerDownload(blob, `${filenameBase}-${ts}.png`);

      closeExportModal();
      showHint(`PNG exported: map only, ${exportQuality} quality.`);
    } catch (err) {
      console.error('PNG export error', err);
      showHint('PNG export failed — check console.');
      setExportBusy(false, 'Export PNG', 'Choose the framing and output quality.');
    }
  }

  async function copyCurrentViewToClipboard() {
    if (typeof html2canvas === 'undefined') {
      showHint('Copy preview unavailable.');
      return;
    }
    if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function' || typeof ClipboardItem === 'undefined') {
      showHint('Clipboard image copy is not supported in this browser.');
      return;
    }

    copyViewBtn.disabled = true;
    try {
      const canvas = await renderMapCanvas('current-view', 'high');
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Clipboard PNG blob generation failed');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showHint('Current map view copied to clipboard.');
    } catch (err) {
      console.error('Clipboard copy error', err);
      showHint('Copy failed — your browser may block image clipboard access.');
    } finally {
      copyViewBtn.disabled = false;
    }
  }

  function exportJSON() {
    const state = buildAtlasState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(blob, `open-atlas-${ts}.json`);
    showHint('Atlas exported as JSON.');
  }

  function exportGeoJSON() {
    const state = buildGeoJsonExport();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/geo+json' });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(blob, `open-atlas-${ts}.geojson`);
    showHint('Atlas exported as GeoJSON.');
  }

  async function importJSONFile(file) {
    try {
      const text = await file.text();
      const data = normalizeAtlasFormat(JSON.parse(text));
      if (!data) {
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
  copyViewBtn.addEventListener('click', copyCurrentViewToClipboard);
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
  [exportAreaSelect, exportQualitySelect].forEach((el) => {
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
  const storedUiPrefs = loadUiPrefs();
  setPanelHidden(
    storedUiPrefs && typeof storedUiPrefs.panelHidden === 'boolean'
      ? storedUiPrefs.panelHidden
      : window.innerWidth <= 780,
    { persist: false }
  );
  updateExportTip();
  saveHistoryNow();
  refreshWorkflowState();
  systemThemeMedia.addEventListener('change', () => {
    if (settings.themeMode === 'auto') refreshThemeMode();
  });
  map.on('move zoom resize', refreshAllBubbles);
  map.on('moveend', scheduleDraftSave);

  buildSeaGrid()
    .then(() => {
      seaReady = true;
      chartState.textContent = 'Sea charts ready';
      chartState.classList.add('ready');
      syncActionState();
      refreshWorkflowState();
      setTimeout(() => {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
      }, 250);
      setTimeout(() => showHint(`Click anywhere on the map to add a ${getModeCopy().pointSingular.toLowerCase()}.`), 800);
    })
    .catch(err => {
      console.error('Failed to load sea charts', err);
      chartState.textContent = 'Sea charts failed to load';
      loaderText.textContent = 'Failed to load sea charts. Check connection.';
      syncActionState();
      refreshWorkflowState();
    });

  updateStats();
  syncActionState();
