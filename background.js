const overlayState = new Map();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'CAPTURE_TAB') {
    captureTab(message.tabId)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'APPLY_OVERLAY') {
    applyOverlay(message.targetTabId, message.dataUrl, message.opacity)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message?.type === 'CLEAR_OVERLAY') {
    clearOverlay(message.targetTabId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete' || !overlayState.has(tabId)) {
    return;
  }

  const { dataUrl, opacity } = overlayState.get(tabId);
  applyOverlay(tabId, dataUrl, opacity).catch(() => {
    overlayState.delete(tabId);
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  overlayState.delete(tabId);
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

  return chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
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

async function applyOverlay(targetTabId, dataUrl, opacity = 0.5) {
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: injectOverlay,
    args: [dataUrl, opacity]
  });
  overlayState.set(targetTabId, { dataUrl, opacity });
}

async function clearOverlay(targetTabId) {
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: removeOverlay
  });
  overlayState.delete(targetTabId);
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
