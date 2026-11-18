/**
 * 抬升版本号
 * @since Beta v0.13.2
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import fs from "fs-extra";

const __dirname = resolve(fileURLToPath(import.meta.url), "../");
const rootDir = resolve(__dirname, "..");

// ── ANSI 颜色工具 ──────────────────────────────────────────────
const color = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function logStep(index: number, total: number, msg: string): void {
  console.log(
    `  ${color.dim}[${index}/${total}]${color.reset} ${color.cyan}▸${color.reset} ${msg}`,
  );
}

function logOk(msg: string): void {
  console.log(`      ${color.green}✔${color.reset}  ${msg}`);
}

function logDetail(label: string, value: string): void {
  console.log(`        ${color.dim}${label}:${color.reset} ${value}`);
}

function logDivider(): void {
  console.log(`${color.dim}  ────────────────────────────────────────────${color.reset}`);
}

function logError(msg: string): never {
  console.error(`\n  ${color.red}✖${color.reset}  ${color.bold}${msg}${color.reset}\n`);
  process.exit(1);
}

// ── 参数解析 ──────────────────────────────────────────────────
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { since: { type: "string" } },
});
const [version] = positionals;
if (!version || positionals.length > 1) {
  logError("请提供一个发布版本号\n    用法: pnpm upv <version> [--since <since-version>]");
}

const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const versionParts = version.split(".");
if (!versionPattern.test(version) || versionParts.some((part) => Number(part) > 65535)) {
  logError("版本号必须为三段数字，每段不超过 65535，例如 0.12.6");
}

const [major, minor, patch] = versionParts;
const since = values.since ?? `${major}.${minor}.${Number(patch) + 1}`;
if (!versionPattern.test(since)) {
  logError("--since 必须为三段数字，例如 0.13.3");
}

const appxVersion = `${version}.0`;
const appxPath = resolve(rootDir, "src-tauri/msix/AppxManifest.xml");
const appxManifest = fs.readFileSync(appxPath, "utf-8");
const appxIdentityPattern = /(<Identity\b[^>]*\bVersion=")([^"]+)"/;
const appxOldVersion = appxManifest.match(appxIdentityPattern)?.[2];
if (!appxOldVersion) {
  logError("AppxManifest.xml 缺少 Identity.Version");
}

const startTime = performance.now();

console.log();
console.log(`  ${color.magenta}📦 TeyvatGuide 版本号更新工具${color.reset}`);
logDivider();
logDetail("目标版本", `${color.bold}${color.yellow}${version}${color.reset}`);
logDetail("执行时间", new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
logDetail("工作目录", rootDir);
logDivider();

const steps: Array<string> = [];

// ── Step 1: 更新 package.json ─────────────────────────────────
steps.push("package.json");
logStep(1, 5, "更新 package.json");
const pkgPath = resolve(rootDir, "package.json");
const pkgJson = fs.readJsonSync(pkgPath);
const pkgOldVersion = pkgJson.version;
const pkgOldSince = pkgJson.since;
pkgJson.version = version;
pkgJson.since = since;
fs.writeJsonSync(pkgPath, pkgJson);
logOk(
  `package.json  ${color.dim}${pkgOldVersion}${color.reset} → ${color.green}${version}${color.reset}`,
);
logDetail(
  "since",
  `${color.dim}${pkgOldSince}${color.reset} → ${color.green}${since}${color.reset}`,
);

// ── Step 2: 更新 Cargo.toml ───────────────────────────────────
steps.push("Cargo.toml");
logStep(2, 5, "更新 src-tauri/Cargo.toml");
const tauriDir = resolve(rootDir, "src-tauri");
const cargoPath = resolve(tauriDir, "Cargo.toml");
const cargoLines = fs.readFileSync(cargoPath, "utf-8").split("\n");
const cargoOldVersion = cargoLines[2].match(/version = "([^"]+)"/)?.[1] ?? "unknown";
cargoLines[2] = `version = "${version}"`;
fs.writeFileSync(cargoPath, cargoLines.join("\n"));
logOk(
  `Cargo.toml     ${color.dim}${cargoOldVersion}${color.reset} → ${color.green}${version}${color.reset}`,
);

// ── Step 3: 更新 tauri.conf.json ──────────────────────────────
steps.push("tauri.conf.json");
logStep(3, 5, "更新 src-tauri/tauri.conf.json");
const tauriConfPath = resolve(tauriDir, "tauri.conf.json");
const tauriConf = fs.readJsonSync(tauriConfPath);
const tauriOldVersion = tauriConf.version;
tauriConf.version = version;
fs.writeJsonSync(tauriConfPath, tauriConf);
logOk(
  `tauri.conf.json ${color.dim}${tauriOldVersion}${color.reset} → ${color.green}${version}${color.reset}`,
);

// ── Step 4: 更新 AppxManifest.xml ────────────────────────────
steps.push("AppxManifest.xml");
logStep(4, 5, "更新 src-tauri/msix/AppxManifest.xml");
fs.writeFileSync(
  appxPath,
  appxManifest.replace(appxIdentityPattern, (_match: string, prefix: string) => {
    return `${prefix}${appxVersion}"`;
  }),
);
logOk(
  `AppxManifest.xml ${color.dim}${appxOldVersion}${color.reset} → ${color.green}${appxVersion}${color.reset}`,
);

// ── Step 5: 运行 Prettier 格式化 ─────────────────────────────
steps.push("Prettier 格式化");
logStep(5, 5, "运行 Prettier 格式化");
const prettierStart = performance.now();
execSync("pnpm prettier", { cwd: rootDir, stdio: "pipe" });
const prettierCost = ((performance.now() - prettierStart) / 1000).toFixed(2);
logOk(`格式化完成 (${color.dim}${prettierCost}s${color.reset})`);

// ── 汇总 ──────────────────────────────────────────────────────
const totalCost = ((performance.now() - startTime) / 1000).toFixed(2);

logDivider();
console.log(
  `  ${color.green}✨ 版本更新完成${color.reset}  ${color.dim}${pkgOldVersion}${color.reset} → ${color.bold}${color.green}${version}${color.reset}`,
);
logDetail("更新文件", steps.join(", "));
logDetail("总耗时", `${color.cyan}${totalCost}s${color.reset}`);
logDivider();
console.log();
