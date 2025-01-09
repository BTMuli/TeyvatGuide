/**
 * @file scripts/update-version.ts
 * @description 抬升版本号
 * @since Beta v0.6.8
 */
import fs from "fs-extra";
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

// 获取参数
const args = process.argv;
const version = args[2];
if (!version) {
  console.error("请输入版本号");
  process.exit(1);
}
const __dirname = resolve(fileURLToPath(import.meta.url), "../");
// 更新package.json
const pkgJson = fs.readJsonSync(resolve(__dirname, "../package.json"));
pkgJson.version = version;
fs.writeJsonSync(resolve(__dirname, "../package.json"), pkgJson);
// 更新src-tauri
const tauriDir = resolve(__dirname, "../src-tauri");
const tauriToml = fs.readFileSync(resolve(tauriDir, "Cargo.toml"), "utf-8").split("\n");
tauriToml[2] = `version = "${version}"`;
fs.writeFileSync(resolve(tauriDir, "Cargo.toml"), tauriToml.join("\n"));
const tauriJson = fs.readJsonSync(resolve(tauriDir, "tauri.conf.json"));
tauriJson.version = version;
fs.writeJsonSync(resolve(tauriDir, "tauri.conf.json"), tauriJson);

execSync("pnpm prettier", { cwd: resolve(__dirname, "..") });
