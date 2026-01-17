const STORAGE_KEY = "vhud_settings_v1";

const DEFAULTS = {
  enabled: true,
  fg: "#00ff88",
  bg: "rgba(0,0,0,0.75)",
  fontSize: 14,
  padding: 10,
  radius: 10,
  posMode: "corner",
  corner: "tr",
  x: 10,
  y: 10,
  showDisplay: true,
  showFps: true,
  showDropped: true,
  visibilityMode: "always",
  idleHideMs: 1500,
  hoverHideMs: 1200
};

function load() {
  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULTS }, (data) => {
    const cfg = data[STORAGE_KEY] || DEFAULTS;

    enabled.checked = cfg.enabled;
    visibilityMode.value = cfg.visibilityMode;
    idleHideMs.value = cfg.idleHideMs;
    hoverHideMs.value = cfg.hoverHideMs;

    posMode.value = cfg.posMode;
    corner.value = cfg.corner;
    x.value = cfg.x;
    y.value = cfg.y;

    fontSize.value = cfg.fontSize;
    padding.value = cfg.padding;
    radius.value = cfg.radius;
    fg.value = cfg.fg;

    showDisplay.checked = cfg.showDisplay;
    showFps.checked = cfg.showFps;
    showDropped.checked = cfg.showDropped;
  });
}

function saveAndApply() {
  const cfg = {
    enabled: enabled.checked,
    visibilityMode: visibilityMode.value,
    idleHideMs: Number(idleHideMs.value || DEFAULTS.idleHideMs),
    hoverHideMs: Number(hoverHideMs.value || DEFAULTS.hoverHideMs),

    posMode: posMode.value,
    corner: corner.value,
    x: Number(x.value || DEFAULTS.x),
    y: Number(y.value || DEFAULTS.y),

    fontSize: Number(fontSize.value || DEFAULTS.fontSize),
    padding: Number(padding.value || DEFAULTS.padding),
    radius: Number(radius.value || DEFAULTS.radius),
    fg: fg.value,

    // bg fijo (si quieres lo añadimos al popup también)
    bg: DEFAULTS.bg,

    showDisplay: showDisplay.checked,
    showFps: showFps.checked,
    showDropped: showDropped.checked
  };

  chrome.storage.sync.set({ [STORAGE_KEY]: cfg }, () => {
    chrome.runtime.sendMessage({ type: "APPLY_SETTINGS" }, () => window.close());
  });
}

document.addEventListener("DOMContentLoaded", load);
apply.addEventListener("click", saveAndApply);
