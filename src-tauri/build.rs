fn main() {
  // Compile protobuf files if protoc is available
  // This is optional - if protoc is not installed, the build will still succeed
  // but protobuf support will not be available
  if let Err(e) = prost_build::compile_protos(&["proto/yae.proto"], &["proto/"]) {
    println!("cargo:warning=Failed to compile protobuf files: {}", e);
    println!("cargo:warning=Protobuf support will be disabled. Install protoc to enable it.");
  }
  tauri_build::build()
}
