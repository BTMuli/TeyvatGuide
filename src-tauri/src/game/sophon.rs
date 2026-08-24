//! Sophon build/patch 元数据、Zstandard 清单与 protobuf 解码。
//! @since Beta v0.11.5

use super::{
  hoyoplay::{BranchDescriptor, network_error, read_limited_json},
  path_guard::normalize_manifest_path,
};
use futures_util::{TryStreamExt, future::try_join_all};
use md5::{Digest, Md5};
use prost::Message;
use reqwest::{Client, Response};
use serde::{Deserialize, Deserializer, Serialize};
use std::{collections::HashSet, io::Read};
use url::Url;

const API_ORIGIN: &str = "https://downloader-api.mihoyo.com";
const MAX_JSON_BYTES: usize = 8 * 1024 * 1024;
const MAX_COMPRESSED_MANIFEST_BYTES: usize = 64 * 1024 * 1024;
const MAX_UNCOMPRESSED_MANIFEST_BYTES: usize = 256 * 1024 * 1024;
const MAX_ASSETS: usize = 500_000;
const MAX_CHUNKS: usize = 5_000_000;

#[derive(Clone, PartialEq, Message)]
pub struct ManifestProto {
  #[prost(message, repeated, tag = "1")]
  pub assets: Vec<Asset>,
}

