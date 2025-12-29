/**
 * 本地构建脚本
 * @since Beta v0.9.1
 */
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import pkgJson from "../package.json" with { type: "json" };
import { execSync } from "child_process";
import { parse, stringify } from "envfile";
import { readFileSync, writeFileSync } from "fs";

const __dirname = resolve(fileURLToPath(import.meta.url), "../");

// 判断是否GithubAction
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

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
const release = `TeyvatGuide@${pkgVersion}_${commitHash}_${platform}`;
console.log(`🍄 gen sentry release ${release}`);

// 修改 .env.production
const envPath = resolve(__dirname, "../.env.production");
const envRead = parse(readFileSync(envPath, "utf-8"));
envRead.VITE_SENTRY_RELEASE = release;
writeFileSync(envPath, stringify(envRead), "utf-8");
console.log("✅ .env.production updated!");

// 执行 pnpm build
execSync("pnpm tauri build", { stdio: "inherit" });

// 上传pdb
if (isGitHubActions) {
  if (process.env.GITHUB_ENV) {
    writeFileSync(process.env.GITHUB_ENV, `SENTRY_RELEASE=${release}\n`, { flag: "a" });
    console.log("📦 SENTRY_RELEASE exported to GitHub Actions env.");
  } else {
    console.warn("⚠️ Not running inside GitHub Actions. Skipping env export.");
  }
  process.exit();
}
const pdbGlob = "src-tauri/target/release/TeyvatGuide.pdb";
try {
  console.log(`📦 Uploading PDBs from ${pdbGlob}...`);
  execSync(`sentry-cli releases new "${release}"`, { stdio: "inherit" });
  execSync(`sentry-cli upload-dif ${pdbGlob}`, { stdio: "inherit" });
  execSync(`sentry-cli releases finalize "${release}"`, { stdio: "inherit" });
  console.log("✅ PDB upload complete!");
} catch (err) {
  console.error("❌ Failed to upload PDBs:", err);
  process.exit(1);
}
