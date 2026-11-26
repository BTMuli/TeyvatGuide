// 构建文件
// @since Beta v0.14.2

use std::{
  env,
  path::{Path, PathBuf},
  process::Command,
};
use tauri_build::{Attributes, InlinedPlugin};

/// 生成同步权限，按平台构建本地 HDiffPatch 或安全隔区桥接。
///
/// @since Beta v0.14.2
fn main() {
  tauri_build::try_build(Attributes::new().plugin(
    "record-sync",
    InlinedPlugin::new().commands(&[
      "publish",
      "pull",
      "credential_status",
      "save_credential",
      "forget_credential",
    ]),
  ))
  .expect("Tauri 构建配置无效");
  match env::var("CARGO_CFG_TARGET_OS").as_deref() {
    Ok("windows") => {
      println!("cargo:rerun-if-changed=lib");
      let conf_file =
        if Path::new("lib/conf.json").is_file() { "conf.json" } else { "conf_dev.json" };
      println!("cargo:rustc-env=YAE_CONF_FILE={conf_file}");
      compile_hpatch();
    }
    Ok("macos") => compile_secure_enclave(),
    _ => {}
  }
}

/// 用 Apple 工具链定位 macOS SDK 或 Swift 编译器。
/// @since Beta v0.14.2
fn apple_tool_path(args: &[&str]) -> PathBuf {
  let output = Command::new("xcrun")
    .args(["--sdk", "macosx"])
    .args(args)
    .output()
    .expect("无法运行 xcrun；请安装 Xcode 15 或更新版本的命令行工具");
  assert!(output.status.success(), "xcrun 失败：{}", String::from_utf8_lossy(&output.stderr));
  let path = String::from_utf8(output.stdout).expect("xcrun 返回的路径不是 UTF-8");
  PathBuf::from(path.trim())
}

/// 静态链接安全隔区桥接；HPKE 在 Swift 中按 macOS 14 运行时可用性保护。
/// @since Beta v0.14.2
fn compile_secure_enclave() {
  const SOURCE: &str = "native/sync_credentials/macos.swift";
  const LIBRARY: &str = "teyvat_sync_credentials_macos";
  println!("cargo:rerun-if-changed={SOURCE}");
  println!("cargo:rerun-if-env-changed=DEVELOPER_DIR");
  println!("cargo:rerun-if-env-changed=SDKROOT");
  let out = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo 未设置 OUT_DIR"));
  let target = match env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
    Ok("aarch64") => "arm64-apple-macosx11.0",
    // Intel 安装包不再发布；自建 Intel 版使用提供 HPKE 的 SDK 运行时。
    Ok("x86_64") => "x86_64-apple-macosx14.0",
    _ => panic!("不支持的 macOS 目标架构"),
  };
  let sdk = apple_tool_path(&["--show-sdk-path"]);
  let swiftc = apple_tool_path(&["--find", "swiftc"]);
  let toolchain = swiftc.parent().and_then(Path::parent).expect("无法定位 Swift 工具链目录");
  let archive = out.join(format!("lib{LIBRARY}.a"));
  let status = Command::new(&swiftc)
    .arg("-sdk")
    .arg(&sdk)
    .args(["-target", target, "-module-cache-path"])
    .arg(out.join("swift-cache"))
    .arg("-Xcc")
    .arg(format!("-fmodules-cache-path={}", out.join("swift-clang-cache").display()))
    .args([
      "-parse-as-library",
      "-O",
      "-emit-library",
      "-static",
      "-module-name",
      "TeyvatSyncCredentials",
      "-o",
    ])
    .arg(archive)
    .arg(SOURCE)
    .status()
    .expect("无法运行 Swift 编译器");
  assert!(status.success(), "编译本机 Secure Enclave 桥接失败");
  println!("cargo:rustc-link-search=native={}", out.display());
  println!("cargo:rustc-link-search=native={}", sdk.join("usr/lib/swift").display());
  println!("cargo:rustc-link-search=native={}", toolchain.join("lib/swift/macosx").display());
  println!("cargo:rustc-link-lib=static={LIBRARY}");
  for framework in ["CryptoKit", "Foundation", "LocalAuthentication", "Security"] {
    println!("cargo:rustc-link-lib=framework={framework}");
  }
}

/// 使用 cc 编译本地 HDiffPatch C++ 源文件。
///
/// @since Beta v0.9.1
fn compile_hpatch() {
  println!("cargo:rerun-if-changed=native/hpatch/hpatch.cpp");
  println!("cargo:rerun-if-changed=native/hpatch/teyvat_hpatch.cpp");
  println!("cargo:rerun-if-changed=native/hpatch/teyvat_hpatch.h");
  let include = std::env::var("DEP_ZSTD_INCLUDE").expect("zstd-sys 未导出 include 路径");
  let mut build = cc::Build::new();
  build.cpp(true).file("native/hpatch/teyvat_hpatch.cpp").include("native/hpatch").warnings(false);
  for path in include.split(';') {
    if !path.is_empty() {
      build.include(path);
    }
  }
  if std::env::var("CARGO_CFG_TARGET_ENV").ok().as_deref() == Some("msvc") {
    build.flag("/EHsc");
  }
  build.compile("teyvat_hpatch");
}