#[derive(Clone, PartialEq, Message)]
pub struct Asset {
  #[prost(string, tag = "1")]
  pub asset_name: String,
  #[prost(message, repeated, tag = "2")]
  pub asset_chunks: Vec<AssetChunk>,
  #[prost(int32, tag = "3")]
  pub asset_type: i32,
  #[prost(int64, tag = "4")]
  pub asset_size: i64,
  #[prost(string, tag = "5")]
  pub asset_hash_md5: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct AssetChunk {
  #[prost(string, tag = "1")]
  pub chunk_name: String,
  #[prost(string, tag = "2")]
  pub chunk_decompressed_hash_md5: String,
  #[prost(int64, tag = "3")]
  pub chunk_on_file_offset: i64,
  #[prost(int64, tag = "4")]
  pub chunk_size: i64,
  #[prost(int64, tag = "5")]
  pub chunk_size_decompressed: i64,
}

#[derive(Clone, PartialEq, Message)]
pub struct PatchManifestProto {
  #[prost(message, repeated, tag = "1")]
  pub file_datas: Vec<PatchFile>,
  #[prost(message, repeated, tag = "2")]
  pub delete_files_entries: Vec<DeleteFilesEntry>,
}

#[derive(Clone, PartialEq, Message)]
pub struct PatchFile {
  #[prost(string, tag = "1")]
  pub file_name: String,
  #[prost(int64, tag = "2")]
  pub file_size: i64,
  #[prost(string, tag = "3")]
  pub file_hash: String,
  #[prost(message, repeated, tag = "4")]
  pub patches_entries: Vec<PatchesEntry>,
}

#[derive(Clone, PartialEq, Message)]
pub struct PatchesEntry {
  #[prost(string, tag = "1")]
  pub key: String,
  #[prost(message, optional, tag = "2")]
  pub patch_info: Option<PatchInfo>,
}

#[derive(Clone, PartialEq, Message)]
pub struct PatchInfo {
  #[prost(string, tag = "1")]
  pub id: String,
  #[prost(string, tag = "2")]
  pub tag: String,
  #[prost(string, tag = "3")]
  pub build_id: String,
  #[prost(int64, tag = "4")]
  pub patch_file_size: i64,
  #[prost(string, tag = "5")]
  pub patches_file_hash: String,
  #[prost(int64, tag = "6")]
  pub patch_start_offset: i64,
  #[prost(int64, tag = "7")]
  pub patch_length: i64,
  #[prost(string, tag = "8")]
  pub original_file_name: String,
  #[prost(int64, tag = "9")]
  pub original_file_size: i64,
  #[prost(string, tag = "10")]
  pub original_file_hash: String,
}

#[derive(Clone, PartialEq, Message)]
pub struct DeleteFilesEntry {
  #[prost(string, tag = "1")]
  pub key: String,
  #[prost(message, optional, tag = "2")]
  pub delete_files: Option<DeleteFiles>,
}

#[derive(Clone, PartialEq, Message)]
pub struct DeleteFiles {
  #[prost(message, repeated, tag = "1")]
  pub infos: Vec<FileInfo>,
}

#[derive(Clone, PartialEq, Message)]
pub struct FileInfo {
  #[prost(string, tag = "1")]
  pub name: String,
  #[prost(int64, tag = "2")]
  pub size: i64,
  #[prost(string, tag = "3")]
  pub hash: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct DownloadInfo {
  encryption: u32,
  pub(crate) compression: u32,
  password: String,
  pub url_prefix: String,
  pub url_suffix: String,
}

#[derive(Clone, Debug, Deserialize)]
struct ManifestIdentity {
  id: String,
  checksum: String,
  #[serde(deserialize_with = "deserialize_u64")]
  compressed_size: u64,
  #[serde(deserialize_with = "deserialize_u64")]
  uncompressed_size: u64,
}

#[derive(Clone, Debug, Deserialize)]
struct BuildManifest {
  matching_field: String,
  manifest: ManifestIdentity,
  chunk_download: DownloadInfo,
  manifest_download: DownloadInfo,
}

#[derive(Clone, Debug, Deserialize)]
struct PatchBuildManifest {
  matching_field: String,
  manifest: ManifestIdentity,
  diff_download: DownloadInfo,
  manifest_download: DownloadInfo,
}

#[derive(Clone, Debug, Deserialize)]
struct BuildResponse {
  tag: String,
  manifests: Vec<BuildManifest>,
}

#[derive(Clone, Debug, Deserialize)]
struct PatchBuildResponse {
  tag: String,
  manifests: Vec<PatchBuildManifest>,
}

#[derive(Deserialize)]
struct ApiResponse<T> {
  retcode: i32,
  message: String,
  data: Option<T>,
}

/// 已完成完整性校验的一个资源分类 manifest。
pub struct DecodedManifest {
  pub matching_field: String,
  pub manifest_id: String,
  pub manifest_checksum: String,
  pub chunk_download: DownloadInfo,
  pub data: ManifestProto,
}

/// 已完成完整性校验的完整 build。
pub struct DecodedBuild {
  pub tag: String,
  pub manifests: Vec<DecodedManifest>,
}

/// 已完成完整性校验的一个 patch 分类 manifest。
pub struct DecodedPatchManifest {
  pub matching_field: String,
  pub manifest_id: String,
  pub manifest_checksum: String,
  pub diff_download: DownloadInfo,
  pub data: PatchManifestProto,
}

/// 已完成完整性校验的 patch build。
pub struct DecodedPatchBuild {
  pub tag: String,
  pub manifests: Vec<DecodedPatchManifest>,
}

/// 请求并解码指定分支的完整 Sophon manifest。
pub async fn get_decoded_build(
  client: &Client,
  branch: &BranchDescriptor,
  audio_languages: &[String],
) -> Result<DecodedBuild, String> {
  let build = get_build(client, branch).await?;
  if build.tag != branch.tag || build.manifests.len() > 16 {
    return Err("Sophon build tag 不匹配或分类数量超过上限".to_string());
  }
  let manifests = try_join_all(
    build
      .manifests
      .into_iter()
      .filter(|manifest| category_selected(&manifest.matching_field, audio_languages))
      .map(|manifest| decode_build_manifest(client, manifest)),
  )
  .await?;
  ensure_selected_categories(
    &manifests.iter().map(|item| item.matching_field.as_str()).collect::<Vec<_>>(),
    audio_languages,
  )?;
  Ok(DecodedBuild { tag: build.tag, manifests })
}

/// 请求并解码从 source_tag 到目标分支的 Sophon patch manifest。
pub async fn get_decoded_patch_build(
  client: &Client,
  branch: &BranchDescriptor,
  source_tag: &str,
  audio_languages: &[String],
) -> Result<DecodedPatchBuild, String> {
  let build = get_patch_build(client, branch).await?;
  if build.tag != branch.tag || build.manifests.len() > 16 {
    return Err("Sophon patch build tag 不匹配或分类数量超过上限".to_string());
  }
  let manifests = try_join_all(
    build
      .manifests
      .into_iter()
      .filter(|manifest| category_selected(&manifest.matching_field, audio_languages))
      .map(|manifest| decode_patch_manifest(client, manifest, source_tag)),
  )
  .await?;
  ensure_selected_categories(
    &manifests.iter().map(|item| item.matching_field.as_str()).collect::<Vec<_>>(),
    audio_languages,
  )?;
  Ok(DecodedPatchBuild { tag: build.tag, manifests })
}

async fn decode_build_manifest(
  client: &Client,
  manifest: BuildManifest,
) -> Result<DecodedManifest, String> {
  validate_manifest_download(&manifest.manifest_download)?;
  validate_payload_download(&manifest.chunk_download)?;
  let bytes =
    download_and_decode_manifest(client, &manifest.manifest, &manifest.manifest_download).await?;
  let data = tauri::async_runtime::spawn_blocking(move || {
    let data = ManifestProto::decode(bytes.as_slice())
      .map_err(|error| format!("解析 Sophon manifest protobuf 失败：{error}"))?;
    validate_manifest(&data)?;
    Ok::<ManifestProto, String>(data)
  })
  .await
  .map_err(|error| format!("等待 Sophon manifest 解析失败：{error}"))??;
  Ok(DecodedManifest {
    matching_field: manifest.matching_field,
    manifest_id: manifest.manifest.id,
    manifest_checksum: manifest.manifest.checksum,
    chunk_download: manifest.chunk_download,
    data,
  })
}

async fn decode_patch_manifest(
  client: &Client,
  manifest: PatchBuildManifest,
  source_tag: &str,
) -> Result<DecodedPatchManifest, String> {
  validate_manifest_download(&manifest.manifest_download)?;
  validate_payload_download(&manifest.diff_download)?;
  let bytes =
    download_and_decode_manifest(client, &manifest.manifest, &manifest.manifest_download).await?;
  let source_tag = source_tag.to_string();
  let diff_download = manifest.diff_download.clone();
  let data = tauri::async_runtime::spawn_blocking(move || {
    let data = PatchManifestProto::decode(bytes.as_slice())
      .map_err(|error| format!("解析 Sophon patch protobuf 失败：{error}"))?;
    validate_patch_manifest(&data, &source_tag, &diff_download)?;
    Ok::<PatchManifestProto, String>(data)
  })
  .await
  .map_err(|error| format!("等待 Sophon patch 解析失败：{error}"))??;
  Ok(DecodedPatchManifest {
    matching_field: manifest.matching_field,
    manifest_id: manifest.manifest.id,
    manifest_checksum: manifest.manifest.checksum,
    diff_download: manifest.diff_download,
    data,
  })
}

async fn get_build(client: &Client, branch: &BranchDescriptor) -> Result<BuildResponse, String> {
  let mut url = Url::parse(&format!("{API_ORIGIN}/downloader/sophon_chunk/api/getBuild"))
    .map_err(|error| format!("Sophon API 地址无效：{error}"))?;
  {
    let mut query = url.query_pairs_mut();
    query
      .append_pair("branch", &branch.branch)
      .append_pair("package_id", &branch.package_id)
      .append_pair("password", &branch.password);
    if !branch.branch.eq_ignore_ascii_case("PREDOWNLOAD") {
      query.append_pair("tag", &branch.tag);
    }
  }
  let response =
    client.get(url).send().await.map_err(|error| network_error("请求 Sophon build", &error))?;
  let response: ApiResponse<BuildResponse> =
    read_limited_json(response, MAX_JSON_BYTES, "Sophon build").await?;
  validate_api_response(response, "Sophon build")
}

async fn get_patch_build(
  client: &Client,
  branch: &BranchDescriptor,
) -> Result<PatchBuildResponse, String> {
  let url = format!("{API_ORIGIN}/downloader/sophon_chunk/api/getPatchBuild");
  let response = client
    .post(url)
    .json(branch)
    .send()
    .await
    .map_err(|error| network_error("请求 Sophon patch build", &error))?;
  let response: ApiResponse<PatchBuildResponse> =
    read_limited_json(response, MAX_JSON_BYTES, "Sophon patch build").await?;
  validate_api_response(response, "Sophon patch build")
}

fn validate_api_response<T>(response: ApiResponse<T>, context: &str) -> Result<T, String> {
  if response.retcode != 0 {
    return Err(format!("{context}返回错误 {}：{}", response.retcode, response.message));
  }
  response.data.ok_or_else(|| format!("{context}响应缺少 data"))
}

async fn download_and_decode_manifest(
  client: &Client,
  identity: &ManifestIdentity,
  download: &DownloadInfo,
) -> Result<Vec<u8>, String> {
  if identity.compressed_size == 0
    || identity.compressed_size > MAX_COMPRESSED_MANIFEST_BYTES as u64
    || identity.uncompressed_size == 0
    || identity.uncompressed_size > MAX_UNCOMPRESSED_MANIFEST_BYTES as u64
    || !is_hex(&identity.checksum, 32)
  {
    return Err("Sophon manifest 元数据超过安全上限或校验值无效".to_string());
  }
  let url = download_url(download, &identity.id)?;
  let response =
    client.get(url).send().await.map_err(|error| network_error("下载 Sophon manifest", &error))?;
  let compressed =
    read_limited_bytes(response, identity.compressed_size as usize, "Sophon manifest").await?;
  if compressed.len() as u64 != identity.compressed_size {
    return Err("Sophon manifest 压缩大小与元数据不一致".to_string());
  }
  let uncompressed_size = identity.uncompressed_size;
  let checksum = identity.checksum.clone();
  tauri::async_runtime::spawn_blocking(move || {
    decode_manifest_payload(compressed, uncompressed_size, &checksum)
  })
  .await
  .map_err(|error| format!("等待 Sophon manifest 解压失败：{error}"))?
}

fn decode_manifest_payload(
  compressed: Vec<u8>,
  uncompressed_size: u64,
  expected_checksum: &str,
) -> Result<Vec<u8>, String> {
  let mut decoder = zstd::stream::read::Decoder::new(compressed.as_slice())
    .map_err(|error| format!("创建 Zstandard 解码器失败：{error}"))?;
  let mut decoded = Vec::with_capacity(uncompressed_size as usize);
  decoder
    .by_ref()
    .take(MAX_UNCOMPRESSED_MANIFEST_BYTES as u64 + 1)
    .read_to_end(&mut decoded)
    .map_err(|error| format!("解压 Sophon manifest 失败：{error}"))?;
  if decoded.len() as u64 != uncompressed_size || decoded.len() > MAX_UNCOMPRESSED_MANIFEST_BYTES {
    return Err("Sophon manifest 解压大小与元数据不一致或超过上限".to_string());
  }
  let checksum = format!("{:x}", Md5::digest(&decoded));
  if !checksum.eq_ignore_ascii_case(expected_checksum) {
    return Err("Sophon manifest MD5 校验失败".to_string());
  }
  Ok(decoded)
}

async fn read_limited_bytes(
  response: Response,
  expected_size: usize,
  context: &str,
) -> Result<Vec<u8>, String> {
  if !response.status().is_success() {
    return Err(format!("{context}请求失败：HTTP {}", response.status().as_u16()));
  }
  if response.content_length().is_some_and(|length| length > expected_size as u64) {
    return Err(format!("{context}响应超过声明大小"));
  }
  let mut stream = response.bytes_stream();
  let mut bytes = Vec::with_capacity(expected_size);
  while let Some(chunk) =
    stream.try_next().await.map_err(|error| network_error(&format!("读取{context}"), &error))?
  {
    if bytes.len().saturating_add(chunk.len()) > expected_size {
      return Err(format!("{context}响应超过声明大小"));
    }
    bytes.extend_from_slice(&chunk);
  }
  Ok(bytes)
}

fn download_url(download: &DownloadInfo, id: &str) -> Result<Url, String> {
  payload_url(&download.url_prefix, &download.url_suffix, id)
}

/// 从已验证 manifest 的下载字段重建当前资源 URL，不向前端或日志暴露结果。
pub(crate) fn payload_url(url_prefix: &str, url_suffix: &str, id: &str) -> Result<Url, String> {
  if id.is_empty()
    || id.len() > 256
    || !id.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    || url_suffix.len() > 16 * 1024
    || url_suffix.contains('#')
  {
    return Err("Sophon 下载地址字段无效".to_string());
  }
  let mut base = Url::parse(url_prefix).map_err(|error| format!("Sophon 下载地址无效：{error}"))?;
  if base.scheme() != "https"
    || base.host_str().is_none()
    || !base.username().is_empty()
    || base.password().is_some()
    || !base.host_str().is_some_and(is_official_download_host)
  {
    return Err("Sophon 下载地址必须是受信任官方域名上的无凭据 HTTPS URL".to_string());
  }
  {
    let mut segments =
      base.path_segments_mut().map_err(|_| "Sophon 下载地址不能作为基础路径".to_string())?;
    segments.pop_if_empty().push(id);
  }
  base.set_query((!url_suffix.is_empty()).then_some(url_suffix));
  Ok(base)
}

pub(crate) fn is_official_download_host(host: &str) -> bool {
  let host = host.to_ascii_lowercase();
  ["mihoyo.com", "hoyoverse.com", "hyoverse.com", "yuanshen.com"]
    .iter()
    .any(|suffix| host == *suffix || host.ends_with(&format!(".{suffix}")))
}

fn validate_manifest_download(download: &DownloadInfo) -> Result<(), String> {
  if download.encryption != 0 || download.compression != 1 || !download.password.is_empty() {
    return Err(format!(
      "Sophon manifest 使用了不支持的传输方式：encryption={}, compression={}, has_password={}",
      download.encryption,
      download.compression,
      !download.password.is_empty()
    ));
  }
  download_url(download, "manifest")?;
  Ok(())
}

fn validate_payload_download(download: &DownloadInfo) -> Result<(), String> {
  if download.encryption != 0
    || !matches!(download.compression, 0 | 1)
    || !download.password.is_empty()
  {
    return Err("Sophon 资源载荷使用了不支持的加密或压缩方式".to_string());
  }
  download_url(download, "payload")?;
  Ok(())
}

fn validate_manifest(manifest: &ManifestProto) -> Result<(), String> {
  if manifest.assets.is_empty() || manifest.assets.len() > MAX_ASSETS {
    return Err("Sophon manifest 资源条目数无效".to_string());
  }
  let mut asset_names = HashSet::with_capacity(manifest.assets.len());
  let mut chunk_count = 0_usize;
  for asset in &manifest.assets {
    let name = normalize_manifest_path(&asset.asset_name)?;
    if !asset_names.insert(name) || asset.asset_size < 0 || !is_hex(&asset.asset_hash_md5, 32) {
      return Err("Sophon manifest 包含重复资源或无效资源元数据".to_string());
    }
    chunk_count = chunk_count.saturating_add(asset.asset_chunks.len());
    if chunk_count > MAX_CHUNKS {
      return Err("Sophon manifest chunk 数量超过安全上限".to_string());
    }
    let mut ranges = Vec::with_capacity(asset.asset_chunks.len());
    for chunk in &asset.asset_chunks {
      if chunk_xxhash64(&chunk.chunk_name).is_none() {
        return Err(format!("Sophon chunk 名称格式无效：长度 {}", chunk.chunk_name.len()));
      }
      if !is_hex(&chunk.chunk_decompressed_hash_md5, 32) {
        return Err(format!(
          "Sophon chunk 解压 hash 不是 32 位十六进制：长度 {}",
          chunk.chunk_decompressed_hash_md5.len()
        ));
      }
      if let Some((_, suffix)) = chunk.chunk_name.split_once('_')
        && !suffix.eq_ignore_ascii_case(&chunk.chunk_decompressed_hash_md5)
      {
        return Err("Sophon chunk 名称中的解压 MD5 与字段值不一致".to_string());
      }
      if chunk.chunk_on_file_offset < 0 {
        return Err("Sophon chunk 文件偏移为负数".to_string());
      }
      if chunk.chunk_size <= 0 || chunk.chunk_size_decompressed <= 0 {
        return Err(format!(
          "Sophon chunk 大小不是正整数：compressed={}, decompressed={}",
          chunk.chunk_size, chunk.chunk_size_decompressed
        ));
      }
      let end = chunk
        .chunk_on_file_offset
        .checked_add(chunk.chunk_size_decompressed)
        .ok_or_else(|| "Sophon chunk 范围溢出".to_string())?;
      if end > asset.asset_size {
        return Err("Sophon chunk 超出所属资源范围".to_string());
      }
      ranges.push((chunk.chunk_on_file_offset, end));
    }
    ranges.sort_unstable();
    if ranges.windows(2).any(|pair| pair[0].1 > pair[1].0) {
      return Err("Sophon manifest 包含重叠 chunk".to_string());
    }
  }
  Ok(())
}

fn validate_patch_manifest(
  manifest: &PatchManifestProto,
  source_tag: &str,
  diff_download: &DownloadInfo,
) -> Result<(), String> {
  if manifest.file_datas.len() > MAX_ASSETS || manifest.delete_files_entries.len() > 128 {
    return Err("Sophon patch 条目数超过安全上限".to_string());
  }
  for file in &manifest.file_datas {
    normalize_manifest_path(&file.file_name)?;
    if file.file_size < 0 || !is_hex(&file.file_hash, 32) {
      return Err("Sophon patch 包含无效目标文件元数据".to_string());
    }
    let Some(entry) = file.patches_entries.iter().find(|entry| entry.key == source_tag) else {
      continue;
    };
    let info =
      entry.patch_info.as_ref().ok_or_else(|| "Sophon patch 缺少 patch_info".to_string())?;
    download_url(diff_download, &info.id)?;
    if info.id.is_empty()
      || info.patch_file_size <= 0
      || info.patch_start_offset < 0
      || info.patch_length <= 0
      || info.original_file_size < 0
      || !is_hex(&info.patches_file_hash, 32)
    {
      return Err("Sophon patch 包含无效差分范围或 hash".to_string());
    }
    if info.original_file_size == 0 {
      if !info.original_file_name.is_empty() {
        normalize_manifest_path(&info.original_file_name)?;
      }
      if !info.original_file_hash.is_empty() && !is_hex(&info.original_file_hash, 32) {
        return Err("Sophon patch 新增文件包含无效原始 hash".to_string());
      }
    } else {
      normalize_manifest_path(&info.original_file_name)?;
      if !is_hex(&info.original_file_hash, 32) {
        return Err("Sophon patch 原始文件 hash 无效".to_string());
      }
    }
    let end = info
      .patch_start_offset
      .checked_add(info.patch_length)
      .ok_or_else(|| "Sophon patch 范围溢出".to_string())?;
    if end > info.patch_file_size {
      return Err("Sophon patch 范围超出差分文件".to_string());
    }
  }
  for entry in &manifest.delete_files_entries {
    if entry.key != source_tag {
      continue;
    }
    if let Some(files) = &entry.delete_files {
      for file in &files.infos {
        normalize_manifest_path(&file.name)?;
        if file.size < 0 || !is_hex(&file.hash, 32) {
          return Err("Sophon patch 包含无效删除文件元数据".to_string());
        }
      }
    }
  }
  Ok(())
}

fn category_selected(matching_field: &str, audio_languages: &[String]) -> bool {
  matching_field == "game" || audio_languages.iter().any(|language| language == matching_field)
}

fn ensure_selected_categories(
  matching_fields: &[&str],
  audio_languages: &[String],
) -> Result<(), String> {
  let required = std::iter::once("game").chain(audio_languages.iter().map(String::as_str));
  for field in required {
    if !matching_fields.contains(&field) {
      return Err(format!("Sophon build 缺少已安装资源分类：{field}"));
    }
  }
  Ok(())
}

fn is_hex(value: &str, length: usize) -> bool {
  value.len() == length && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

/// 从旧式 `xxHash64` 或新版 `xxHash64_MD5` chunk 名称中提取压缩内容 hash。
pub fn chunk_xxhash64(value: &str) -> Option<u64> {
  let (hash, suffix) =
    value.split_once('_').map_or((value, None), |(hash, suffix)| (hash, Some(suffix)));
  if !is_hex(hash, 16) || suffix.is_some_and(|suffix| !is_hex(suffix, 32)) {
    return None;
  }
  u64::from_str_radix(hash, 16).ok()
}

fn deserialize_u64<'de, D>(deserializer: D) -> Result<u64, D::Error>
where
  D: Deserializer<'de>,
{
  #[derive(Deserialize)]
  #[serde(untagged)]
  enum Number {
    Integer(u64),
    String(String),
  }

  match Number::deserialize(deserializer)? {
    Number::Integer(value) => Ok(value),
    Number::String(value) => value.parse().map_err(serde::de::Error::custom),
  }
}
