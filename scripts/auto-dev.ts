/**
 * 本地调试脚本
 * @since Beta v0.9.1
 */
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import pkgJson from "../package.json" with { type: "json" };
import { execSync } from "child_process";
import { parse, stringify } from "envfile";
import { readFileSync, writeFileSync } from "fs";
import { existsSync } from "node:fs";

const __dirname = resolve(fileURLToPath(import.meta.url), "../");

// 获取版本
const pkgVersion = pkgJson.version;

// 获取提交哈希
const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

// 获取当前平台
let platform = "unknown";
if (process.platform === "win32") {
  platform = "windows";
} else if (process.platform === "darwin") {
  platform = process.arch === "arm64" ? "macos-arm" : "macos-intel";
} else {
  platform = `${process.platform}-${process.arch}`;
}

// 构建 Release 字符串
const release = `TeyvatGuide@${pkgVersion}_dev_${commitHash}_${platform}`;
console.log(`🍄 gen sentry dev release ${release}`);

// 修改 .env.development.local
const envPath = resolve(__dirname, "../.env.development.local");
if (!existsSync(envPath)) {
  writeFileSync(envPath, `VITE_SENTRY_RELEASE=${release}`, "utf-8");
} else {
  const envRead = parse(readFileSync(envPath, "utf-8"));
  envRead.VITE_SENTRY_RELEASE = release;
  writeFileSync(envPath, stringify(envRead), "utf-8");
}
console.log("✅ .env.development.local updated!");

// 执行 tauri dev
execSync("pnpm tauri dev --exit-on-panic", { stdio: "inherit" });
