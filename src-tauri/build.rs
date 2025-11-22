fn main() {
  // Try to compile protobuf files
  let protobuf_available = prost_build::compile_protos(&["proto/yae.proto"], &["proto/"]).is_ok();
  
  if protobuf_available {
    println!("cargo:rustc-cfg=feature=\"protobuf\"");
  } else {
    println!("cargo:warning=Failed to compile protobuf files. Protobuf support will be disabled.");
    println!("cargo:warning=Install protoc to enable protobuf support: https://github.com/protocolbuffers/protobuf/releases");
  }
  
  tauri_build::build()
}
