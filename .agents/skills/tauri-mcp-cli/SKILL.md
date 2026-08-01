---
name: tauri-mcp-cli
description: Preview, inspect, and interact with the TeyvatGuide Tauri v2 desktop UI through the tauri-mcp CLI. Use for UI implementation or review, desktop-only behavior, WebView screenshots, DOM/style inspection, IPC debugging, and interaction checks that a plain Vite browser preview cannot represent.
---

# TeyvatGuide Tauri MCP Preview

Use the repository's debug-only MCP bridge and the globally installed `tauri-mcp` command. Prefer this workflow for
desktop UI validation; do not substitute a browser preview when the running Tauri window is available.

## Project constants

- Driver port: `9223`
- App identifier: `TeyvatGuide`
- Main window label: `TeyvatGuide` (the CLI default `main` does not work for this repository)
- Dev URL: `http://localhost:4000`
- Debug command: `pnpm tauri dev --exit-on-panic`

The bridge plugin is registered only for debug builds. An installed release application cannot be driven through this
session even when it has the same executable name.

## Preview workflow

1. Inspect `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, and the target UI before starting.
2. Check the driver and daemon:

   ```powershell
   tauri-mcp daemon status
   tauri-mcp driver-session status --json
   ```

3. If no debug app is running, start `pnpm tauri dev --exit-on-panic` as a hidden background process. Redirect stdout
   and stderr to explicit files under `$env:TEMP`, retain the returned process ID, and report build progress when it
   takes longer than one turn.
4. Start and verify the session. `driver-session start` alone is insufficient; require `connected: true` and a
   non-null identifier from `status`:

   ```powershell
   tauri-mcp driver-session start --port 9223 --json
   tauri-mcp driver-session status --json
   tauri-mcp manage-window --action list --json
   ```

5. Pass `--window-id TeyvatGuide --app-identifier 9223` to WebView commands. Navigate through visible UI controls
   when possible, then wait for the target selector before inspecting or capturing it.
6. Validate both appearance and behavior. Check the active state, relevant DOM counts/text, and console errors; toggle
   changed controls at least once and restore the intended default.
7. Save screenshots to an explicit temporary path and inspect the image visually:

   ```powershell
   tauri-mcp webview-screenshot --window-id TeyvatGuide --app-identifier 9223 `
     --format png --max-width 1600 --file-path $shotPath --json
   ```

8. Stop the driver session and only the exact dev process started by the agent unless the user asks to keep them
   running. Never terminate processes by a broad `TeyvatGuide` or command-line wildcard.

## Interaction examples

Open the combat page through its sidebar menu rather than reloading the WebView, because app startup may restore the
last route asynchronously:

```powershell
tauri-mcp webview-interact --window-id TeyvatGuide --app-identifier 9223 `
  --action click --selector "[title='高难挑战']" --json
tauri-mcp webview-interact --window-id TeyvatGuide --app-identifier 9223 `
  --action click --selector "a[href='/user/combat']" --json
tauri-mcp webview-wait-for --window-id TeyvatGuide --app-identifier 9223 `
  --type selector --value ".uc-box" --timeout 15000 --json
```

Execute serializable inspection scripts as an IIFE:

```powershell
tauri-mcp webview-execute-js --window-id TeyvatGuide --app-identifier 9223 `
  --script "(() => ({ href: location.href, title: document.title }))()" --json
```

## Recovery

- If status says connected but window listing or JavaScript execution fails, treat the session as stale. Run
  `driver-session stop`, then `daemon restart`, restart the debug app if needed, and reconnect.
- If WebView commands report `Window 'main' not found`, add `--window-id TeyvatGuide`.
- If the captured screen does not match the inspected DOM, check for another installed TeyvatGuide window and target
  the debug session explicitly with `--app-identifier 9223`; do not judge the UI from the mismatched capture.
- If the menu item is rendered in a Vuetify overlay, click its stable `href` selector after opening the activator.
