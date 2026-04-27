/**
 * 本地构建脚本
 * @since Beta v0.10.1
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

// 获取版本：优先使用环境变量（CI 场景的 git tag），否则使用 package.json
const appVersion = process.env.APP_VERSION?.replace(/^v/, "") || pkgJson.version;
console.log(`📌 Version source: ${process.env.APP_VERSION ? "APP_VERSION env" : "package.json"}`);
console.log(`📌 App version: ${appVersion}`);

// 解析命令行参数
const args = process.argv.slice(2);
const skipUpload = args.includes("su");
const buildArgs = args.filter((arg) => arg !== "su");
console.log(`🍄 SkipUpload:${skipUpload}`);

// 获取提交哈希
const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
// 获取构建平台
const platform = process.platform;
console.log(`🖥️  Build platform: ${platform}`);

// 构建 Release 字符串
const release = `TeyvatGuide@${appVersion}`;
console.log(`🍄 gen sentry release ${release} env`);

// 修改 .env.production
const envPath = resolve(__dirname, "../.env.production");
const envRead = parse(readFileSync(envPath, "utf-8"));
envRead.VITE_SENTRY_RELEASE = release;
envRead.VITE_COMMIT_HASH = commitHash;
envRead.VITE_BUILD_TIME = Math.floor(Date.now() / 1000).toString();
writeFileSync(envPath, stringify(envRead), "utf-8");
console.log("✅ .env.production updated!");

// 执行 pnpm build
execSync(`pnpm tauri build ${buildArgs.join(" ")}`, { stdio: "inherit" });

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
if (skipUpload || platform !== "win32") process.exit();
const pdbGlob = "src-tauri/target/release/TeyvatGuide.pdb";
try {
  console.log(`📦 Uploading PDBs from ${pdbGlob}...`);
  execSync(`sentry-cli releases new "${release}"`, { stdio: "inherit" });
  execSync(`sentry-cli debug-files upload --include-sources src-tauri/src ${pdbGlob}`, {
    stdio: "inherit",
  });
  console.log("✅ PDB upload complete!");
  const distDir = resolve(__dirname, "../dist");
  if (!isGitHubActions) {
    execSync(
      `sentry-cli sourcemaps upload -r "${release}" "${distDir}" --rewrite --url-prefix "~/"`,
      { stdio: "inherit" },
    );
    console.log("✅ Frontend sourcemaps upload complete!");
  }
  execSync(`sentry-cli releases finalize "${release}"`, { stdio: "inherit" });
  console.log("🎉 Sentry release finalized!");
} catch (err) {
  console.error("❌ Failed to upload PDBs:", err);
  process.exit(1);
}
