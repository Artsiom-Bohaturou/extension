# Tab Overlay Composer

A Chrome Manifest V3 extension for comparing two open tabs. Pick a source tab, capture a snapshot of its visible viewport, then place that snapshot at 50% opacity above a target tab.

## Load locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository folder.
4. Open two normal web pages in the same Chrome window.
5. Open the extension popup, choose a source tab, and click **Capture source**.
6. If Chrome switches to the source tab and closes the popup, reopen the popup.
7. Choose a target tab and click **Overlay on target**.
8. The popup shows a **Working** badge while an overlay is active. Click **Dismiss overlay** to remove it from the target tab.

## Notes

Chrome extensions cannot render a live browser tab inside another tab. This extension uses `chrome.tabs.captureVisibleTab` to capture a static screenshot of the source tab and injects that image as a pointer-transparent overlay into the target tab.
