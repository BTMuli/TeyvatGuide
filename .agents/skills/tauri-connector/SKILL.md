---
name: tauri-connector
description: Use only when the user explicitly requests tauri-connector screenshot recognition of the TeyvatGuide Tauri v2 desktop UI. Otherwise do not proactively start or call the connector bridge.
---

# TeyvatGuide Tauri Connector Preview

Use the repository's debug-only connector plugin with the globally installed `tauri-connector` CLI only when the
user explicitly requests connector screenshot recognition; otherwise do not proactively start or call it.

This replaces the former `tauri-mcp` (`tauri-plugin-mcp-bridge` + `@hypothesi/tauri-mcp-cli`) workflow.

## Usage principles

- Use the bridge only when the user explicitly requests screenshot recognition; do not proactively start or call it.
- Before starting anything, check whether a debug instance is already running and reuse it; start a new dev process
  only when none is running.
- `tauri-connector` resolves the connection as `--host/--port` > `TAURI_CONNECTOR_*` env > nearby `.connector.json`
  > port scan, so a running debug app is usually discovered without extra flags.

## Project constants

- CLI: `tauri-connector` (install once with `cargo install connector-cli --version 0.16.0 --locked`)
- Main window label: `TeyvatGuide` — pass `--window-id TeyvatGuide` globally, because the CLI default `main` does
  not exist in this repository
- Dev URL: `http://localhost:4000`
- Debug command: `pnpm tauri dev --exit-on-panic`
- Ports: WS `9555` (falls back through `9555-9655`), embedded MCP `9556`, in-webview bridge `9300-9400`
- Discovery file: `src-tauri/target/.connector.json` (`pid`, `ws_port`, `mcp_port`, `bridge_port`, `app_name`,
  `app_id`)

The plugin is registered only for debug builds (`src-tauri/src/lib.rs`, `#[cfg(debug_assertions)]`) and requires the
`connector:default` capability plus `app.withGlobalTauri: true`; both are already configured. An installed release
application cannot be driven through this session even when it has the same executable name.

## Screenshot source limits

`tauri-plugin-connector` is used with `default-features = false, features = ["xcap"]`. The upstream
`native-screenshot` feature is **disabled** on purpose: it calls WebView2 `CapturePreview` through
`webview2-com 0.38`/`windows 0.61`, which conflicts with Tauri 2.12's `webview2-com 0.39`/`windows-core 0.62` at the
`ICoreWebView2` call site.

Consequences:

- Window-level capture via `xcap` is the default and supported path (equivalent to the previous viewport capture).
- `--screenshot-source webview_native` and other rich-inspection sources are unavailable; do not pass them.
- The frontend `@zumer/snapdom` fallback remains available for DOM rendering capture.

## Preview workflow

1. Inspect `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, and the target UI before starting.
2. Check for an already-running debug instance:

   ```powershell
   tauri-connector status --json
   Get-Content src-tauri/target/.connector.json -ErrorAction SilentlyContinue
   ```

3. If `status` reports a live candidate, reuse it and skip starting a new process. Only when nothing is running,
   start `pnpm tauri dev --exit-on-panic` as a hidden background process. Redirect stdout and stderr to explicit
   files under `$env:TEMP`, retain the returned process ID, and report build progress when it takes longer than one
   turn.
4. Verify the setup and connection before interacting:

   ```powershell
   tauri-connector doctor --json
   tauri-connector bridge
   ```

5. Address elements through references from a fresh snapshot, scoped to this repository's main window:

   ```powershell
   tauri-connector --window-id TeyvatGuide snapshot -i -c
   tauri-connector --window-id TeyvatGuide click "@e12"
   tauri-connector --window-id TeyvatGuide wait ".uc-box" --state visible --timeout 15000
   ```

6. Validate both appearance and behavior. Check the active state, relevant DOM counts/text, and console errors;
   toggle changed controls at least once and restore the intended default.

   ```powershell
   tauri-connector --window-id TeyvatGuide get text "@e12"
   tauri-connector --window-id TeyvatGuide get count ".list-item"
   tauri-connector --window-id TeyvatGuide logs -n 20 -l error
   tauri-connector --window-id TeyvatGuide runtime -l error
   ```

7. Save screenshots to an explicit temporary path and inspect the image visually. The command prints the resolved
   path and `sha256` as JSON; a requested path is not overwritten unless `--overwrite` is passed:

   ```powershell
   tauri-connector --window-id TeyvatGuide screenshot $shotPath -f png -m 1600 --name-hint preview
   ```

8. Stop only the exact dev process started by the agent unless the user asks to keep it running. Never terminate
   processes by a broad `TeyvatGuide` or command-line wildcard.

## Interaction examples

Navigate through visible UI controls instead of reloading the WebView, because app startup may restore the last
route asynchronously:

```powershell
tauri-connector --window-id TeyvatGuide snapshot -i -c
tauri-connector --window-id TeyvatGuide click "@e7"
tauri-connector --window-id TeyvatGuide wait "a[href='/user/combat']" --state visible --timeout 10000
```

Execute serializable inspection scripts and act-then-verify in one call:

```powershell
tauri-connector --window-id TeyvatGuide eval "JSON.stringify({ href: location.href, title: document.title })"
tauri-connector --window-id TeyvatGuide act click "@e7" --wait-selector ".uc-box" --screenshot --logs
```

Locators are the fallback when refs are stale or unavailable:

```powershell
tauri-connector --window-id TeyvatGuide locator --role button --name "高难挑战" --action click
tauri-connector --window-id TeyvatGuide find "高难挑战" -s text
```

## Recovery

- If `status` reports a stale candidate or the bridge reports no connected webview, restart the debug app and run
  `tauri-connector bridge` again.
- If commands fail with a missing window, add the global `--window-id TeyvatGuide`.
- If the captured screen does not match the inspected DOM, check for another installed TeyvatGuide window and
  confirm the `.connector.json` PID belongs to the debug process; release builds never register the connector.
- If a snapshot is truncated by the token budget, follow the printed subtree paths or use
  `tauri-connector snapshots list` and `tauri-connector snapshots read <uuid> subtree-0.txt`.
- Workflow, picker and IPC-capture commands additionally require `TAURI_CONNECTOR_WORKFLOW_TOKEN` (at least 32
  bytes) shared with the app process; screenshots, snapshots and basic interaction need no token.

## MCP clients (optional)

While the debug app runs, the plugin embeds an MCP server at `http://127.0.0.1:9556/mcp`. An MCP client can either
connect to that URL directly or spawn the stdio proxy, which re-discovers the port on every connect:

```powershell
tauri-connector bridge
```

Keep that wiring in the client's own MCP configuration instead of committing a shared `.mcp.json` to this
repository: the CLI workflow above needs no MCP configuration at all.
