const HUD_FILE = "hud.js";

// Cache para evitar inyecciones duplicadas
const injectionStates = new Map();

async function injectOnce(tabId) {
  try {
    // Verificar si ya está en proceso
    if (injectionStates.get(tabId) === 'injecting') {
      return { injected: false, already: true, status: 'in_progress' };
    }

    // Ping con timeout
    try {
      const pong = await Promise.race([
        chrome.tabs.sendMessage(tabId, { type: "VHUD_PING" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
      ]);
      
      if (pong?.ok) {
        injectionStates.set(tabId, 'injected');
        return { injected: false, already: true };
      }
    } catch (e) {
      // No responde, necesitamos inyectar
    }

    // Inyectar
    injectionStates.set(tabId, 'injecting');
    
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: [HUD_FILE]
    });

    injectionStates.set(tabId, 'injected');
    return { injected: true };
    
  } catch (e) {
    injectionStates.delete(tabId);
    console.error("injectOnce error:", e);
    return { injected: false, error: String(e?.message || e) };
  }
}

async function applySettingsToTab(tabId) {
  const inj = await injectOnce(tabId);

  // Esperar un momento si acabamos de inyectar
  if (inj.injected) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: "VHUD_APPLY" });
    return { ok: true, inj };
  } catch (e) {
    console.error("sendMessage error:", e);
    return { ok: false, inj, error: String(e?.message || e) };
  }
}

async function setBadge(tabId, text) {
  try {
    await chrome.action.setBadgeText({ tabId, text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: text === "OK" ? "#00ff88" : "#ff3333" });
  } catch (e) {
    console.error("setBadge error:", e);
  }
}

// Limpiar cache cuando se cierra un tab
chrome.tabs.onRemoved.addListener((tabId) => {
  injectionStates.delete(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "APPLY_SETTINGS") {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        sendResponse({ ok: false, error: "No active tab" });
        return;
      }

      const res = await applySettingsToTab(tab.id);
      await setBadge(tab.id, res.ok ? "OK" : "ER");

      // Auto-limpiar badge después de 2s
      setTimeout(() => setBadge(tab.id, ""), 2000);

      sendResponse(res);
    })();
    return true;
  }
  
  sendResponse({ ok: false });
  return false;
});