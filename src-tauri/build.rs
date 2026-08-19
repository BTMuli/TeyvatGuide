// 构建文件
// @since Beta v0.9.1

fn main() {
  tauri_build::build();
  if std::env::var("CARGO_CFG_TARGET_OS").ok().as_deref() == Some("windows") {
    compile_hpatch();
  }
}

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
