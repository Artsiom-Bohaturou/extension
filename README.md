# Tab Overlay Composer

A Chrome Manifest V3 extension for comparing two open tabs. Pick a source tab, capture a snapshot of its visible viewport, then place that snapshot at 50% opacity above a target tab.

## Load locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository folder.
4. Open two normal web pages in the same Chrome window.
5. Open the extension popup and choose a source tab and a target tab.
6. Click **Overlay on target**. If the source was not already captured, the extension captures it first and then switches to the target tab with the overlay applied.
7. The popup shows a **Working** badge while an overlay is active. Click **Dismiss overlay** to remove it from the target tab.

## Optional separate capture

You can still click **Capture source** first. If Chrome switches to the source tab and closes the popup, reopen the popup, choose the target tab, and click **Overlay on target**.

## Notes

Chrome extensions cannot render a live browser tab inside another tab. This extension uses `chrome.tabs.captureVisibleTab` to capture a static screenshot of the source tab and injects that image as a pointer-transparent overlay into the target tab.
