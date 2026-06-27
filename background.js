const overlayState = new Map();
let lastCapture = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CAPTURE_TAB') {
    captureTab(message.tabId)
      .then((capture) => sendResponse({ ok: true, capture }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'APPLY_OVERLAY') {
    applyOverlay(message.targetTabId, message.opacity, message.sourceTabId)
      .then((overlay) => sendResponse({ ok: true, overlay }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'CLEAR_OVERLAY') {
    clearOverlay(message.targetTabId)
      .then(() => sendResponse({ ok: true, status: getStatus() }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'GET_STATUS') {
    loadLastCapture()
      .then(() => sendResponse({ ok: true, status: getStatus() }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete' || !overlayState.has(tabId)) {
    return;
  }

  const overlay = overlayState.get(tabId);
  injectOverlayIntoTab(tabId, overlay.dataUrl, overlay.opacity).catch(() => {
    overlayState.delete(tabId);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  overlayState.delete(tabId);
  if (lastCapture?.sourceTabId === tabId) {
    lastCapture = null;
    chrome.storage.session.remove('lastCapture');
  }
});

async function captureTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.windowId) {
    throw new Error('Selected tab is no longer available.');
  }

  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  await waitForTabComplete(tabId);
  await delay(250);

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
  lastCapture = {
    dataUrl,
    sourceTabId: tabId,
    sourceTitle: tab.title || 'Untitled tab',
    capturedAt: Date.now()
  };
  await saveLastCapture();

  return captureForPopup(lastCapture);
}

async function waitForTabComplete(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (tab.status === 'complete') {
    return;
  }

  await new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function applyOverlay(targetTabId, opacity = 0.5, sourceTabId = null) {
  await loadLastCapture();
  if (!lastCapture?.dataUrl || (sourceTabId && lastCapture.sourceTabId !== sourceTabId)) {
    if (!sourceTabId) {
      throw new Error('Choose a source tab before applying an overlay.');
    }
    await captureTab(sourceTabId);
  }

  const targetTab = await chrome.tabs.get(targetTabId);
  const overlay = {
    dataUrl: lastCapture.dataUrl,
    opacity,
    sourceTabId: lastCapture.sourceTabId,
    sourceTitle: lastCapture.sourceTitle,
    targetTabId,
    targetTitle: targetTab.title || 'Untitled tab',
    appliedAt: Date.now()
  };

  await chrome.tabs.update(targetTabId, { active: true });
  await injectOverlayIntoTab(targetTabId, overlay.dataUrl, overlay.opacity);
  overlayState.set(targetTabId, overlay);
  return overlayForPopup(overlay);
}

async function injectOverlayIntoTab(targetTabId, dataUrl, opacity) {
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: injectOverlay,
    args: [dataUrl, opacity]
  });
}

async function clearOverlay(targetTabId) {
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: removeOverlay
  });
  overlayState.delete(targetTabId);
}

function getStatus() {
  return {
    capture: lastCapture ? captureForPopup(lastCapture) : null,
    overlays: [...overlayState.values()].map(overlayForPopup)
  };
}

async function loadLastCapture() {
  if (lastCapture?.dataUrl) {
    return;
  }

  const stored = await chrome.storage.session.get('lastCapture');
  lastCapture = stored.lastCapture || null;
}

async function saveLastCapture() {
  await chrome.storage.session.set({ lastCapture });
}

function captureForPopup(capture) {
  return {
    sourceTabId: capture.sourceTabId,
    sourceTitle: capture.sourceTitle,
    capturedAt: capture.capturedAt
  };
}

function overlayForPopup(overlay) {
  return {
    opacity: overlay.opacity,
    sourceTabId: overlay.sourceTabId,
    sourceTitle: overlay.sourceTitle,
    targetTabId: overlay.targetTabId,
    targetTitle: overlay.targetTitle,
    appliedAt: overlay.appliedAt
  };
}

function injectOverlay(dataUrl, opacity) {
  const existingOverlay = document.getElementById('tab-overlay-composer-root');
  existingOverlay?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'tab-overlay-composer-root';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';

  const image = document.createElement('img');
  image.src = dataUrl;
  image.alt = 'Overlay from selected source tab';
  image.style.width = '100vw';
  image.style.height = '100vh';
  image.style.objectFit = 'fill';
  image.style.opacity = String(opacity);
  image.style.display = 'block';

  overlay.append(image);
  document.documentElement.append(overlay);
}

function removeOverlay() {
  document.getElementById('tab-overlay-composer-root')?.remove();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
