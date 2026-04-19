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
  };
  let baseLayer = null;
  let landFeature = null;
  let presentationLandLayer = null;
  let customAttribution = null;

  map.createPane('presentationLand');
  map.getPane('presentationLand').style.zIndex = 250;
  const BUBBLE_DEFAULT_WIDTH = 204;
  const BUBBLE_MIN_WIDTH = 124;
  const BUBBLE_MAX_WIDTH = 520;
  const BUBBLE_DEFAULT_HEIGHT = 118;
  const BUBBLE_MIN_HEIGHT = 68;
  const BUBBLE_MAX_HEIGHT = 420;
  const BUBBLE_DEFAULT_RIGHT_OFFSET = 76;
  const BUBBLE_DEFAULT_LEFT_GAP = 56;
  const BUBBLE_DEFAULT_TOP_OFFSET = -104;
  const BUBBLE_DEFAULT_BOTTOM_OFFSET = 24;
  const BUBBLE_LEGACY_DISTANCE_LIMIT = 250;
  const BUBBLE_VIEW_MARGIN = 12;
  map.getContainer().appendChild(document.getElementById('mapPresentationOverlay'));
  const bubbleOverlay = L.DomUtil.create('div', 'bubble-overlay', map.getContainer());
  bubbleOverlay.setAttribute('aria-hidden', 'true');
  const bubbleResizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver((entries) => {
      entries.forEach(({ target, contentRect }) => {
        const id = Number(target.dataset.bubbleId);
        if (!Number.isFinite(id)) return;
        const entry = findPort(id);
        if (!entry || entry._applyingBubbleLayout) return;
        const width = Math.round(contentRect.width);
        const height = Math.round(contentRect.height);
        if (
          entry._lastAppliedBubbleSize
          && Math.abs(entry._lastAppliedBubbleSize.width - width) < 2
          && Math.abs(entry._lastAppliedBubbleSize.height - height) < 2
        ) {
          return;
        }
        entry.bubbleWidthUserSized = true;
        entry.bubbleHeightUserSized = true;
        const layout = getBubbleLayout(entry, { width, height });
        persistBubbleLayout(entry, layout);
        updateBubbleContent(entry);
        scheduleDraftSave();
        scheduleHistorySnapshot();
      });
    })
    : null;

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

  function normalizeMapStyle(styleKey) {
    if (styleKey === 'dark_matter') return DEFAULT_SETTINGS.mapStyle;
    if (styleKey === 'presentation') return 'presentation';
    return TILE_STYLES[styleKey] ? styleKey : DEFAULT_SETTINGS.mapStyle;
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
  const srAnnouncer = document.getElementById('srAnnouncer');
  const portCountEl = document.getElementById('portCount');
  const routeCountEl = document.getElementById('routeCount');
  const chartState = document.getElementById('chartState');
  const loader = document.getElementById('loader');
  const loaderText = document.getElementById('loaderText');
  const loaderTitle = document.getElementById('loaderTitle');
  const charting = document.getElementById('charting');
  const findPortBtn = document.getElementById('findPortBtn');
  const placeSearchBtn = document.getElementById('placeSearchBtn');
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
  const mapPresentationOverlay = document.getElementById('mapPresentationOverlay');
  const mapTitleBlock = document.getElementById('mapTitleBlock');
  const mapTitleBadge = document.getElementById('mapTitleBadge');
  const mapTitleLogo = document.getElementById('mapTitleLogo');
  const mapTitleBlockTitle = document.getElementById('mapTitleBlockTitle');
  const mapTitleBlockSubtitle = document.getElementById('mapTitleBlockSubtitle');
  const mapLegendBlock = document.getElementById('mapLegendBlock');
  const mapLegendTitle = document.getElementById('mapLegendTitle');
  const mapLegendBody = document.getElementById('mapLegendBody');
  const createSectionNote = document.getElementById('createSectionNote');
  const findSavedLabel = document.getElementById('findSavedLabel');

  const nameModal = document.getElementById('nameModal');
  const nameModalTitle = document.getElementById('nameModalTitle');
  const portNameInput = document.getElementById('portNameInput');
  const pointTypeInput = document.getElementById('pointTypeInput');
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

  const placeModal = document.getElementById('placeModal');
  const placeModalTitle = document.getElementById('placeModalTitle');
  const placeModalSub = document.getElementById('placeModalSub');
  const placeSearchInput = document.getElementById('placeSearchInput');
  const placeTypeFilterSelect = document.getElementById('placeTypeFilterSelect');
  const placeSearchResults = document.getElementById('placeSearchResults');
  const placeSearchSubmitBtn = document.getElementById('placeSearchSubmitBtn');
  const placeCloseBtn = document.getElementById('placeCloseBtn');

  const confirmModal = document.getElementById('confirmModal');
  const confirmOk = document.getElementById('confirmOk');
  const confirmCancel = document.getElementById('confirmCancel');

  const settingsModal = document.getElementById('settingsModal');
  const settingsTitleInput = document.getElementById('settingsTitleInput');
  const settingsSubtitleInput = document.getElementById('settingsSubtitleInput');
  const atlasModeSelect = document.getElementById('atlasModeSelect');
  const mapStyleSelect = document.getElementById('mapStyleSelect');
  const displayFontSelect = document.getElementById('displayFontSelect');
  const bodyFontSelect = document.getElementById('bodyFontSelect');
  const uiFontSelect = document.getElementById('uiFontSelect');
  const calloutStyleSelect = document.getElementById('calloutStyleSelect');
  const connectionStyleSelect = document.getElementById('connectionStyleSelect');
  const showDirectionArrowsSelect = document.getElementById('showDirectionArrowsSelect');
  const showTitleBlockSelect = document.getElementById('showTitleBlockSelect');
  const titleBadgeInput = document.getElementById('titleBadgeInput');
  const titleLogoInput = document.getElementById('titleLogoInput');
  const showLegendSelect = document.getElementById('showLegendSelect');
  const legendTitleInput = document.getElementById('legendTitleInput');
  const legendBodyInput = document.getElementById('legendBodyInput');
  const showLabelsSelect = document.getElementById('showLabelsSelect');
  const showCalloutsSelect = document.getElementById('showCalloutsSelect');
  const showRoutesSelect = document.getElementById('showRoutesSelect');
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
  const ATLAS_VERSION = 9;
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
  const EXPORT_ASPECTS = {
    native: null,
    '16:9': 16 / 9,
    '4:5': 4 / 5,
    '1:1': 1,
    'a4-landscape': 297 / 210
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
  const POINT_TYPE_OPTIONS = [
    { key: 'port', label: 'Port', defaultIconKey: 'anchor' },
    { key: 'city', label: 'City', defaultIconKey: 'building' },
    { key: 'airport', label: 'Airport', defaultIconKey: 'plane' },
    { key: 'location', label: 'Location', defaultIconKey: 'location' }
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
      mapStyle: 'presentation',
      seaColor: '#d7e7f1',
      landColor: '#f7f4ea'
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
      mapStyle: 'voyager_nolabels',
      seaColor: '#d8e7e0',
      landColor: '#efe7d7'
    },
    airway: {
      label: 'Airway',
      accentColor: '#355070',
      markerColor: '#d1495b',
      routeColor: '#355070',
      routeAltColor: '#ca6702',
      displayFont: 'fraunces',
      bodyFont: 'manrope',
      uiFont: 'ibmplexmono',
      calloutStyle: 'editorial',
      connectionStyle: 'arc',
      mapStyle: 'presentation',
      atlasMode: 'connections',
      showDirectionArrows: true,
      titleBadge: 'Air Routes',
      seaColor: '#dfeaf2',
      landColor: '#f9f4ea'
    }
  };
  const DEFAULT_SETTINGS = {
    atlasTitle: 'Open Atlas',
    atlasSubtitle: 'Map Studio',
    atlasMode: 'maritime',
    mapStyle: 'positron',
    displayFont: 'fraunces',
    bodyFont: 'manrope',
    uiFont: 'ibmplexmono',
    calloutStyle: 'editorial',
    connectionStyle: 'arc',
    showDirectionArrows: true,
    showTitleBlock: true,
    titleBadge: '',
    titleLogoDataUrl: '',
    showLegend: false,
    legendTitle: 'Legend',
    legendBody: 'Markers, routes, and callouts can be styled in Appearance.',
    showLabels: true,
    showCallouts: true,
    showRoutes: true,
    accentColor: '#18567a',
    markerColor: '#0b7a75',
    routeColor: '#18567a',
    routeAltColor: '#ca6702',
    seaColor: '#d7e7f1',
    landColor: '#f7f4ea'
  };
  let settings = { ...DEFAULT_SETTINGS };
  let pendingPointStyle = {
    pointType: 'port',
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
  let nextRouteId = 1;
  let exportVisibilityOverride = null;
  let lastAtlasValidationError = '';
  let lastSavedDraftSignature = '';

  const ATLAS_MODES = ['maritime', 'pins', 'connections'];
  const CALLOUT_STYLES = ['subtle', 'editorial', 'bold'];
  const CONNECTION_STYLES = ['straight', 'arc'];
  const POINT_TYPES = POINT_TYPE_OPTIONS.map((option) => option.key);
  const PLACE_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
  const PLACE_SEARCH_MIN_INTERVAL_MS = 1000;
  const PLACE_SEARCH_TIMEOUT_MS = 8000;
  const placeSearchCache = new Map();
  const LAND_DATA_CACHE_KEY = 'open-atlas-land-110m-json-v1';
  let placeSearchLastStartedAt = 0;
  let activeModal = null;
  const modalFocusState = new WeakMap();

  function updateStats() {
    portCountEl.textContent = markers.length;
    routeCountEl.textContent = routes.length;
    refreshWorkflowState();
  }

  let hintTimer = null;
  function showHint(text, sticky = false) {
    hintText.textContent = text;
    if (srAnnouncer) srAnnouncer.textContent = text;
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

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isQuotaExceededError(err) {
    return !!(err && (
      err.name === 'QuotaExceededError'
      || err.code === 22
      || err.code === 1014
    ));
  }

  function getFocusableElements(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden') && el.offsetParent !== null);
  }

  function openModal(modal, options = {}) {
    if (!modal) return;
    const trigger = options.trigger || document.activeElement;
    modalFocusState.set(modal, { trigger });
    modal.classList.add('show');
    activeModal = modal;
    requestAnimationFrame(() => {
      const focusTarget = options.initialFocus || getFocusableElements(modal)[0] || modal;
      if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
    });
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('show');
    if (activeModal === modal) activeModal = null;
    const state = modalFocusState.get(modal);
    const trigger = state && state.trigger;
    if (trigger && typeof trigger.focus === 'function' && document.contains(trigger)) {
      requestAnimationFrame(() => trigger.focus());
    }
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

  function normalizePointType(pointType) {
    return POINT_TYPES.includes(pointType) ? pointType : getDefaultPointType();
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

  function normalizeBooleanSetting(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (value === 'on') return true;
    if (value === 'off') return false;
    return fallback;
  }

  function hasVisibleMarkers(visibility = exportVisibilityOverride) {
    if (visibility && visibility.markers !== undefined) return !!visibility.markers;
    return true;
  }

  function hasVisibleRoutes(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showRoutes, DEFAULT_SETTINGS.showRoutes);
    if (visibility && visibility.routes !== undefined) return liveVisible && !!visibility.routes;
    return liveVisible;
  }

  function hasVisibleLabels(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showLabels, DEFAULT_SETTINGS.showLabels);
    if (visibility && visibility.labels !== undefined) return liveVisible && !!visibility.labels;
    return liveVisible;
  }

  function hasVisibleCallouts(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showCallouts, DEFAULT_SETTINGS.showCallouts);
    if (visibility && visibility.callouts !== undefined) return liveVisible && !!visibility.callouts;
    return liveVisible;
  }

  function hasVisibleDirectionArrows(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showDirectionArrows, DEFAULT_SETTINGS.showDirectionArrows);
    if (visibility && visibility.directionMarkers !== undefined) return liveVisible && !!visibility.directionMarkers;
    return liveVisible;
  }

  function hasVisibleTitleBlock(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showTitleBlock, DEFAULT_SETTINGS.showTitleBlock);
    if (visibility && visibility.titleBlock !== undefined) return liveVisible && !!visibility.titleBlock;
    return liveVisible;
  }

  function hasVisibleLegend(visibility = exportVisibilityOverride) {
    const liveVisible = normalizeBooleanSetting(settings.showLegend, DEFAULT_SETTINGS.showLegend);
    if (visibility && visibility.legend !== undefined) return liveVisible && !!visibility.legend;
    return liveVisible;
  }

  function getDefaultPointType(mode) {
    return normalizeAtlasMode(mode || settings.atlasMode) === 'maritime' ? 'port' : 'location';
  }

  function getPointTypeMeta(pointType) {
    return POINT_TYPE_OPTIONS.find((option) => option.key === normalizePointType(pointType)) || POINT_TYPE_OPTIONS[POINT_TYPE_OPTIONS.length - 1];
  }

  function getSuggestedIconKeyForType(pointType) {
    return getPointTypeMeta(pointType).defaultIconKey;
  }

  function maybeApplySuggestedIcon(styleState, nextType) {
    if (!styleState) return;
    const previousSuggested = getSuggestedIconKeyForType(styleState.pointType);
    if (!styleState.iconKey || styleState.iconKey === previousSuggested) {
      styleState.iconKey = getSuggestedIconKeyForType(nextType);
    }
    styleState.pointType = normalizePointType(nextType);
  }

  function inferPointTypeFromPlaceResult(result) {
    const raw = [
      result && result.class,
      result && result.type,
      result && result.addresstype,
      result && result.category
    ].join(' ').toLowerCase();
    if (/airport|aerodrome|airfield/.test(raw)) return 'airport';
    if (/harbour|harbor|port|marina|dock|pier/.test(raw)) return 'port';
    if (/city|town|village|municipality|suburb|hamlet/.test(raw)) return 'city';
    return getDefaultPointType();
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
      pointType: normalizePointType(source.pointType),
      iconKey: normalizePointIcon(source.iconKey),
      markerColor: normalizePointColor(source.markerColor)
    };
  }

  function populatePointTypeSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = POINT_TYPE_OPTIONS.map((option) => (
      `<option value="${option.key}">${option.label}</option>`
    )).join('');
  }

  function normalizeBubbleWidth(value) {
    return Number.isFinite(value) ? Math.round(clamp(value, BUBBLE_MIN_WIDTH, BUBBLE_MAX_WIDTH)) : null;
  }

  function normalizeBubbleHeight(value) {
    return Number.isFinite(value) ? Math.round(clamp(value, BUBBLE_MIN_HEIGHT, BUBBLE_MAX_HEIGHT)) : null;
  }

  function estimateBubbleWidth(name, details) {
    const rawLines = [`${name || ''}`, ...String(details || '').split('\n')]
      .map(line => line.trim())
      .filter(Boolean);
    const longestLine = rawLines.reduce((max, line) => Math.max(max, line.length), 0);
    const longestWord = rawLines
      .flatMap(line => line.split(/\s+/))
      .reduce((max, word) => Math.max(max, word.length), 0);
    const detailWeight = Math.min(56, String(details || '').trim().length * 0.18);
    const estimated = 128 + longestLine * 4.8 + longestWord * 1.6 + detailWeight;
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

  function isFiniteLatLng(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  function validateAtlasData(data) {
    if (!Array.isArray(data.ports)) return 'Atlas ports must be an array.';
    if (data.routes != null && !Array.isArray(data.routes)) return 'Atlas routes must be an array.';
    const seenPortIds = new Set();
    for (let i = 0; i < data.ports.length; i += 1) {
      const port = data.ports[i];
      if (!port || typeof port !== 'object') return `Port ${i + 1} must be an object.`;
      if (!Number.isFinite(port.id)) return `Port ${i + 1} is missing a numeric id.`;
      if (seenPortIds.has(port.id)) return `Port id ${port.id} is duplicated.`;
      seenPortIds.add(port.id);
      if (!String(port.name || '').trim()) return `Port ${i + 1} must have a name.`;
      if (!isFiniteLatLng(Number(port.lat), Number(port.lng))) {
        return `Port "${String(port.name || '').trim() || port.id}" has invalid coordinates.`;
      }
    }
    for (let i = 0; i < (data.routes || []).length; i += 1) {
      const route = data.routes[i];
      if (!route || typeof route !== 'object') return `Route ${i + 1} must be an object.`;
      if (!Number.isFinite(route.fromId) || !seenPortIds.has(route.fromId)) return `Route ${i + 1} has an invalid fromId.`;
      if (!Number.isFinite(route.toId) || !seenPortIds.has(route.toId)) return `Route ${i + 1} has an invalid toId.`;
      if (route.latlngs != null) {
        if (!Array.isArray(route.latlngs) || route.latlngs.length < 2) return `Route ${i + 1} must contain at least two path points.`;
        for (let j = 0; j < route.latlngs.length; j += 1) {
          const point = route.latlngs[j];
          if (!Array.isArray(point) || point.length < 2 || !isFiniteLatLng(Number(point[0]), Number(point[1]))) {
            return `Route ${i + 1} has an invalid path point at index ${j}.`;
          }
        }
      }
    }
    return '';
  }

  function normalizeAtlasFormat(data) {
    lastAtlasValidationError = '';
    if (!data || typeof data !== 'object') return null;
    if (!isSupportedAtlasFormat(data.format) || !Array.isArray(data.ports)) {
      lastAtlasValidationError = 'Unsupported atlas format.';
      return null;
    }
    const normalized = {
      ...data,
      format: ATLAS_FORMAT,
      version: typeof data.version === 'number' ? Math.max(data.version, ATLAS_VERSION) : ATLAS_VERSION
    };
    const validationError = validateAtlasData(normalized);
    if (validationError) {
      lastAtlasValidationError = validationError;
      return null;
    }
    return normalized;
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
      if (isQuotaExceededError(err)) {
        showHint('Settings could not be saved — browser storage is full.', true);
      }
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
    lastSavedDraftSignature = '';
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
      lastSavedDraftSignature = atlasStateSignature(atlasState);
      refreshDraftUi();
    } catch (err) {
      console.warn('Failed to persist draft', err);
      if (isQuotaExceededError(err)) {
        const quotaMessage = 'Draft could not be saved — storage full. Export your atlas to keep your work.';
        draftNote.textContent = quotaMessage;
        showHint(quotaMessage, true);
      }
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

  function refreshSettingsForm() {
    settingsTitleInput.value = settings.atlasTitle;
    settingsSubtitleInput.value = settings.atlasSubtitle;
    atlasModeSelect.value = getAtlasMode();
    mapStyleSelect.value = normalizeMapStyle(settings.mapStyle);
    displayFontSelect.value = settings.displayFont;
    bodyFontSelect.value = settings.bodyFont;
    uiFontSelect.value = settings.uiFont;
    calloutStyleSelect.value = normalizeCalloutStyle(settings.calloutStyle);
    connectionStyleSelect.value = normalizeConnectionStyle(settings.connectionStyle);
    showDirectionArrowsSelect.value = hasVisibleDirectionArrows() ? 'on' : 'off';
    showTitleBlockSelect.value = normalizeBooleanSetting(settings.showTitleBlock, DEFAULT_SETTINGS.showTitleBlock) ? 'on' : 'off';
    titleBadgeInput.value = settings.titleBadge || '';
    showLegendSelect.value = normalizeBooleanSetting(settings.showLegend, DEFAULT_SETTINGS.showLegend) ? 'on' : 'off';
    legendTitleInput.value = settings.legendTitle || DEFAULT_SETTINGS.legendTitle;
    legendBodyInput.value = settings.legendBody || DEFAULT_SETTINGS.legendBody;
    showLabelsSelect.value = hasVisibleLabels() ? 'on' : 'off';
    showCalloutsSelect.value = hasVisibleCallouts() ? 'on' : 'off';
    showRoutesSelect.value = hasVisibleRoutes() ? 'on' : 'off';
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
      ? `Presentation Flat uses your custom sea and land palette for quieter ${copy.mode === 'maritime' ? 'atlas' : 'map'} exports, with ${calloutLabel} callouts, ${connectionLabel} connections, and ${normalizeBooleanSetting(settings.showLegend, DEFAULT_SETTINGS.showLegend) ? 'a visible legend' : 'a clean open canvas'}.`
      : `Tile basemaps keep geographic labels while your overlays inherit the palette, type choices, ${calloutLabel} callout treatment, and ${connectionLabel} connections.`;
    settingsPreview.dataset.calloutStyle = normalizeCalloutStyle(settings.calloutStyle);
  }

  function refreshPresentationOverlay() {
    mapPresentationOverlay.dataset.mode = getAtlasMode();
    mapTitleBlock.classList.toggle('is-hidden', !hasVisibleTitleBlock());
    mapLegendBlock.classList.toggle('is-hidden', !hasVisibleLegend());
    mapTitleBlockTitle.textContent = settings.atlasTitle || DEFAULT_SETTINGS.atlasTitle;
    mapTitleBlockSubtitle.textContent = settings.atlasSubtitle || DEFAULT_SETTINGS.atlasSubtitle;
    mapTitleBlockTitle.style.fontFamily = FONT_STACKS[settings.displayFont] || FONT_STACKS.fraunces;
    mapTitleBlockSubtitle.style.fontFamily = FONT_STACKS[settings.uiFont] || FONT_STACKS.ibmplexmono;
    mapLegendTitle.style.fontFamily = FONT_STACKS[settings.uiFont] || FONT_STACKS.ibmplexmono;
    mapLegendBody.style.fontFamily = FONT_STACKS[settings.bodyFont] || FONT_STACKS.manrope;
    mapTitleBadge.textContent = settings.titleBadge || '';
    mapTitleBadge.classList.toggle('is-hidden', !String(settings.titleBadge || '').trim());
    mapLegendTitle.textContent = settings.legendTitle || DEFAULT_SETTINGS.legendTitle;
    mapLegendBody.textContent = settings.legendBody || DEFAULT_SETTINGS.legendBody;
    if (settings.titleLogoDataUrl) {
      mapTitleLogo.src = settings.titleLogoDataUrl;
      mapTitleLogo.classList.remove('is-hidden');
    } else {
      mapTitleLogo.removeAttribute('src');
      mapTitleLogo.classList.add('is-hidden');
    }
    mapPresentationOverlay.style.setProperty('--presentation-accent', settings.accentColor);
    mapPresentationOverlay.style.setProperty('--presentation-panel', rgbaFromHex(settings.seaColor, 0.92));
    mapPresentationOverlay.style.setProperty('--presentation-ink', tintHex(settings.accentColor, -0.64));
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
    if (pointTypeInput) pointTypeInput.value = normalizePointType(pendingPointStyle.pointType);
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
    if (portEditType) portEditType.value = normalizePointType(editingPointStyle.pointType);
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
    const sanitizedNextSettings = nextSettings ? { ...nextSettings } : {};
    delete sanitizedNextSettings.themeMode;
    const previousSettings = { ...settings };
    settings = {
      ...settings,
      ...sanitizedNextSettings,
      mapStyle: normalizeMapStyle(sanitizedNextSettings.mapStyle !== undefined ? sanitizedNextSettings.mapStyle : settings.mapStyle),
      atlasMode: normalizeAtlasMode(sanitizedNextSettings.atlasMode !== undefined ? sanitizedNextSettings.atlasMode : settings.atlasMode),
      calloutStyle: normalizeCalloutStyle(sanitizedNextSettings.calloutStyle !== undefined ? sanitizedNextSettings.calloutStyle : settings.calloutStyle),
      connectionStyle: normalizeConnectionStyle(sanitizedNextSettings.connectionStyle !== undefined ? sanitizedNextSettings.connectionStyle : settings.connectionStyle),
      showDirectionArrows: normalizeBooleanSetting(sanitizedNextSettings.showDirectionArrows !== undefined ? sanitizedNextSettings.showDirectionArrows : settings.showDirectionArrows, DEFAULT_SETTINGS.showDirectionArrows),
      showTitleBlock: normalizeBooleanSetting(sanitizedNextSettings.showTitleBlock !== undefined ? sanitizedNextSettings.showTitleBlock : settings.showTitleBlock, DEFAULT_SETTINGS.showTitleBlock),
      showLegend: normalizeBooleanSetting(sanitizedNextSettings.showLegend !== undefined ? sanitizedNextSettings.showLegend : settings.showLegend, DEFAULT_SETTINGS.showLegend),
      showLabels: normalizeBooleanSetting(sanitizedNextSettings.showLabels !== undefined ? sanitizedNextSettings.showLabels : settings.showLabels, DEFAULT_SETTINGS.showLabels),
      showCallouts: normalizeBooleanSetting(sanitizedNextSettings.showCallouts !== undefined ? sanitizedNextSettings.showCallouts : settings.showCallouts, DEFAULT_SETTINGS.showCallouts),
      showRoutes: normalizeBooleanSetting(sanitizedNextSettings.showRoutes !== undefined ? sanitizedNextSettings.showRoutes : settings.showRoutes, DEFAULT_SETTINGS.showRoutes)
    };
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
    if (sanitizedNextSettings.markerColor && sanitizedNextSettings.markerColor !== previousSettings.markerColor) {
      markers.forEach((entry) => {
        if (normalizePointColor(entry.markerColor).toLowerCase() === previousSettings.markerColor.toLowerCase()) {
          entry.markerColor = sanitizedNextSettings.markerColor;
          updateMarkerAppearance(entry);
        }
      });
    }
    atlasTitleText.textContent = settings.atlasTitle;
    atlasSubtitleText.textContent = settings.atlasSubtitle;
    loaderTitle.textContent = settings.atlasTitle;
    refreshPresentationLayerStyle();
    setBaseMap(settings.mapStyle);
    refreshPresentationOverlay();
    if (isPinsMode() && drawMode) {
      drawMode = false;
      selectedForRoute = [];
      refreshMarkerVisuals();
      hideHint();
    }
    refreshSettingsForm();
    refreshModeUi();
    refreshAllMarkers();
    refreshAllLabels();
    refreshAllBubbles();
    refreshRouteLayers();
    syncActionState();
    refreshWorkflowState();
    if (options.persist !== false) saveStoredSettings();
    if (options.recordDraft !== false) scheduleDraftSave();
    if (options.recordHistory !== false) scheduleHistorySnapshot();
  }

  function openSettingsModal() {
    refreshSettingsForm();
    openModal(settingsModal, { trigger: settingsBtn, initialFocus: settingsTitleInput });
  }

  function closeSettingsModal() {
    closeModal(settingsModal);
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
    placeSearchBtn.disabled = isPlottingRoute || routeChoiceOpen;
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
    refreshMarkerVisibility(entry);
    refreshLabelVisibility(entry);
    if (entry.bubbleVisible) {
      updateBubbleContent(entry);
    }
  }

  function refreshMarkerVisibility(entry) {
    const markerEl = entry && entry.marker && entry.marker.getElement && entry.marker.getElement();
    if (!markerEl) return;
    markerEl.classList.toggle('is-hidden', !hasVisibleMarkers());
  }

  function refreshLabelVisibility(entry) {
    const tooltip = entry && entry.marker && entry.marker.getTooltip && entry.marker.getTooltip();
    const tooltipEl = tooltip && tooltip.getElement && tooltip.getElement();
    if (!tooltipEl) return;
    tooltipEl.classList.toggle('is-hidden', !hasVisibleLabels());
  }

  function refreshAllMarkers() {
    markers.forEach(refreshMarkerVisibility);
  }

  function refreshAllLabels() {
    markers.forEach(refreshLabelVisibility);
  }

  function openNameModal(latlng) {
    pendingLatLng = latlng;
    modalLat.textContent = latlng.lat.toFixed(3);
    modalLng.textContent = latlng.lng.toFixed(3);
    portNameInput.value = '';
    pendingPointStyle = {
      pointType: getDefaultPointType(),
      iconKey: getSuggestedIconKeyForType(getDefaultPointType()),
      markerColor: settings.markerColor
    };
    refreshPendingPointStyleUi();
    openModal(nameModal, { initialFocus: portNameInput });
    setTimeout(() => portNameInput.focus(), 60);
  }
  function closeNameModal() {
    closeModal(nameModal);
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
      pointType: pointStyle.pointType,
      iconKey: pointStyle.iconKey,
      markerColor: pointStyle.markerColor,
      details: opts.details || '',
      bubbleVisible: false,
      bubbleWidthUserSized: !!opts.bubbleWidthUserSized,
      bubbleHeightUserSized: !!opts.bubbleHeightUserSized,
      bubbleWidth: !!opts.bubbleWidthUserSized ? normalizeBubbleWidth(opts.bubbleWidth) : null,
      bubbleHeight: !!opts.bubbleHeightUserSized ? normalizeBubbleHeight(opts.bubbleHeight) : null,
      bubbleOffset: normalizeBubbleOffset({
        x: opts.bubbleOffsetX,
        y: opts.bubbleOffsetY
      }) || bubbleOffsetFromLegacyLatLng(
        L.latLng(latlng.lat, latlng.lng),
        opts.bubbleLatLng ? L.latLng(opts.bubbleLatLng.lat, opts.bubbleLatLng.lng) : null,
        normalizeBubbleWidth(opts.bubbleWidth) || estimateBubbleWidth(name, opts.details || '')
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
    requestAnimationFrame(() => refreshLabelVisibility(entry));
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
  const portEditType = document.getElementById('portEditType');
  const portEditIconPicker = document.getElementById('portEditIconPicker');
  const portEditColorPicker = document.getElementById('portEditColorPicker');
  const portEditDetails = document.getElementById('portEditDetails');
  const bubbleToggle = document.getElementById('bubbleToggle');
  const bubbleSizeControls = document.getElementById('bubbleSizeControls');
  const bubbleAutoFitBtn = document.getElementById('bubbleAutoFitBtn');
  const bubbleWidthRange = document.getElementById('bubbleWidthRange');
  const bubbleHeightRange = document.getElementById('bubbleHeightRange');
  const bubbleWidthValue = document.getElementById('bubbleWidthValue');
  const bubbleHeightValue = document.getElementById('bubbleHeightValue');
  const portSaveBtn = document.getElementById('portSaveBtn');
  const portCancelBtn = document.getElementById('portCancelBtn');
  const portDuplicateBtn = document.getElementById('portDuplicateBtn');
  const portDeleteBtn = document.getElementById('portDeleteBtn');
  let editingPort = null;
  let editingBubbleWidthUserSized = false;
  let editingBubbleHeightUserSized = false;

  function getEditingBubblePreviewState() {
    return {
      name: (portEditName.value || editingPort?.name || '').trim(),
      details: portEditDetails.value || editingPort?.details || ''
    };
  }

  function refreshBubbleSizingUi() {
    const preview = getEditingBubblePreviewState();
    const autoWidth = estimateBubbleWidth(preview.name, preview.details);
    const width = editingBubbleWidthUserSized
      ? normalizeBubbleWidth(Number(bubbleWidthRange.value)) || autoWidth
      : autoWidth;
    const autoHeight = estimateBubbleHeight(preview, width);
    const height = editingBubbleHeightUserSized
      ? normalizeBubbleHeight(Number(bubbleHeightRange.value)) || autoHeight
      : autoHeight;

    bubbleWidthRange.value = String(width);
    bubbleHeightRange.value = String(height);
    bubbleWidthValue.textContent = editingBubbleWidthUserSized ? `${width}px` : `Auto ${width}px`;
    bubbleHeightValue.textContent = editingBubbleHeightUserSized ? `${height}px` : `Auto ${height}px`;

    bubbleSizeControls.classList.toggle('is-disabled', !bubbleToggle.checked);
  }

  function openPortModal(entry) {
    editingPort = entry;
    editingPointStyle = {
      pointType: entry.pointType,
      iconKey: entry.iconKey,
      markerColor: entry.markerColor
    };
    portModalTitle.textContent = entry.name;
    portModalSub.textContent = `${entry.latlng.lat.toFixed(3)}° • ${entry.latlng.lng.toFixed(3)}°`;
    portEditName.value = entry.name;
    refreshEditingPointStyleUi();
    portEditDetails.value = entry.details || '';
    bubbleToggle.checked = !!entry.bubbleVisible;
    editingBubbleWidthUserSized = !!entry.bubbleWidthUserSized;
    editingBubbleHeightUserSized = !!entry.bubbleHeightUserSized;
    bubbleWidthRange.value = String(getBubbleWidth(entry));
    bubbleHeightRange.value = String(getBubbleHeight(entry));
    refreshBubbleSizingUi();
    openModal(portModal, { initialFocus: portEditName });
    setTimeout(() => portEditName.focus(), 60);
  }

  function closePortModal() {
    closeModal(portModal);
    editingPort = null;
    editingPointStyle = null;
    editingBubbleWidthUserSized = false;
    editingBubbleHeightUserSized = false;
  }

  if (pointTypeInput) {
    pointTypeInput.addEventListener('change', () => {
      maybeApplySuggestedIcon(pendingPointStyle, pointTypeInput.value);
      refreshPendingPointStyleUi();
    });
  }

  if (portEditType) {
    portEditType.addEventListener('change', () => {
      if (!editingPointStyle) return;
      maybeApplySuggestedIcon(editingPointStyle, portEditType.value);
      refreshEditingPointStyleUi();
    });
  }

  function savePortEdits() {
    if (!editingPort) return;
    const newName = (portEditName.value || '').trim() || editingPort.name;
    const newDetails = portEditDetails.value || '';
    const wantBubble = bubbleToggle.checked;
    const bubbleWidth = editingBubbleWidthUserSized ? normalizeBubbleWidth(Number(bubbleWidthRange.value)) : null;
    const bubbleHeight = editingBubbleHeightUserSized ? normalizeBubbleHeight(Number(bubbleHeightRange.value)) : null;
    editingPort.pointType = normalizePointType(editingPointStyle.pointType);
    editingPort.iconKey = normalizePointIcon(editingPointStyle.iconKey);
    editingPort.markerColor = normalizePointColor(editingPointStyle.markerColor);

    const renamed = newName !== editingPort.name;
    editingPort.name = newName;
    editingPort.details = newDetails;
    editingPort.bubbleWidthUserSized = editingBubbleWidthUserSized;
    editingPort.bubbleHeightUserSized = editingBubbleHeightUserSized;
    editingPort.bubbleWidth = bubbleWidth;
    editingPort.bubbleHeight = bubbleHeight;

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
    showHint(`${getModeCopy().pointSingular} "${newName}" updated.`);
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  function duplicatePortEntry(entry) {
    const sourcePoint = map.latLngToContainerPoint(entry.latlng);
    const duplicatedLatLng = map.containerPointToLatLng([sourcePoint.x + 36, sourcePoint.y + 24]);
    const duplicate = addMarker(duplicatedLatLng, `${entry.name} Copy`, {
      pointType: entry.pointType,
      iconKey: entry.iconKey,
      markerColor: entry.markerColor,
      details: entry.details || '',
      bubbleVisible: false
    });
    refreshLabelVisibility(duplicate);
    return duplicate;
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
    if (hasManualBubbleWidth(entry)) return normalizeBubbleWidth(entry.bubbleWidth) || BUBBLE_DEFAULT_WIDTH;
    return estimateBubbleWidth(entry.name, entry.details || '') || BUBBLE_DEFAULT_WIDTH;
  }

  function getBubbleHeight(entry) {
    const width = getBubbleWidth(entry);
    if (hasManualBubbleHeight(entry)) {
      return normalizeBubbleHeight(entry.bubbleHeight) || estimateBubbleHeight(entry, width) || BUBBLE_DEFAULT_HEIGHT;
    }
    return estimateBubbleHeight(entry, width) || BUBBLE_DEFAULT_HEIGHT;
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

  function estimateBubbleHeight(entry, width = BUBBLE_DEFAULT_WIDTH) {
    const name = String(entry.name || '').trim();
    const detailLinesRaw = String(entry.details || '').split('\n');
    const titleCharsPerLine = Math.max(7, Math.floor((width - 26) / 10.5));
    const bodyCharsPerLine = Math.max(10, Math.floor((width - 28) / 8.1));
    const titleLines = Math.max(1, Math.ceil(Math.max(1, name.length) / titleCharsPerLine));
    const detailLines = detailLinesRaw.reduce((count, line) => {
      const trimmed = line.trim();
      if (!trimmed) return count + 1;
      return count + Math.max(1, Math.ceil(trimmed.length / bodyCharsPerLine));
    }, 0);
    const bodyBlock = Math.max(1, detailLines);
    const estimated = 18 + titleLines * 19 + bodyBlock * 22 + 26;
    return clamp(estimated, BUBBLE_MIN_HEIGHT, 320);
  }

  function hasManualBubbleWidth(entry) {
    return !!entry.bubbleWidthUserSized && normalizeBubbleWidth(entry.bubbleWidth) != null;
  }

  function hasManualBubbleHeight(entry) {
    return !!entry.bubbleHeightUserSized && normalizeBubbleHeight(entry.bubbleHeight) != null;
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
      titleSize: Math.round(clamp(8, 9.6 + sizeRatio * 1 - textPressure * 0.45, 11.8) * 10) / 10,
      titleSpacing: Math.round(clamp(1.05, 1.45 + sizeRatio * 0.22 - textPressure * 0.1, 1.78) * 100) / 100,
      bodySize: Math.round(clamp(10.8, 13.2 + sizeRatio * 1.6 - textPressure * 1.34, 16.8) * 10) / 10,
      lineHeight: Math.round(clamp(1.12, 1.28 + sizeRatio * 0.08 - textPressure * 0.09, 1.44) * 100) / 100,
      bodyRight: Math.round(clamp(6, 10 + widthRatio * 4 - compactness * 2.1, 18))
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
    const requestedWidth = options.width != null
      ? normalizeBubbleWidth(options.width)
      : getBubbleWidth(entry);
    const width = Math.round(clamp(
      requestedWidth || BUBBLE_DEFAULT_WIDTH,
      BUBBLE_MIN_WIDTH,
      maxWidth
    ));
    const requestedHeight = options.height != null
      ? normalizeBubbleHeight(options.height)
      : getBubbleHeight(entry);
    const height = Math.round(clamp(
      requestedHeight || estimateBubbleHeight(entry, width),
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
          <button class="bubble-resize-grip" type="button" tabindex="-1" aria-label="Resize callout"></button>
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
    entry._applyingBubbleLayout = true;
    entry._lastAppliedBubbleSize = { width: layout.width, height: layout.height };
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
    requestAnimationFrame(() => {
      entry._applyingBubbleLayout = false;
    });
  }

  function persistBubbleLayout(entry, layout) {
    entry.bubbleOffset = normalizeBubbleOffset(layout.offset);
    entry.bubbleWidth = hasManualBubbleWidth(entry)
      ? normalizeBubbleWidth(layout.width) || BUBBLE_DEFAULT_WIDTH
      : null;
    entry.bubbleHeight = hasManualBubbleHeight(entry)
      ? normalizeBubbleHeight(layout.height) || estimateBubbleHeight(entry, layout.width)
      : null;
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
        allowFrom: '.bubble-title, .bubble-handle, .bubble-body',
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
      const startResize = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = getBubbleWidth(entry);
        const startHeight = getBubbleHeight(entry);
        entry.bubbleWidthUserSized = true;
        entry.bubbleHeightUserSized = true;
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
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          finish();
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      };

      grip.addEventListener('mousedown', startResize);
      grip.addEventListener('pointerdown', startResize);
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
    entry.bubble.classList.toggle('is-hidden', !hasVisibleCallouts());
    if (!hasVisibleCallouts()) return;
    const layout = getBubbleLayout(entry);
    persistBubbleLayout(entry, layout);
    applyBubbleDom(entry, layout);
    if (bubbleResizeObserver) {
      const card = entry.bubble.querySelector('.info-bubble');
      if (card) bubbleResizeObserver.observe(card);
    }
    if (!entry.bubbleInteractable) initBubbleInteraction(entry);
  }

  function hideBubble(entry) {
    entry.bubbleVisible = false;
    if (entry.bubble) {
      if (bubbleResizeObserver) {
        const card = entry.bubble.querySelector('.info-bubble');
        if (card) bubbleResizeObserver.unobserve(card);
      }
      teardownBubbleInteraction(entry);
      entry.bubble.remove();
      entry.bubble = null;
    }
  }

  portSaveBtn.addEventListener('click', savePortEdits);
  portCancelBtn.addEventListener('click', closePortModal);
  portDuplicateBtn.addEventListener('click', () => {
    if (!editingPort) return;
    const source = editingPort;
    closePortModal();
    const duplicate = duplicatePortEntry(source);
    showHint(`${getModeCopy().pointSingular} duplicated.`);
    openPortModal(duplicate);
  });
  portDeleteBtn.addEventListener('click', () => {
    if (!editingPort) return;
    const ent = editingPort;
    closePortModal();
    deletePortEntry(ent);
    showHint(`${getModeCopy().pointSingular} removed.`);
  });
  portModal.addEventListener('click', (e) => { if (e.target === portModal) closePortModal(); });
  portEditName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); portEditDetails.focus(); }
    else if (e.key === 'Escape') { closePortModal(); }
  });
  portEditName.addEventListener('input', () => {
    if (!editingPort) return;
    if (!editingBubbleWidthUserSized || !editingBubbleHeightUserSized) refreshBubbleSizingUi();
  });
  portEditDetails.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closePortModal(); }
  });
  portEditDetails.addEventListener('input', () => {
    if (!editingPort) return;
    if (!editingBubbleWidthUserSized || !editingBubbleHeightUserSized) refreshBubbleSizingUi();
  });
  bubbleToggle.addEventListener('change', refreshBubbleSizingUi);
  bubbleWidthRange.addEventListener('input', () => {
    editingBubbleWidthUserSized = true;
    refreshBubbleSizingUi();
  });
  bubbleHeightRange.addEventListener('input', () => {
    editingBubbleHeightUserSized = true;
    refreshBubbleSizingUi();
  });
  bubbleAutoFitBtn.addEventListener('click', () => {
    editingBubbleWidthUserSized = false;
    editingBubbleHeightUserSized = false;
    refreshBubbleSizingUi();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && activeModal && activeModal.classList.contains('show')) {
      const focusable = getFocusableElements(activeModal);
      if (!focusable.length) {
        e.preventDefault();
        activeModal.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key !== 'Escape') return;
    if (portModal.classList.contains('show')) closePortModal();
    else if (routeChoiceModal.classList.contains('show')) closeRouteChoice();
    else if (searchModal.classList.contains('show')) closeSearchModal();
    else if (placeModal.classList.contains('show')) closePlaceModal();
    else if (exportModal.classList.contains('show')) closeExportModal();
    else if (settingsModal.classList.contains('show')) closeSettingsModal();
    else if (confirmModal.classList.contains('show')) closeModal(confirmModal);
    else if (helpModal.classList.contains('show')) closeModal(helpModal);
    else if (measureMode) setMeasureMode(false);
    else if (drawMode) setDrawMode(false);
  });

  /* ===== Help/FAQ ===== */
  const helpBtn = document.getElementById('helpBtn');
  const helpModal = document.getElementById('helpModal');
  const helpCloseBtn = document.getElementById('helpCloseBtn');

  helpBtn.addEventListener('click', () => openModal(helpModal, { trigger: helpBtn, initialFocus: helpCloseBtn }));
  helpCloseBtn.addEventListener('click', () => closeModal(helpModal));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) closeModal(helpModal);
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
  settingsResetBtn.addEventListener('click', () => {
    if (titleLogoInput) titleLogoInput.value = '';
    applySettings({ ...DEFAULT_SETTINGS });
  });
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });
  [
    [settingsTitleInput, 'input', () => applySettings({ atlasTitle: settingsTitleInput.value || DEFAULT_SETTINGS.atlasTitle })],
    [settingsSubtitleInput, 'input', () => applySettings({ atlasSubtitle: settingsSubtitleInput.value || DEFAULT_SETTINGS.atlasSubtitle })],
    [atlasModeSelect, 'change', () => applySettings({ atlasMode: atlasModeSelect.value })],
    [mapStyleSelect, 'change', () => applySettings({ mapStyle: mapStyleSelect.value })],
    [displayFontSelect, 'change', () => applySettings({ displayFont: displayFontSelect.value })],
    [bodyFontSelect, 'change', () => applySettings({ bodyFont: bodyFontSelect.value })],
    [uiFontSelect, 'change', () => applySettings({ uiFont: uiFontSelect.value })],
    [calloutStyleSelect, 'change', () => applySettings({ calloutStyle: calloutStyleSelect.value })],
    [connectionStyleSelect, 'change', () => applySettings({ connectionStyle: connectionStyleSelect.value })],
    [showDirectionArrowsSelect, 'change', () => applySettings({ showDirectionArrows: showDirectionArrowsSelect.value === 'on' })],
    [showTitleBlockSelect, 'change', () => applySettings({ showTitleBlock: showTitleBlockSelect.value === 'on' })],
    [titleBadgeInput, 'input', () => applySettings({ titleBadge: titleBadgeInput.value })],
    [showLegendSelect, 'change', () => applySettings({ showLegend: showLegendSelect.value === 'on' })],
    [legendTitleInput, 'input', () => applySettings({ legendTitle: legendTitleInput.value || DEFAULT_SETTINGS.legendTitle })],
    [legendBodyInput, 'input', () => applySettings({ legendBody: legendBodyInput.value || DEFAULT_SETTINGS.legendBody })],
    [showLabelsSelect, 'change', () => applySettings({ showLabels: showLabelsSelect.value === 'on' })],
    [showCalloutsSelect, 'change', () => applySettings({ showCallouts: showCalloutsSelect.value === 'on' })],
    [showRoutesSelect, 'change', () => applySettings({ showRoutes: showRoutesSelect.value === 'on' })],
    [accentColorInput, 'input', () => applySettings({ accentColor: accentColorInput.value })],
    [markerColorInput, 'input', () => applySettings({ markerColor: markerColorInput.value })],
    [routeColorInput, 'input', () => applySettings({ routeColor: routeColorInput.value })],
    [routeAltColorInput, 'input', () => applySettings({ routeAltColor: routeAltColorInput.value })],
    [seaColorInput, 'input', () => applySettings({ seaColor: seaColorInput.value })],
    [landColorInput, 'input', () => applySettings({ landColor: landColorInput.value })]
  ].forEach(([el, eventName, handler]) => el.addEventListener(eventName, handler));
  titleLogoInput.addEventListener('change', async () => {
    const file = titleLogoInput.files && titleLogoInput.files[0];
    if (!file) {
      applySettings({ titleLogoDataUrl: '' });
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      titleLogoInput.value = '';
      showHint('Logo upload supports PNG, JPEG, and WebP only.');
      return;
    }
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Logo read failed'));
        reader.readAsDataURL(file);
      });
      applySettings({ titleLogoDataUrl: dataUrl });
      showHint('Logo added to the title block.');
    } catch (err) {
      console.error('Logo import failed', err);
      showHint('Logo import failed.');
    }
  });

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
      const pointTypeMeta = getPointTypeMeta(entry.pointType);
      btn.innerHTML = `
        <div class="search-result-top">
          <div class="search-result-name">${escapeHtml(entry.name)}</div>
          <span class="search-result-pill">${escapeHtml(pointTypeMeta.label)}</span>
        </div>
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
    closePlaceModal({ preserveInput: true, silent: true });
    portSearchInput.value = '';
    renderSearchResults('');
    openModal(searchModal, { trigger: findPortBtn, initialFocus: portSearchInput });
    setTimeout(() => portSearchInput.focus(), 60);
  }

  function closeSearchModal() {
    closeModal(searchModal);
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

  /* ===== Place search ===== */
  function renderPlaceSearchResults(results, query, selectedType) {
    placeSearchResults.innerHTML = '';
    if (!query) {
      placeSearchResults.innerHTML = '<div class="search-empty">Search once to add a real-world place to the current map.</div>';
      return;
    }
    if (!results.length) {
      placeSearchResults.innerHTML = `<div class="search-empty">No ${selectedType !== 'auto' ? escapeHtml(getPointTypeMeta(selectedType).label.toLowerCase()) + ' ' : ''}matches found for this search.</div>`;
      return;
    }

    results.forEach((result) => {
      const inferredType = selectedType === 'auto' ? inferPointTypeFromPlaceResult(result) : normalizePointType(selectedType);
      const typeMeta = getPointTypeMeta(inferredType);
      const button = document.createElement('button');
      button.className = 'search-result';
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      const primaryLabel = result.name || result.display_name.split(',')[0] || 'Unnamed place';
      button.innerHTML = `
        <div class="search-result-top">
          <div class="search-result-name">${escapeHtml(primaryLabel)}</div>
          <span class="search-result-pill">${escapeHtml(typeMeta.label)}</span>
        </div>
        <div class="search-result-meta">${lat.toFixed(3)}° • ${lng.toFixed(3)}°</div>
        <div class="search-result-notes">${escapeHtml(result.display_name)}</div>
      `;
      button.addEventListener('click', () => {
        const entry = addMarker(L.latLng(lat, lng), primaryLabel, {
          pointType: inferredType,
          iconKey: getSuggestedIconKeyForType(inferredType),
          markerColor: settings.markerColor
        });
        closePlaceModal({ preserveInput: false, silent: true });
        map.flyTo(entry.latlng, Math.max(map.getZoom(), 5), { animate: true, duration: 0.8 });
        flashPort(entry);
        showHint(`Added ${typeMeta.label.toLowerCase()}: ${entry.name}.`);
      });
      placeSearchResults.appendChild(button);
    });
  }

  async function fetchPlaceResults(query) {
    const cacheKey = query.trim().toLowerCase();
    if (placeSearchCache.has(cacheKey)) return placeSearchCache.get(cacheKey);
    const elapsed = Date.now() - placeSearchLastStartedAt;
    if (elapsed < PLACE_SEARCH_MIN_INTERVAL_MS) {
      await wait(PLACE_SEARCH_MIN_INTERVAL_MS - elapsed);
    }
    const url = new URL(PLACE_SEARCH_ENDPOINT);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '8');
    url.searchParams.set('addressdetails', '1');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PLACE_SEARCH_TIMEOUT_MS);
    placeSearchLastStartedAt = Date.now();
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    if (!response.ok) {
      throw new Error(`Place search failed with ${response.status}`);
    }
    const data = await response.json();
    placeSearchCache.set(cacheKey, data);
    return data;
  }

  async function runPlaceSearch() {
    const query = (placeSearchInput.value || '').trim();
    const selectedType = placeTypeFilterSelect.value || 'auto';
    if (!query) {
      renderPlaceSearchResults([], '', selectedType);
      showHint('Enter a place name before searching.');
      return;
    }
    placeSearchSubmitBtn.disabled = true;
    placeSearchSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching';
    try {
      const rawResults = await fetchPlaceResults(query);
      const filtered = selectedType === 'auto'
        ? rawResults
        : rawResults.filter((result) => inferPointTypeFromPlaceResult(result) === selectedType);
      renderPlaceSearchResults(filtered, query, selectedType);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        placeSearchResults.innerHTML = '<div class="search-empty">Search timed out. Try again in a moment.</div>';
        showHint('Search timed out — try again.');
      } else if (String(error && error.message || '').includes('429')) {
        placeSearchResults.innerHTML = '<div class="search-empty">Search is temporarily rate-limited. Pause for a moment, then try again.</div>';
        showHint('Search rate-limited — try again in a moment.');
      } else {
        console.error('Place search failed', error);
        placeSearchResults.innerHTML = '<div class="search-empty">Place search failed. Try again in a moment.</div>';
        showHint('Place search failed.');
      }
    } finally {
      placeSearchSubmitBtn.disabled = false;
      placeSearchSubmitBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search';
    }
  }

  function openPlaceModal() {
    setDrawMode(false);
    setMeasureMode(false);
    closeSearchModal();
    openModal(placeModal, { trigger: placeSearchBtn, initialFocus: placeSearchInput });
    if (!placeSearchResults.children.length) {
      renderPlaceSearchResults([], '', placeTypeFilterSelect.value || 'auto');
    }
    setTimeout(() => placeSearchInput.focus(), 60);
  }

  function closePlaceModal(options) {
    const { preserveInput = true, silent = false } = options || {};
    closeModal(placeModal);
    if (!preserveInput) {
      placeSearchInput.value = '';
      placeTypeFilterSelect.value = 'auto';
      placeSearchResults.innerHTML = '';
    }
    if (!silent) hideHint();
  }

  placeSearchBtn.addEventListener('click', openPlaceModal);
  placeCloseBtn.addEventListener('click', () => closePlaceModal());
  placeSearchSubmitBtn.addEventListener('click', runPlaceSearch);
  placeSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runPlaceSearch();
    } else if (e.key === 'Escape') {
      closePlaceModal();
    }
  });
  placeModal.addEventListener('click', (e) => {
    if (e.target === placeModal) closePlaceModal();
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
    let topo = null;
    try {
      const cached = localStorage.getItem(LAND_DATA_CACHE_KEY);
      if (cached) topo = JSON.parse(cached);
    } catch (err) {
      console.warn('Failed to parse cached coastline data', err);
    }
    if (!topo) {
      const resp = await fetch('assets/data/land-110m.json');
      topo = await resp.json();
      try {
        localStorage.setItem(LAND_DATA_CACHE_KEY, JSON.stringify(topo));
      } catch (err) {
        console.warn('Failed to cache coastline data locally', err);
      }
    }
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

  function nearestSeaReachableFromPoint(lat, lng, maxRadius = 12) {
    const [startX, startY] = latLngToCell(lat, lng);
    if (!isLand[idx(startX, startY)]) return [startX, startY];
    const visited = new Uint8Array(GRID_W * GRID_H);
    visited[idx(startX, startY)] = 1;
    const queue = [[startX, startY, 0]];
    let head = 0;
    let fallback = null;
    while (head < queue.length) {
      const [cx, cy, d] = queue[head++];
      if (d > maxRadius) break;
      if (!isLand[idx(cx, cy)]) {
        fallback = fallback || [cx, cy];
        const [seaLat, seaLng] = cellToLatLng(cx, cy);
        if (!routeSegmentCrossesLand([lat, lng], [seaLat, seaLng], { startSkip: 0.22, endSkip: 0.04 })) {
          return [cx, cy];
        }
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = cx + dx;
        const ny = cy + dy;
        if (ny < 0 || ny >= GRID_H) continue;
        nx = (nx + GRID_W) % GRID_W;
        const k = idx(nx, ny);
        if (visited[k]) continue;
        visited[k] = 1;
        queue.push([nx, ny, d + 1]);
      }
    }
    return fallback || nearestSea(startX, startY, maxRadius);
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

  function routeSegmentCrossesLand(a, b, options = {}) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    const startSkip = clamp(options.startSkip ?? 0.06, 0, 0.45);
    const endSkip = clamp(options.endSkip ?? 0.06, 0, 0.45);
    const [startLat, startLng] = a;
    const [endLat, endLngSource] = b;
    const endLng = startLng + getNormalizedLngDelta(startLng, endLngSource);
    const [sx, sy] = latLngToCell(startLat, startLng);
    const [gxRaw, gy] = latLngToCell(endLat, endLng);
    let dx = gxRaw - sx;
    if (dx > GRID_W / 2) dx -= GRID_W;
    if (dx < -GRID_W / 2) dx += GRID_W;
    const dy = gy - sy;
    const steps = Math.max(6, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 3.25));
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps;
      if (t < startSkip || t > 1 - endSkip) continue;
      const x = ((Math.round(sx + dx * t) % GRID_W) + GRID_W) % GRID_W;
      const y = Math.max(0, Math.min(GRID_H - 1, Math.round(sy + dy * t)));
      if (isLand[idx(x, y)]) return true;
    }
    return false;
  }

  function simplifyMaritimeRoute(points, tol = 0.5) {
    if (points.length < 3) return points.slice();
    const sqTol = tol * tol;
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let maxD = 0;
      let maxI = -1;
      const [ax, ay] = points[a];
      const [bx, by] = points[b];
      const dx = bx - ax;
      const dy = by - ay;
      const denom = dx * dx + dy * dy || 1;
      for (let i = a + 1; i < b; i += 1) {
        const [px, py] = points[i];
        const t = ((px - ax) * dx + (py - ay) * dy) / denom;
        const cx = ax + t * dx;
        const cy = ay + t * dy;
        const ddx = px - cx;
        const ddy = py - cy;
        const d = ddx * ddx + ddy * ddy;
        if (d > maxD) {
          maxD = d;
          maxI = i;
        }
      }
      const canShortcut = !routeSegmentCrossesLand(points[a], points[b]);
      if ((maxD > sqTol || !canShortcut) && maxI !== -1) {
        keep[maxI] = 1;
        stack.push([a, maxI], [maxI, b]);
      }
    }
    const out = [];
    for (let i = 0; i < points.length; i += 1) {
      if (keep[i]) out.push(points[i]);
    }
    return out;
  }

  function maritimeRouteCrossesLand(points) {
    if (!Array.isArray(points) || points.length < 2) return false;
    for (let i = 1; i < points.length; i += 1) {
      if (routeSegmentCrossesLand(points[i - 1], points[i])) return true;
    }
    return false;
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
    document.body.classList.add('route-busy');
    syncActionState();
    charting.classList.add('show');
    // Yield so UI updates
    await new Promise(r => setTimeout(r, 30));
    try {
      let [sx, sy] = latLngToCell(portA.latlng.lat, portA.latlng.lng);
      let [gx, gy] = latLngToCell(portB.latlng.lat, portB.latlng.lng);
      const startSnap = nearestSeaReachableFromPoint(portA.latlng.lat, portA.latlng.lng, 15);
      const goalSnap = nearestSeaReachableFromPoint(portB.latlng.lat, portB.latlng.lng, 15);

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
      const primarySimpl = simplifyMaritimeRoute(primaryFull, 0.4);
      const primarySafe = maritimeRouteCrossesLand(primarySimpl) ? primaryFull : primarySimpl;
      const primaryKm = pathLengthKm(primarySafe);

      // Search alternative
      const altCells = findAlternative([sx, sy], [gx, gy], primaryCells);
      let altSimpl = null, altKm = null;
      if (altCells) {
        const overlap = cellOverlap(primaryCells, altCells);
        const altLL = cellsToLatLngs(altCells, portA.latlng.lng);
        const altFull = [[portA.latlng.lat, portA.latlng.lng], ...altLL, [portB.latlng.lat, portB.latlng.lng]];
        const candidateSimpl = simplifyMaritimeRoute(altFull, 0.4);
        const candidate = maritimeRouteCrossesLand(candidateSimpl) ? altFull : candidateSimpl;
        const candidateKm = pathLengthKm(candidate);
        // Only offer if routes differ meaningfully and alt isn't absurdly longer
        if (overlap < 0.75 && candidateKm < primaryKm * 2.2) {
          altSimpl = candidate;
          altKm = candidateKm;
        }
      }

      if (altSimpl) {
        offerRouteChoice(portA, portB, primarySafe, primaryKm, altSimpl, altKm);
      } else {
        commitRoute(portA, portB, primarySafe, primaryKm, 'primary');
      }
    } finally {
      charting.classList.remove('show');
      isPlottingRoute = false;
      document.body.classList.remove('route-busy');
      syncActionState();
    }
  }

  /* ===== Route layers ===== */
  function drawRouteLayer(latlngs, style = 'primary', preview = false, routeMode = 'maritime', fromEntry = null, toEntry = null) {
    const color = style === 'primary'
      ? getComputedStyle(document.documentElement).getPropertyValue('--route-color').trim()
      : getComputedStyle(document.documentElement).getPropertyValue('--route-alt-color').trim();
    const renderLatLngs = getRenderableRouteLatLngs(latlngs, routeMode);

    if (routeMode === 'connection') {
      const halo = L.polyline(renderLatLngs, {
        color,
        weight: preview ? 9 : 7,
        opacity: preview ? 0.18 : 0.12,
        lineCap: 'round',
        className: 'atlas-route atlas-route-halo'
      });
      const line = L.polyline(renderLatLngs, {
        color,
        weight: preview ? 3 : 2.5,
        opacity: 0.95,
        dashArray: preview ? '10, 10' : '12, 10',
        lineCap: 'round',
        className: 'atlas-route atlas-route-line'
      });
      const arrow = hasVisibleDirectionArrows()
        ? getConnectionArrowLayer(renderLatLngs, color, preview, fromEntry, toEntry)
        : null;
      return L.layerGroup(arrow ? [halo, line, arrow] : [halo, line]);
    }

    const halo = L.polyline(renderLatLngs, {
      color, weight: preview ? 10 : 8, opacity: preview ? 0.25 : 0.18, lineCap: 'round', className: 'atlas-route atlas-route-halo'
    });
    const line = L.polyline(renderLatLngs, {
      color, weight: preview ? 3 : 2.5, opacity: 0.95,
      dashArray: '8, 10', lineCap: 'round', className: 'atlas-route atlas-route-line'
    });
    return L.layerGroup([halo, line]);
  }

  function bindRoutePopup(group, route, portAName, portBName, km, variant, routeMode = 'maritime', fromEntry = null, toEntry = null) {
    const nm = Math.round(km / 1.852);
    const descriptor = routeMode === 'connection'
      ? getConnectionDescriptor(fromEntry, toEntry)
      : (variant === 'primary' ? 'Primary' : 'Alternative');
    group.eachLayer(l => {
      l.bindPopup(`
        <div class="port-popup">
          <strong>${escapeHtml(portAName)} → ${escapeHtml(portBName)}</strong>
          <div class="coord">${Math.round(km).toLocaleString()} km • ${nm.toLocaleString()} nautical mi • ${descriptor}</div>
          <button class="popup-action-btn" type="button" data-route-delete-id="${route.id}">
            <i class="fa-solid fa-trash"></i> Remove ${routeMode === 'connection' ? 'connection' : 'route'}
          </button>
        </div>
      `);
    });
    group.eachLayer((layer) => {
      layer.off('popupopen');
      layer.on('popupopen', (event) => {
        const popupEl = event.popup && event.popup.getElement && event.popup.getElement();
        const deleteBtn = popupEl && popupEl.querySelector('[data-route-delete-id]');
        if (!deleteBtn) return;
        deleteBtn.addEventListener('click', () => {
          deleteRouteById(Number(deleteBtn.dataset.routeDeleteId));
          map.closePopup();
        }, { once: true });
      });
    });
  }

  function refreshRouteLayers() {
    const fallbackPointName = getModeCopy().pointSingular;
    routes.forEach((route) => {
      if (route.layer) map.removeLayer(route.layer);
      route.layer = null;
      if (!hasVisibleRoutes()) return;
      const from = findPort(route.fromId);
      const to = findPort(route.toId);
      const nextGroup = drawRouteLayer(route.latlngs, route.variant, false, route.routeMode || 'maritime', from, to).addTo(map);
      bindRoutePopup(nextGroup, route, from ? from.name : route.fromName || fallbackPointName, to ? to.name : route.toName || fallbackPointName, route.km, route.variant, route.routeMode || 'maritime', from, to);
      route.layer = nextGroup;
      route.fromName = from ? from.name : route.fromName;
      route.toName = to ? to.name : route.toName;
    });
  }

  function offerRouteChoice(portA, portB, primLL, primKm, altLL, altKm) {
    closeRouteChoice({ silent: true });
    // Show both as previews on map
    const primPreview = drawRouteLayer(primLL, 'primary', true, 'maritime', portA, portB).addTo(map);
    const altPreview  = drawRouteLayer(altLL,  'alt',     true, 'maritime', portA, portB).addTo(map);
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
    openModal(routeChoiceModal, { trigger: drawBtn, initialFocus: routeChoices.querySelector('.route-card') || routeChoiceCancel });
    syncActionState();
  }

  function closeRouteChoice(opts) {
    const { silent = false } = opts || {};
    if (routeChoiceState) {
      map.removeLayer(routeChoiceState.primPreview);
      map.removeLayer(routeChoiceState.altPreview);
      routeChoiceState = null;
    }
    closeModal(routeChoiceModal);
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

  function getConnectionDescriptor(fromEntry, toEntry) {
    if (fromEntry && toEntry && fromEntry.pointType === 'airport' && toEntry.pointType === 'airport') {
      return 'Air route';
    }
    return 'Connection';
  }

  function getConnectionArrowLayer(renderLatLngs, color, preview, fromEntry, toEntry) {
    if (!Array.isArray(renderLatLngs) || renderLatLngs.length < 2) return null;
    const segments = [];
    let totalLength = 0;
    for (let index = 1; index < renderLatLngs.length; index += 1) {
      const startLatLng = L.latLng(renderLatLngs[index - 1]);
      const endLatLng = L.latLng(renderLatLngs[index]);
      const a = map.latLngToLayerPoint(startLatLng);
      const b = map.latLngToLayerPoint(endLatLng);
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length <= 0.01) continue;
      segments.push({ a, b, length, startLatLng, endLatLng });
      totalLength += length;
    }
    if (!segments.length || totalLength < 18) return null;
    const targetDistance = totalLength * 0.58;
    let traversed = 0;
    let chosen = segments[segments.length - 1];
    for (const segment of segments) {
      if (traversed + segment.length >= targetDistance) {
        chosen = segment;
        break;
      }
      traversed += segment.length;
    }
    const localDistance = Math.max(0, Math.min(chosen.length, targetDistance - traversed));
    const ratio = chosen.length <= 0 ? 0 : localDistance / chosen.length;
    const lat = chosen.startLatLng.lat + (chosen.endLatLng.lat - chosen.startLatLng.lat) * ratio;
    const lng = chosen.startLatLng.lng + (chosen.endLatLng.lng - chosen.startLatLng.lng) * ratio;
    const angle = Math.atan2(chosen.b.y - chosen.a.y, chosen.b.x - chosen.a.x) * 180 / Math.PI;
    const isAir = fromEntry && toEntry && fromEntry.pointType === 'airport' && toEntry.pointType === 'airport';
    return L.marker([lat, lng], {
      interactive: false,
      icon: L.divIcon({
        className: 'connection-arrow-host atlas-route-arrow',
        html: `<div class="connection-arrow${isAir ? ' is-air' : ''}${preview ? ' is-preview' : ''}" style="--arrow-color:${color}; transform: rotate(${angle}deg);"><i class="fa-solid ${isAir ? 'fa-plane' : 'fa-arrow-right-long'}"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      })
    });
  }

  function deleteRouteById(routeId) {
    const index = routes.findIndex((route) => route.id === routeId);
    if (index === -1) return;
    const [route] = routes.splice(index, 1);
    if (route.layer) map.removeLayer(route.layer);
    updateStats();
    refreshWorkflowState();
    showHint(route.routeMode === 'connection' ? 'Connection removed.' : 'Route removed.');
    scheduleDraftSave();
    scheduleHistorySnapshot();
  }

  function commitRoute(portA, portB, latlngs, km, variant, routeMode = 'maritime', routeId = null) {
    const route = {
      id: routeId || nextRouteId++,
      layer: null,
      fromId: portA.id,
      toId: portB.id,
      fromName: portA.name,
      toName: portB.name,
      variant,
      km,
      latlngs,
      routeMode
    };
    if (route.id >= nextRouteId) nextRouteId = route.id + 1;
    const group = hasVisibleRoutes()
      ? drawRouteLayer(latlngs, variant, false, routeMode, portA, portB).addTo(map)
      : null;
    const nm = Math.round(km / 1.852);
    if (group) bindRoutePopup(group, route, portA.name, portB.name, km, variant, routeMode, portA, portB);
    route.layer = group;
    routes.push(route);
    updateStats();
    refreshWorkflowState();
    showHint(routeMode === 'connection'
      ? `${getConnectionDescriptor(portA, portB)} added: ${portA.name} → ${portB.name} (${Math.round(km).toLocaleString()} km)`
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
    openModal(confirmModal, { trigger: clearBtn, initialFocus: confirmCancel });
  });
  confirmCancel.addEventListener('click', () => closeModal(confirmModal));
  confirmOk.addEventListener('click', () => {
    clearAll();
    closeModal(confirmModal);
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
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeModal(confirmModal); });

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
  const exportAspectSelect = document.getElementById('exportAspectSelect');
  const exportQualitySelect = document.getElementById('exportQualitySelect');
  const exportBackgroundSelect = document.getElementById('exportBackgroundSelect');
  const exportMarkersCheck = document.getElementById('exportMarkersCheck');
  const exportLabelsCheck = document.getElementById('exportLabelsCheck');
  const exportCalloutsCheck = document.getElementById('exportCalloutsCheck');
  const exportRoutesCheck = document.getElementById('exportRoutesCheck');
  const exportDirectionMarkersCheck = document.getElementById('exportDirectionMarkersCheck');
  const exportTitleBlockCheck = document.getElementById('exportTitleBlockCheck');
  const exportLegendCheck = document.getElementById('exportLegendCheck');
  const exportTip = document.getElementById('exportTip');
  const exportCloseBtn = document.getElementById('exportCloseBtn');
  const exportConfirmBtn = document.getElementById('exportConfirmBtn');

  function setExportBusy(isBusy, title, sub) {
    exportModalTitle.textContent = title;
    exportModalSub.textContent = sub;
    [
      exportAreaSelect,
      exportAspectSelect,
      exportQualitySelect,
      exportBackgroundSelect,
      exportMarkersCheck,
      exportLabelsCheck,
      exportCalloutsCheck,
      exportRoutesCheck,
      exportDirectionMarkersCheck,
      exportTitleBlockCheck,
      exportLegendCheck,
      exportCloseBtn,
      exportConfirmBtn
    ].forEach((el) => {
      el.disabled = isBusy;
    });
  }

  function resetExportVisibilityControls() {
    exportMarkersCheck.checked = true;
    exportLabelsCheck.checked = true;
    exportCalloutsCheck.checked = true;
    exportRoutesCheck.checked = true;
    exportDirectionMarkersCheck.checked = true;
    exportTitleBlockCheck.checked = true;
    exportLegendCheck.checked = true;
  }

  function getExportVisibilityFromModal() {
    return {
      markers: !!exportMarkersCheck.checked,
      labels: !!exportLabelsCheck.checked,
      callouts: !!exportCalloutsCheck.checked,
      routes: !!exportRoutesCheck.checked,
      directionMarkers: !!exportDirectionMarkersCheck.checked,
      titleBlock: !!exportTitleBlockCheck.checked,
      legend: !!exportLegendCheck.checked
    };
  }

  function applyExportVisibilityOverride(nextVisibility) {
    exportVisibilityOverride = nextVisibility || null;
    refreshAllMarkers();
    refreshAllLabels();
    refreshAllBubbles();
    refreshPresentationOverlay();
    refreshRouteLayers();
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
    const aspectLabel = exportAspectSelect.value === 'native'
      ? 'Native View preserves the current map proportions.'
      : `The ${exportAspectSelect.options[exportAspectSelect.selectedIndex].text} frame adds presentation padding around the captured map.`;
    const backgroundLabel = exportBackgroundSelect.value === 'transparent'
      ? 'Transparent keeps only the rendered map pixels.'
      : exportBackgroundSelect.value === 'paper'
        ? 'Paper adds a clean white presentation surround.'
        : exportBackgroundSelect.value === 'sea'
          ? 'Sea fill uses your map sea color behind the framed export.'
          : 'Map background keeps the exact rendered map surface.';
    const selectedCount = Object.values(getExportVisibilityFromModal()).filter(Boolean).length;
    exportTip.textContent = `This export captures only the map canvas without the studio sidebar. ${frameLabel} ${qualityLabel} ${aspectLabel} ${backgroundLabel} ${selectedCount} element groups are currently included.`;
  }

  function openExportModal() {
    setExportBusy(false, 'Export PNG', 'Choose the framing and output quality.');
    resetExportVisibilityControls();
    updateExportTip();
    openModal(exportModal, { trigger: exportPngBtn, initialFocus: exportAreaSelect });
    refreshWorkflowState();
  }

  function closeExportModal() {
    closeModal(exportModal);
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
      if (hasVisibleCallouts() && markerEntry.bubbleVisible && markerEntry.bubble && markerEntry.bubble.isConnected) {
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

    if (hasVisibleRoutes()) {
      routes.forEach((route) => {
        route.latlngs.forEach(([lat, lng]) => {
          bounds.extend([lat, lng]);
          hasContent = true;
        });
      });
    }

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
      if (hasVisibleLabels()) pushRect(tooltip && tooltip.getElement());
      if (hasVisibleCallouts()) pushRect(entry.bubble && entry.bubble.querySelector('.info-bubble'));
    });

    if (hasVisibleTitleBlock()) pushRect(mapTitleBlock);
    if (hasVisibleLegend()) pushRect(mapLegendBlock);

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

  async function settleMapBeforeCapture(delay = 180) {
    map.invalidateSize(false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async function withPreparedExportFrame(frameMode, visibility, callback) {
    const previousView = {
      center: [map.getCenter().lat, map.getCenter().lng],
      zoom: map.getZoom()
    };
    let changedView = false;
    applyExportVisibilityOverride(visibility);

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
        await settleMapBeforeCapture(220);
        await nudgeViewToFitOverlayRects(88);
        await settleMapBeforeCapture(180);
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
      applyExportVisibilityOverride(null);
    }
  }

  function buildFramedExportCanvas(canvas, aspectKey, backgroundKey) {
    const ratio = EXPORT_ASPECTS[aspectKey] || null;
    const fill = backgroundKey === 'transparent'
      ? null
      : backgroundKey === 'paper'
        ? '#ffffff'
        : backgroundKey === 'sea'
          ? settings.seaColor
          : (getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff');
    if (!ratio) {
      if (fill == null) return canvas;
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = canvas.width;
      baseCanvas.height = canvas.height;
      const baseCtx = baseCanvas.getContext('2d');
      baseCtx.fillStyle = fill;
      baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
      baseCtx.drawImage(canvas, 0, 0);
      return baseCanvas;
    }

    const sourceWidth = canvas.width;
    const sourceHeight = canvas.height;
    let outputWidth = sourceWidth;
    let outputHeight = Math.round(outputWidth / ratio);
    if (outputHeight < sourceHeight) {
      outputHeight = sourceHeight;
      outputWidth = Math.round(outputHeight * ratio);
    }
    const padX = Math.round(outputWidth * 0.05);
    const padY = Math.round(outputHeight * 0.05);
    const availableWidth = Math.max(1, outputWidth - padX * 2);
    const availableHeight = Math.max(1, outputHeight - padY * 2);
    const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
    const drawWidth = Math.round(sourceWidth * scale);
    const drawHeight = Math.round(sourceHeight * scale);
    const offsetX = Math.round((outputWidth - drawWidth) / 2);
    const offsetY = Math.round((outputHeight - drawHeight) / 2);
    const framedCanvas = document.createElement('canvas');
    framedCanvas.width = outputWidth;
    framedCanvas.height = outputHeight;
    const framedCtx = framedCanvas.getContext('2d');
    if (fill != null) {
      framedCtx.fillStyle = fill;
      framedCtx.fillRect(0, 0, outputWidth, outputHeight);
    }
    framedCtx.drawImage(canvas, offsetX, offsetY, drawWidth, drawHeight);
    return framedCanvas;
  }

  function getCanvasRouteSegments(latlngs) {
    if (!Array.isArray(latlngs) || latlngs.length < 2) return [];
    const mapWidth = Math.max(1, map.getSize().x);
    const rawPoints = latlngs.map((latlng) => map.latLngToContainerPoint(L.latLng(latlng)));
    const segments = [];
    let currentSegment = [];
    let previous = null;

    rawPoints.forEach((point) => {
      let chosen = { x: point.x, y: point.y };
      if (previous) {
        const variants = [-1, 0, 1].map((multiplier) => ({
          x: point.x + multiplier * mapWidth,
          y: point.y
        }));
        chosen = variants.reduce((best, candidate) => {
          const bestDist = Math.abs(best.x - previous.x);
          const candidateDist = Math.abs(candidate.x - previous.x);
          return candidateDist < bestDist ? candidate : best;
        }, chosen);
        if (Math.abs(chosen.x - previous.x) > mapWidth * 0.7) {
          if (currentSegment.length >= 2) segments.push(currentSegment);
          currentSegment = [];
        }
      }
      currentSegment.push(chosen);
      previous = chosen;
    });

    if (currentSegment.length >= 2) segments.push(currentSegment);
    return segments;
  }

  function drawPolylineOnCanvas(ctx, segments, options) {
    if (!Array.isArray(segments) || !segments.length) return;
    ctx.save();
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.globalAlpha = options.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(options.dash || []);
    segments.forEach((points) => {
      if (!Array.isArray(points) || points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawConnectionArrowOnCanvas(ctx, routeSegments, color, fromEntry, toEntry) {
    if (!hasVisibleDirectionArrows() || !Array.isArray(routeSegments) || !routeSegments.length) return;
    let totalLength = 0;
    const flattenedSegments = [];
    routeSegments.forEach((points) => {
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length <= 0.01) continue;
        flattenedSegments.push({ a, b, length });
        totalLength += length;
      }
    });
    if (!flattenedSegments.length || totalLength < 18) return;
    const targetDistance = totalLength * 0.58;
    let traversed = 0;
    let chosen = flattenedSegments[flattenedSegments.length - 1];
    for (const segment of flattenedSegments) {
      if (traversed + segment.length >= targetDistance) {
        chosen = segment;
        break;
      }
      traversed += segment.length;
    }
    const localDistance = Math.max(0, Math.min(chosen.length, targetDistance - traversed));
    const ratio = chosen.length <= 0 ? 0 : localDistance / chosen.length;
    const x = chosen.a.x + (chosen.b.x - chosen.a.x) * ratio;
    const y = chosen.a.y + (chosen.b.y - chosen.a.y) * ratio;
    const angle = Math.atan2(chosen.b.y - chosen.a.y, chosen.b.x - chosen.a.x);
    const isAir = fromEntry && toEntry && fromEntry.pointType === 'airport' && toEntry.pointType === 'airport';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.92;
    if (isAir) {
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-4, -4.5);
      ctx.lineTo(-1.5, -0.8);
      ctx.lineTo(-8, -0.8);
      ctx.lineTo(-8, 0.8);
      ctx.lineTo(-1.5, 0.8);
      ctx.lineTo(-4, 4.5);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-5, -5);
      ctx.lineTo(-2.2, 0);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function createExportRouteOverlay() {
    if (!hasVisibleRoutes() || !routes.length) return null;
    const mapEl = document.getElementById('map');
    const width = mapEl.clientWidth;
    const height = mapEl.clientHeight;
    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.className = 'export-route-overlay';
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    routes.forEach((route) => {
      const from = findPort(route.fromId);
      const to = findPort(route.toId);
      const color = route.variant === 'primary'
        ? getComputedStyle(document.documentElement).getPropertyValue('--route-color').trim()
        : getComputedStyle(document.documentElement).getPropertyValue('--route-alt-color').trim();
      const latlngs = getRenderableRouteLatLngs(route.latlngs, route.routeMode || 'maritime');
      const segments = getCanvasRouteSegments(latlngs);
      if (route.routeMode === 'connection') {
        drawPolylineOnCanvas(ctx, segments, { color, lineWidth: 7, opacity: 0.12, dash: [] });
        drawPolylineOnCanvas(ctx, segments, { color, lineWidth: 2.5, opacity: 0.95, dash: [12, 10] });
        drawConnectionArrowOnCanvas(ctx, segments, color, from, to);
      } else {
        drawPolylineOnCanvas(ctx, segments, { color, lineWidth: 8, opacity: 0.18, dash: [] });
        drawPolylineOnCanvas(ctx, segments, { color, lineWidth: 2.5, opacity: 0.95, dash: [8, 10] });
      }
    });

    mapEl.appendChild(canvas);
    return canvas;
  }

  function setNativeRouteVisibility(isVisible) {
    document.querySelectorAll('.atlas-route, .atlas-route-arrow').forEach((el) => {
      el.classList.toggle('export-hidden-route', !isVisible);
    });
  }

  async function renderMapCanvas(frameMode, quality, aspectKey = 'native', backgroundKey = 'map', visibility = null) {
    const exportQuality = quality || 'high';
    const exportScale = EXPORT_QUALITY_SCALE[exportQuality] || EXPORT_QUALITY_SCALE.high;
    map.closePopup();

    return withPreparedExportFrame(frameMode, visibility, async () => {
      document.body.classList.add('exporting');
      await settleMapBeforeCapture(180);
      const exportRouteOverlay = createExportRouteOverlay();
      setNativeRouteVisibility(false);

      const target = document.getElementById('map');
      const targetRect = target.getBoundingClientRect();
      try {
        return await html2canvas(target, {
          useCORS: true,
          allowTaint: false,
          backgroundColor: backgroundKey === 'transparent'
            ? null
            : (getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#ffffff'),
          logging: false,
          scale: exportScale,
          width: Math.ceil(targetRect.width),
          height: Math.ceil(targetRect.height),
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          scrollX: 0,
          scrollY: 0
        }).then((canvas) => buildFramedExportCanvas(canvas, aspectKey, backgroundKey));
      } finally {
        if (exportRouteOverlay && exportRouteOverlay.isConnected) exportRouteOverlay.remove();
        setNativeRouteVisibility(true);
      }
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
        pointType: m.pointType,
        iconKey: m.iconKey,
        markerColor: m.markerColor,
        details: m.details || '',
        bubbleVisible: !!m.bubbleVisible,
        bubbleWidth: hasManualBubbleWidth(m) ? getBubbleWidth(m) : null,
        bubbleHeight: hasManualBubbleHeight(m) ? getBubbleHeight(m) : null,
        bubbleWidthUserSized: !!m.bubbleWidthUserSized,
        bubbleHeightUserSized: !!m.bubbleHeightUserSized,
        bubbleOffsetX: getBubbleOffset(m).x,
        bubbleOffsetY: getBubbleOffset(m).y,
        bubbleLat: m.bubbleVisible ? getLegacyBubbleLatLng(m).lat : null,
        bubbleLng: m.bubbleVisible ? getLegacyBubbleLatLng(m).lng : null
      })),
      routes: routes.map(r => ({
        id: r.id,
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

  function hasPendingDraftChanges() {
    const atlasState = buildAtlasState({ includeExported: false });
    if (!hasMeaningfulAtlasState(atlasState)) return false;
    return atlasStateSignature(atlasState) !== lastSavedDraftSignature;
  }

  function applyAtlasState(data, opts) {
    const options = opts || {};
    const normalizedData = normalizeAtlasFormat(data);
    if (!normalizedData) {
      showHint(`Import failed — ${lastAtlasValidationError || 'invalid atlas data.'}`);
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
            pointType: p.pointType,
            iconKey: p.iconKey,
            markerColor: p.markerColor,
            details: p.details || '',
            bubbleVisible: !!p.bubbleVisible,
            bubbleWidth: p.bubbleWidth,
            bubbleHeight: p.bubbleHeight,
            bubbleWidthUserSized: !!p.bubbleWidthUserSized,
            bubbleHeightUserSized: !!p.bubbleHeightUserSized,
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
          commitRoute(a, b, latlngs, km, r.variant || 'primary', r.routeMode || 'maritime', r.id);
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
            featureType: port.pointType || (atlasState.settings.atlasMode === 'maritime' ? 'port' : 'location'),
            id: port.id,
            name: port.name,
            pointType: port.pointType,
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
            coordinates: getRenderableRouteLatLngs(route.latlngs, route.routeMode || 'maritime').map((latlng) => {
              const point = L.latLng(latlng);
              return [point.lng, point.lat];
            })
          },
          properties: {
            id: route.id,
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
    const exportAspect = exportAspectSelect.value;
    const exportQuality = exportQualitySelect.value;
    const exportBackground = exportBackgroundSelect.value;
    const exportVisibility = getExportVisibilityFromModal();

    setExportBusy(true, 'Rendering PNG…', 'Preparing the selected framing and quality.');

    try {
      const canvas = await renderMapCanvas(exportArea, exportQuality, exportAspect, exportBackground, exportVisibility);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG blob generation failed');

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filenameBase = slugifyFilename(settings.atlasTitle || 'open-atlas');
      triggerDownload(blob, `${filenameBase}-${ts}.png`);

      closeExportModal();
      showHint(`PNG exported: ${exportAspect === 'native' ? 'native frame' : exportAspect} at ${exportQuality} quality.`);
    } catch (err) {
      console.error('PNG export error', err);
      showHint('Export failed — try reducing quality or simplifying the map.', true);
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
      const canvas = await renderMapCanvas('current-view', 'high', 'native', 'map');
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
        showHint(`Invalid atlas JSON file — ${lastAtlasValidationError || 'check the file contents.'}`);
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
  [exportAreaSelect, exportAspectSelect, exportQualitySelect, exportBackgroundSelect, exportMarkersCheck, exportLabelsCheck, exportCalloutsCheck, exportRoutesCheck, exportDirectionMarkersCheck, exportTitleBlockCheck, exportLegendCheck].forEach((el) => {
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
  window.addEventListener('beforeunload', (e) => {
    if (!hasPendingDraftChanges()) return;
    e.preventDefault();
    e.returnValue = '';
  });

  /* ===== Init ===== */
  populatePointTypeSelect(pointTypeInput);
  populatePointTypeSelect(portEditType);
  populateFontSelect(displayFontSelect, ['cormorant', 'fraunces', 'playfair', 'space']);
  populateFontSelect(bodyFontSelect, ['cormorant', 'fraunces', 'playfair', 'manrope', 'space']);
  populateFontSelect(uiFontSelect, ['jetbrains', 'ibmplexmono', 'space', 'manrope']);
  populatePresetGrid();
  storedDraft = loadStoredDraft();
  lastSavedDraftSignature = storedDraft ? atlasStateSignature({
    view: storedDraft.view,
    settings: storedDraft.settings,
    ports: storedDraft.ports,
    routes: storedDraft.routes
  }) : '';
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
