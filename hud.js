(() => {
  // Evitar múltiples instancias
  if (window.__VHUD?.initialized) {
    console.log('[VHUD] Already initialized');
    return;
  }

  const ROOT_ID = "vhud-root";
  const STYLE_ID = "vhud-style";
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
    hoverHideMs: 1200,
    handleSize: 10
  };

  // Singleton global
  window.__VHUD = {
    initialized: true,
    cfg: { ...DEFAULTS },
    rendering: false,
    cleanup: null
  };

  // === Utilidades ===
  async function safeGetCfg() {
    try {
      if (!chrome?.storage?.sync) return { ...DEFAULTS };

      return await new Promise((resolve) => {
        chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULTS }, (data) => {
          const stored = data?.[STORAGE_KEY];
          resolve(stored ? { ...DEFAULTS, ...stored } : { ...DEFAULTS });
        });
      });
    } catch (e) {
      console.error('[VHUD] Error loading config:', e);
      return { ...DEFAULTS };
    }
  }

  async function saveCfg(cfg) {
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: cfg }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      console.error('[VHUD] Error saving config:', e);
    }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // === Video Detection ===
  class VideoTracker {
    constructor() {
      this.currentVideo = null;
      this.observer = null;
    }

    findVideo() {
      const videos = Array.from(document.querySelectorAll("video"));
      if (!videos.length) return null;

      // Ordenar por área visible
      videos.sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        return (rb.width * rb.height) - (ra.width * ra.height);
      });

      return videos[0];
    }

    getQuality(video) {
      if (!video) return null;

      if (typeof video.getVideoPlaybackQuality === "function") {
        return video.getVideoPlaybackQuality();
      }

      return {
        totalVideoFrames: video.webkitDecodedFrameCount ?? null,
        droppedVideoFrames: video.webkitDroppedFrameCount ?? null
      };
    }

    startObserving(onChange) {
      if (this.observer) this.observer.disconnect();

      this.observer = new MutationObserver(() => {
        const video = this.findVideo();
        if (video && video !== this.currentVideo) {
          this.currentVideo = video;
          onChange(video);
        }
      });

      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.currentVideo = null;
    }
  }

  // === FPS Calculator ===
  class FPSCalculator {
    constructor() {
      this.reset();
    }

    reset() {
      this.fps = null;
      this.rvfcActive = false;
      this.lastPresentedFrames = null;
      this.lastCheckTime = null;
      this.sampleActive = false;
      this.sampleLastFrames = null;
      this.sampleLastT = 0;
      this.sampleTimer = null;
      this.rvfcCallback = null;
    }

    cleanup() {
      this.rvfcActive = false;
      this.sampleActive = false;
      if (this.sampleTimer) {
        clearTimeout(this.sampleTimer);
        this.sampleTimer = null;
      }
      this.rvfcCallback = null;
    }

    startRVFC(video) {
      if (!video || typeof video.requestVideoFrameCallback !== "function") {
        return false;
      }

      if (this.rvfcActive) return true;

      this.rvfcActive = true;
      this.lastPresentedFrames = null;
      this.lastCheckTime = performance.now();

      const callback = (now, metadata) => {
        if (!this.rvfcActive) return;

        // Usar presentedFrames del metadata (contador de frames únicos)
        if (metadata && metadata.presentedFrames != null) {
          const currentTime = performance.now();
          const elapsed = (currentTime - this.lastCheckTime) / 1000;

          if (this.lastPresentedFrames != null && elapsed >= 1.0) {
            const framesDiff = metadata.presentedFrames - this.lastPresentedFrames;
            this.fps = framesDiff / elapsed;

            this.lastPresentedFrames = metadata.presentedFrames;
            this.lastCheckTime = currentTime;
          } else if (this.lastPresentedFrames == null) {
            // Inicializar
            this.lastPresentedFrames = metadata.presentedFrames;
            this.lastCheckTime = currentTime;
          }
        }

        try {
          video.requestVideoFrameCallback(callback);
        } catch (e) {
          console.error('[VHUD] RVFC error:', e);
          this.rvfcActive = false;
        }
      };

      this.rvfcCallback = callback;
      video.requestVideoFrameCallback(callback);
      return true;
    }

    startSampler(video, getQualityFn) {
      if (this.sampleActive) return;

      this.sampleActive = true;
      this.sampleLastFrames = null;
      this.sampleLastT = 0;

      const loop = () => {
        if (!this.sampleActive) return;

        const quality = getQualityFn(video);
        const total = quality?.totalVideoFrames ?? null;
        const now = performance.now();

        if (total != null) {
          if (this.sampleLastFrames != null && this.sampleLastT) {
            const df = total - this.sampleLastFrames;
            const dt = (now - this.sampleLastT) / 1000;

            if (dt >= 1.0) {
              this.fps = df / dt;
              this.sampleLastFrames = total;
              this.sampleLastT = now;
            }
          } else {
            this.sampleLastFrames = total;
            this.sampleLastT = now;
          }
        }

        this.sampleTimer = setTimeout(loop, 250);
      };

      loop();
    }

    getFPS() {
      return this.fps;
    }
  }

  // === UI Manager ===
  class UIManager {
    constructor() {
      this.root = null;
      this.handleEl = null;
      this.contentEl = null;
      this.hideTimer = null;
      this.lastActivity = performance.now();
      this.dragging = false;
      this.dragStart = { x: 0, y: 0, left: 0, top: 0 };
      this.boundListeners = new Map();
    }

    ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${ROOT_ID} {
          user-select: none;
          -webkit-user-select: none;
        }
        #${ROOT_ID}.vhud-dragging {
          cursor: grabbing !important;
        }
        #${ROOT_ID} .vhud-handle {
          cursor: grab;
          transition: opacity 150ms ease;
        }
        #${ROOT_ID} .vhud-handle:hover {
          opacity: 1 !important;
        }
        #${ROOT_ID} .vhud-content {
          transition: opacity 120ms linear;
        }
      `;
      document.documentElement.appendChild(style);
    }

    createDOM(cfg) {
      this.root = document.createElement("div");
      this.root.id = ROOT_ID;

      this.handleEl = document.createElement("div");
      this.handleEl.className = "vhud-handle";

      this.contentEl = document.createElement("div");
      this.contentEl.className = "vhud-content";

      this.root.appendChild(this.handleEl);
      this.root.appendChild(this.contentEl);

      document.documentElement.appendChild(this.root);
      this.updateStyles(cfg);
    }

    updateStyles(cfg) {
      if (!this.root) return;

      this.root.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        pointer-events: auto;
      `;

      this.handleEl.style.cssText = `
        width: ${cfg.handleSize}px;
        height: ${Math.max(40, cfg.fontSize * 3)}px;
        border-radius: ${cfg.radius}px;
        background: ${cfg.fg};
        opacity: 0.85;
        box-shadow: 0 8px 18px rgba(0,0,0,0.35);
      `;

      this.contentEl.style.cssText = `
        margin-top: 6px;
        color: ${cfg.fg};
        background: ${cfg.bg};
        font-size: ${cfg.fontSize}px;
        padding: ${cfg.padding}px ${cfg.padding}px;
        border-radius: ${cfg.radius}px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        white-space: pre;
        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        transition: opacity 120ms linear;
        opacity: 1;
      `;
    }

    applyPosition(cfg) {
      if (!this.root) return;

      this.root.style.top = this.root.style.right = this.root.style.bottom = this.root.style.left = "";

      if (cfg.posMode === "xy") {
        this.root.style.left = `${cfg.x}px`;
        this.root.style.top = `${cfg.y}px`;
        return;
      }

      const positions = {
        tl: { top: 10, left: 10 },
        tr: { top: 10, right: 10 },
        bl: { bottom: 10, left: 10 },
        br: { bottom: 10, right: 10 }
      };

      const pos = positions[cfg.corner] || positions.tr;

      Object.entries(pos).forEach(([key, value]) => {
        this.root.style[key] = `${value}px`;
      });
    }

    clampPosition(cfg) {
      if (!this.root || cfg.posMode !== "xy") return;

      const rect = this.root.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;

      cfg.x = clamp(Math.round(cfg.x), 0, Math.max(0, Math.round(maxLeft)));
      cfg.y = clamp(Math.round(cfg.y), 0, Math.max(0, Math.round(maxTop)));

      this.root.style.left = `${cfg.x}px`;
      this.root.style.top = `${cfg.y}px`;
    }

    setContentVisible(visible) {
      if (!this.contentEl) return;

      this.contentEl.style.opacity = visible ? "1" : "0";

      const cfg = window.__VHUD.cfg;
      this.handleEl.style.display = (cfg.visibilityMode === "hover") ? "block" : "none";
    }

    scheduleHide(ms) {
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => this.setContentVisible(false), ms);
    }

    setupEventListeners(onDragEnd) {
      // Limpiar listeners previos
      this.removeEventListeners();

      const cfg = window.__VHUD.cfg;

      // === Handle drag ===
      const onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault();

        window.__VHUD.cfg.posMode = "xy";

        const rect = this.root.getBoundingClientRect();
        this.dragging = true;
        this.root.classList.add("vhud-dragging");

        this.dragStart = {
          x: e.clientX,
          y: e.clientY,
          left: rect.left,
          top: rect.top
        };

        this.setContentVisible(true);
      };

      const onMouseMove = (e) => {
        if (!this.dragging) return;

        const cfg = window.__VHUD.cfg;
        const rect = this.root.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;

        cfg.x = clamp(
          Math.round(this.dragStart.left + (e.clientX - this.dragStart.x)),
          0,
          Math.max(0, Math.round(maxLeft))
        );
        cfg.y = clamp(
          Math.round(this.dragStart.top + (e.clientY - this.dragStart.y)),
          0,
          Math.max(0, Math.round(maxTop))
        );

        this.root.style.left = `${cfg.x}px`;
        this.root.style.top = `${cfg.y}px`;
        this.root.style.right = "";
        this.root.style.bottom = "";
      };

      const onMouseUp = async () => {
        if (!this.dragging) return;

        this.dragging = false;
        this.root.classList.remove("vhud-dragging");

        const cfg = window.__VHUD.cfg;
        this.clampPosition(cfg);

        await saveCfg(cfg);
        if (onDragEnd) onDragEnd();
      };

      // === Hover ===
      const onRootEnter = () => {
        if (window.__VHUD.cfg.visibilityMode === "hover") {
          this.setContentVisible(true);
        }
      };

      const onRootMove = () => {
        if (window.__VHUD.cfg.visibilityMode === "hover") {
          this.setContentVisible(true);
          this.scheduleHide(window.__VHUD.cfg.hoverHideMs);
        }
      };

      const onRootLeave = () => {
        if (window.__VHUD.cfg.visibilityMode === "hover") {
          this.scheduleHide(window.__VHUD.cfg.hoverHideMs);
        }
      };

      // === Activity tracking ===
      const onActivity = () => {
        this.lastActivity = performance.now();
        if (window.__VHUD.cfg.visibilityMode === "idle") {
          this.setContentVisible(true);
        }
      };

      // === Resize ===
      const onResize = () => {
        const cfg = window.__VHUD.cfg;
        if (cfg.posMode === "xy") {
          this.clampPosition(cfg);
        }
      };

      // Registrar listeners
      this.handleEl.addEventListener("mousedown", onMouseDown);
      this.boundListeners.set('handleMouseDown', { el: this.handleEl, type: 'mousedown', fn: onMouseDown });

      window.addEventListener("mousemove", onMouseMove, { passive: true });
      this.boundListeners.set('windowMouseMove', { el: window, type: 'mousemove', fn: onMouseMove });

      window.addEventListener("mouseup", onMouseUp);
      this.boundListeners.set('windowMouseUp', { el: window, type: 'mouseup', fn: onMouseUp });

      this.root.addEventListener("mouseenter", onRootEnter);
      this.boundListeners.set('rootEnter', { el: this.root, type: 'mouseenter', fn: onRootEnter });

      this.root.addEventListener("mousemove", onRootMove);
      this.boundListeners.set('rootMove', { el: this.root, type: 'mousemove', fn: onRootMove });

      this.root.addEventListener("mouseleave", onRootLeave);
      this.boundListeners.set('rootLeave', { el: this.root, type: 'mouseleave', fn: onRootLeave });

      window.addEventListener("mousemove", onActivity, { passive: true });
      this.boundListeners.set('activityMove', { el: window, type: 'mousemove', fn: onActivity });

      window.addEventListener("keydown", onActivity, { passive: true });
      this.boundListeners.set('activityKey', { el: window, type: 'keydown', fn: onActivity });

      window.addEventListener("wheel", onActivity, { passive: true });
      this.boundListeners.set('activityWheel', { el: window, type: 'wheel', fn: onActivity });

      window.addEventListener("resize", onResize);
      this.boundListeners.set('resize', { el: window, type: 'resize', fn: onResize });
    }

    removeEventListeners() {
      this.boundListeners.forEach(({ el, type, fn }) => {
        el.removeEventListener(type, fn);
      });
      this.boundListeners.clear();
    }

    updateContent(lines) {
      if (!this.contentEl) return;
      this.contentEl.textContent = lines.join("\n");
    }

    cleanup() {
      this.removeEventListeners();

      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }

      if (this.root && this.root.parentNode) {
        this.root.remove();
      }

      this.root = null;
      this.handleEl = null;
      this.contentEl = null;
    }
  }

  // === Main Controller ===
  class VHUDController {
    constructor() {
      this.ui = new UIManager();
      this.videoTracker = new VideoTracker();
      this.fpsCalc = new FPSCalculator();
      this.renderLoop = null;
      this.idleCheckLoop = null;
    }

    async init() {
      const cfg = await safeGetCfg();
      window.__VHUD.cfg = cfg;

      if (!cfg.enabled) {
        this.cleanup();
        return;
      }

      this.ui.ensureStyle();

      if (!this.ui.root) {
        this.ui.createDOM(cfg);
      } else {
        this.ui.updateStyles(cfg);
      }

      this.ui.applyPosition(cfg);

      requestAnimationFrame(() => {
        if (cfg.posMode === "xy") {
          this.ui.clampPosition(cfg);
        }
      });

      // Setup listeners
      this.ui.setupEventListeners(() => {
        window.__VHUD.cfg = { ...window.__VHUD.cfg };
      });

      // Setup video tracking
      this.videoTracker.startObserving((video) => {
        console.log('[VHUD] Video changed');
        this.fpsCalc.cleanup();
        this.fpsCalc.reset();
      });

      // Initial visibility
      this.initVisibility(cfg);

      // Start loops
      this.startRenderLoop();
      this.startIdleCheck();
    }

    initVisibility(cfg) {
      if (cfg.visibilityMode === "always") {
        this.ui.setContentVisible(true);
      } else if (cfg.visibilityMode === "hover") {
        this.ui.setContentVisible(false);
        // Flash inicial
        this.ui.setContentVisible(true);
        this.ui.scheduleHide(700);
      } else if (cfg.visibilityMode === "idle") {
        this.ui.setContentVisible(true);
      }
    }

    startIdleCheck() {
      if (this.idleCheckLoop) return;

      const check = () => {
        const cfg = window.__VHUD.cfg;
        if (cfg.visibilityMode === "idle") {
          const now = performance.now();
          if (now - this.ui.lastActivity > cfg.idleHideMs) {
            this.ui.setContentVisible(false);
          }
        }
        this.idleCheckLoop = requestAnimationFrame(check);
      };

      this.idleCheckLoop = requestAnimationFrame(check);
    }

    startRenderLoop() {
      if (window.__VHUD.rendering) return;
      window.__VHUD.rendering = true;

      const render = () => {
        const cfg = window.__VHUD.cfg;

        let video = this.videoTracker.currentVideo || this.videoTracker.findVideo();

        if (video && video !== this.videoTracker.currentVideo) {
          this.videoTracker.currentVideo = video;
          this.fpsCalc.cleanup();
          this.fpsCalc.reset();
        }

        if (!video) {
          this.ui.updateContent(["No video detected"]);
          this.renderLoop = requestAnimationFrame(render);
          return;
        }

        // Iniciar FPS tracking
        if (!this.fpsCalc.rvfcActive && !this.fpsCalc.sampleActive) {
          const rvfcOk = this.fpsCalc.startRVFC(video);
          if (!rvfcOk) {
            this.fpsCalc.startSampler(video, (v) => this.videoTracker.getQuality(v));
          }
        }

        // Recopilar datos
        const w = video.videoWidth || 0;
        const h = video.videoHeight || 0;
        const rect = video.getBoundingClientRect();
        const dw = Math.round(rect.width);
        const dh = Math.round(rect.height);
        const quality = this.videoTracker.getQuality(video);
        const total = quality?.totalVideoFrames ?? null;
        const dropped = quality?.droppedVideoFrames ?? null;
        const fps = this.fpsCalc.getFPS();

        // Generar líneas
        const lines = [];
        lines.push(`REAL:    ${w}×${h}`);

        if (cfg.showDisplay) {
          lines.push(`DISPLAY: ${dw}×${dh}`);
        }

        if (cfg.showFps) {
          lines.push(`FPS:     ${fps != null ? fps.toFixed(1) : "n/a"}`);
        }

        if (cfg.showDropped) {
          if (dropped != null && total != null && total > 0) {
            const pct = ((dropped / total) * 100).toFixed(2);
            lines.push(`DROPPED: ${dropped} (${pct}%)`);
          } else {
            lines.push(`DROPPED: n/a`);
          }
        }

        this.ui.updateContent(lines);

        if (cfg.posMode === "xy") {
          this.ui.clampPosition(cfg);
        }

        this.renderLoop = requestAnimationFrame(render);
      };

      this.renderLoop = requestAnimationFrame(render);
    }

    cleanup() {
      window.__VHUD.rendering = false;

      if (this.renderLoop) {
        cancelAnimationFrame(this.renderLoop);
        this.renderLoop = null;
      }

      if (this.idleCheckLoop) {
        cancelAnimationFrame(this.idleCheckLoop);
        this.idleCheckLoop = null;
      }

      this.fpsCalc.cleanup();
      this.videoTracker.cleanup();
      this.ui.cleanup();
    }
  }

  // === Message Handling ===
  const controller = new VHUDController();

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "VHUD_PING") {
      sendResponse({ ok: true });
      return true;
    }

    if (msg?.type === "VHUD_APPLY") {
      controller.cleanup();
      controller.init()
        .then(() => sendResponse({ ok: true }))
        .catch((e) => {
          console.error('[VHUD] Apply error:', e);
          sendResponse({ ok: false, error: String(e?.message || e) });
        });
      return true;
    }

    return false;
  });

  // === Cleanup global ===
  window.__VHUD.cleanup = () => {
    controller.cleanup();
    window.__VHUD.initialized = false;
  };

  // Auto-start
  controller.init().catch(e => {
    console.error('[VHUD] Init error:', e);
  });
})();