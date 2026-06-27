# Tab Overlay Composer

A Chrome Manifest V3 extension for comparing two open tabs. Pick a source tab, capture a snapshot of its visible viewport, then place that snapshot at 50% opacity above a target tab.

## Load locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository folder.
4. Open the extension popup, choose a source tab, click **Capture source**, choose a target tab, then click **Overlay on target**.

## Notes

Chrome extensions cannot render a live browser tab inside another tab. This extension uses `chrome.tabs.captureVisibleTab` to capture a static screenshot of the source tab and injects that image as a pointer-transparent overlay into the target tab.
