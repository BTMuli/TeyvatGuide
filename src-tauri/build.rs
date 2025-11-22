fn main() {
  // Compile protobuf files
  prost_build::compile_protos(&["proto/yae.proto"], &["proto/"]).unwrap();
  tauri_build::build()
}
