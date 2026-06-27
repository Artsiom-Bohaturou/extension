const sourceSelect = document.getElementById('sourceTab');
const targetSelect = document.getElementById('targetTab');
const captureButton = document.getElementById('captureButton');
const overlayButton = document.getElementById('overlayButton');
const dismissButton = document.getElementById('dismissButton');
const statusText = document.getElementById('status');
const workBadge = document.getElementById('workBadge');
const activePanel = document.getElementById('activePanel');
const activeDetails = document.getElementById('activeDetails');

let hasCapture = false;
let activeOverlay = null;

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

  hasCapture = true;
  overlayButton.disabled = false;
  setStatus('Source captured. Reopen the popup if Chrome switched tabs, then choose a target.');
});

overlayButton.addEventListener('click', async () => {
  const targetTabId = Number(targetSelect.value);
  setBusy(true, 'Applying overlay to target tab...');

  const response = await sendMessage({
    type: 'APPLY_OVERLAY',
    targetTabId,
    opacity: 0.5
  });
  setBusy(false);

  if (!response.ok) {
    setStatus(response.error || 'Could not apply overlay.');
    return;
  }

  activeOverlay = response.overlay;
  renderWorkingState();
  setStatus('Overlay is running. Use Dismiss overlay to remove it.');
});

dismissButton.addEventListener('click', async () => {
  const targetTabId = activeOverlay?.targetTabId || Number(targetSelect.value);
  setBusy(true, 'Dismissing overlay...');

  const response = await sendMessage({ type: 'CLEAR_OVERLAY', targetTabId });
  setBusy(false);

  if (!response.ok) {
    setStatus(response.error || 'Could not dismiss overlay.');
    return;
  }

  activeOverlay = null;
  renderWorkingState();
  setStatus('Overlay dismissed.');
});

async function init() {
  const [tabs, statusResponse] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    sendMessage({ type: 'GET_STATUS' })
  ]);
  const options = tabs
    .filter((tab) => tab.id && isInjectableUrl(tab.url))
    .map((tab) => ({ id: tab.id, label: formatTabLabel(tab) }));

  fillSelect(sourceSelect, options);
  fillSelect(targetSelect, options);

  const status = statusResponse.ok ? statusResponse.status : null;
  hasCapture = Boolean(status?.capture);
  activeOverlay = status?.overlays?.[0] || null;
  overlayButton.disabled = !hasCapture;
  renderWorkingState();

  if (!options.length) {
    setStatus('No compatible tabs found. Chrome pages and extension pages cannot be overlaid.');
    captureButton.disabled = true;
    overlayButton.disabled = true;
    dismissButton.disabled = true;
    return;
  }

  if (activeOverlay) {
    setStatus('Overlay is running.');
  } else if (hasCapture) {
    setStatus('Source is captured. Choose a target tab and apply the overlay.');
  } else {
    setStatus('Select a source tab to capture.');
  }
}

function renderWorkingState() {
  const isWorking = Boolean(activeOverlay);
  workBadge.textContent = isWorking ? 'Working' : 'Idle';
  workBadge.classList.toggle('working', isWorking);
  workBadge.classList.toggle('idle', !isWorking);
  activePanel.classList.toggle('hidden', !isWorking);
  dismissButton.disabled = !isWorking;

  if (isWorking) {
    activeDetails.textContent = `${trimTitle(activeOverlay.sourceTitle)} over ${trimTitle(activeOverlay.targetTitle)}`;
  } else {
    activeDetails.textContent = '';
  }
}

function fillSelect(select, options) {
  select.replaceChildren(
    ...options.map((option) => {
      const element = document.createElement('option');
      element.value = String(option.id);
      element.textContent = option.label;
      element.title = option.label;
      return element;
    })
  );
}

function formatTabLabel(tab) {
  const title = trimTitle(tab.title || 'Untitled tab');
  const url = tab.url ? new URL(tab.url).hostname : 'unknown host';
  return `${title} — ${url}`;
}

function trimTitle(title) {
  return title.length > 44 ? `${title.slice(0, 41)}...` : title;
}

function isInjectableUrl(url = '') {
  return /^(https?|file):/.test(url);
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function setBusy(isBusy, message = '') {
  captureButton.disabled = isBusy;
  overlayButton.disabled = isBusy || !hasCapture;
  dismissButton.disabled = isBusy || !activeOverlay;
  if (message) {
    setStatus(message);
  }
}

function setStatus(message) {
  statusText.textContent = message;
}
