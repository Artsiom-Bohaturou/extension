const sourceSelect = document.getElementById('sourceTab');
const targetSelect = document.getElementById('targetTab');
const captureButton = document.getElementById('captureButton');
const overlayButton = document.getElementById('overlayButton');
const clearButton = document.getElementById('clearButton');
const statusText = document.getElementById('status');

let capturedDataUrl = null;

init();

captureButton.addEventListener('click', async () => {
  const tabId = Number(sourceSelect.value);
  setBusy(true, 'Capturing source tab...');

  const response = await sendMessage({ type: 'CAPTURE_TAB', tabId });
  setBusy(false);

  if (!response.ok) {
    setStatus(response.error || 'Could not capture the source tab.');
    return;
  }

  capturedDataUrl = response.dataUrl;
  overlayButton.disabled = false;
  setStatus('Source captured. Choose a target tab and apply the overlay.');
});

overlayButton.addEventListener('click', async () => {
  const targetTabId = Number(targetSelect.value);
  setBusy(true, 'Applying overlay to target tab...');

  const response = await sendMessage({
    type: 'APPLY_OVERLAY',
    targetTabId,
    dataUrl: capturedDataUrl,
    opacity: 0.5
  });
  setBusy(false);

  setStatus(response.ok ? 'Overlay applied to the target tab.' : response.error || 'Could not apply overlay.');
});

clearButton.addEventListener('click', async () => {
  const targetTabId = Number(targetSelect.value);
  setBusy(true, 'Clearing overlay...');

  const response = await sendMessage({ type: 'CLEAR_OVERLAY', targetTabId });
  setBusy(false);

  setStatus(response.ok ? 'Overlay cleared from the target tab.' : response.error || 'Could not clear overlay.');
});

async function init() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const options = tabs
    .filter((tab) => tab.id && isInjectableUrl(tab.url))
    .map((tab) => ({ id: tab.id, label: formatTabLabel(tab) }));

  fillSelect(sourceSelect, options);
  fillSelect(targetSelect, options);

  if (!options.length) {
    setStatus('No compatible tabs found. Chrome pages and extension pages cannot be overlaid.');
    captureButton.disabled = true;
    clearButton.disabled = true;
    return;
  }

  setStatus('Select a source tab to capture.');
}

function fillSelect(select, options) {
  select.replaceChildren(
    ...options.map((option) => {
      const element = document.createElement('option');
      element.value = String(option.id);
      element.textContent = option.label;
      return element;
    })
  );
}

function formatTabLabel(tab) {
  const title = tab.title || 'Untitled tab';
  const url = tab.url ? new URL(tab.url).hostname : 'unknown host';
  return `${title} — ${url}`;
}

function isInjectableUrl(url = '') {
  return /^(https?|file):/.test(url);
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function setBusy(isBusy, message = '') {
  captureButton.disabled = isBusy;
  overlayButton.disabled = isBusy || !capturedDataUrl;
  clearButton.disabled = isBusy;
  if (message) {
    setStatus(message);
  }
}

function setStatus(message) {
  statusText.textContent = message;
}
