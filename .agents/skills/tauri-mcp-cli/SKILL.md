---
name: tauri-mcp-cli
description: Use only when the user explicitly requests tauri-mcp screenshot recognition of the TeyvatGuide Tauri v2 desktop UI. Otherwise do not proactively start or call the tauri-mcp bridge.
---

# TeyvatGuide Tauri MCP Preview

Use the repository's debug-only MCP bridge and the globally installed `tauri-mcp` command only when the user
explicitly requests tauri-mcp screenshot recognition; otherwise do not proactively start or call MCP.

## Usage principles

- Use the bridge only when the user explicitly requests tauri-mcp screenshot recognition; do not proactively start
  or call MCP otherwise.
- Before starting anything, check whether a debug instance is already running and reuse it; start a new dev process
  only when none is running.

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
2. Check for an already-running debug instance, the driver, and the daemon:

   ```powershell
   tauri-mcp daemon status
   tauri-mcp driver-session status --json
   ```

3. If an existing session reports `connected: true` or a `pnpm tauri dev` debug process is still alive, reuse it
   directly and skip starting a new one. Only when no debug app is running, start `pnpm tauri dev --exit-on-panic`
   as a hidden background process. Redirect stdout and stderr to explicit files under `$env:TEMP`, retain the
   returned process ID, and report build progress when it takes longer than one turn.
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
