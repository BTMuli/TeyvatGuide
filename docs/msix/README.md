# MSIX 构建

Windows 发布工作流会在 Tauri 构建完成后调用 `scripts/build-msix.ps1`，并把未签名的 MSIX 上传为 `msix-windows` artifact。CI 只生成构件，不会自动上传微软商店。

## 产物去向

| 平台        | 产物                  | 上传位置                           |
| ----------- | --------------------- | ---------------------------------- |
| Windows x64 | `.msi`                | GitHub Release 草稿                |
| macOS ARM64 | `.dmg`、`.app.tar.gz` | GitHub Release 草稿                |
| Windows x64 | 未签名 `.msix`        | Actions 的 `msix-windows` artifact |

MSIX 步骤在现有 Tauri 发布步骤之后执行，产物不会自动添加到 GitHub Release。现有工作流生成 Release 草稿，仍需人工发布。

## 本地构建

安装 Node.js、pnpm、Rust、PowerShell 7 和 Windows SDK 后，在 Windows 的 PowerShell 7（`pwsh`）中执行：

```powershell
pnpm install --frozen-lockfile
pnpm tauri build
pwsh -File scripts/build-msix.ps1
```

脚本默认读取 `src-tauri/target/release/TeyvatGuide.exe`，并按 `src-tauri/tauri.windows.conf.json` 复制运行时资源。输出文件为：

```text
src-tauri/target/release/bundle/msix/TeyvatGuide_<四段版本号>_x64.msix
```

版本号来自 `src-tauri/tauri.conf.json`，MSIX 的 Store 版本必须是四段数字，最后一段固定为 `0`；例如 `0.12.5` 会生成 `0.12.5.0`。如果旧版本已经发布到商店，提交前需要正常递增版本号。

使用 `pnpm upv 0.12.6` 会同步更新 `package.json`、`Cargo.toml`、`tauri.conf.json` 和 `AppxManifest.xml`；清单中的版本写为 `0.12.6.0`。

## 商店身份、语言和 Assets

清单保留现有商店身份，后续版本不能修改以下值：

| 字段             | 值                                        |
| ---------------- | ----------------------------------------- |
| `Identity Name`  | `27581BTMuli.tauri-genshin`               |
| `Publisher`      | `CN=5FE33156-C3CE-4E71-A036-81BAA99521CB` |
| `Application Id` | `TEYVATGUIDE`                             |
| 资源语言         | `zh-CN`                                   |

脚本从仓库的 `src-tauri/icons/` 生成包内 Assets，并以 `zh-CN` 为默认语言重新生成资源索引，因此不需要再用 MSIX Packaging Tool 手动调整语言或替换图片。清单同时保留现有的 `teyvatguide` 协议、Windows 10.0.17763.0 最低版本和 `Microsoft.WindowsAppRuntime.1.4`（最低版本 `4000.1010.1349.0`）依赖。

图标直接读取 PNG，保留透明通道，清单背景设为 `transparent`。脚本从 `icon.png` 生成多尺寸的普通、`unplated` 和 `lightunplated` 图标，并生成 100%、200%、400% 缩放资源，避免缺少主题变体时 Windows 给图标添加底板。这个过程不从 MSI 或 EXE 提取图标；变体规则参见 [Microsoft 应用图标文档](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction)。

打包成功和 PNG 透明通道检查不能替代安装后的显示检查。发布前仍应在 Windows 浅色、深色主题下检查开始菜单与任务栏图标。

## 签名和 Packaging Tool 文件

CI 产物是未签名 MSIX，手动提交 Partner Center 时不需要在 CI 中配置签名密钥；用于商店外旁加载时，需要另外使用受信任的证书签名。商店提交仍由人工完成。

打包内容来自仓库模板和构建输出，不会带入 Packaging Tool 捕获的机器状态：`Registry.dat`、`User.dat`、`UserClasses.dat`、`ngen.log`、指向打包机路径的 `desktop7` 快捷方式以及 MSI 卸载快捷方式均被有意排除。MSIX 仍保留标准的应用开始菜单入口。
