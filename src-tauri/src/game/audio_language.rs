//! 游戏配音语言清单的读写。
//!
//! 国服客户端把“已安装的配音语言”记录在 `<安装根>/YuanShen_Data/Persistent/audio_lang_14`：
//! 每行一个语言名（`Chinese` / `English(US)` / `Japanese` / `Korean`），以 LF 分隔且没有
//! 结尾换行。清单里列出、但启动器并未安装的语言，客户端会自行下载整份语音资源，因此启动器
//! 替换语音包之后必须同步该清单。
//! @since Beta v0.12.3

use std::{fs, path::Path};

/// 配音语言清单相对安装根的路径。
pub(crate) const AUDIO_LANGUAGE_LIST_PATH: &str = "YuanShen_Data/Persistent/audio_lang_14";

/// 配音语言清单文件名。
pub(crate) const AUDIO_LANGUAGE_LIST_FILE_NAME: &str = "audio_lang_14";

/// 受支持的配音语言：工具标识、游戏设置中的数值 ID、客户端清单中的语言名。
const AUDIO_LANGUAGES: [(&str, u32, &str); 4] = [
  ("zh-cn", 0, "Chinese"),
  ("en-us", 1, "English(US)"),
  ("ja-jp", 2, "Japanese"),
  ("ko-kr", 3, "Korean"),
];

/// 返回配音语言在游戏设置中使用的数值 ID。
///
/// @since Beta v0.12.3
///
/// # 参数
/// - `language`: 工具语音标识（如 `zh-cn`）。
///
/// # 返回
/// 匹配到的数值 ID，未匹配时返回 `None`。
pub(crate) fn registry_id(language: &str) -> Option<u32> {
  AUDIO_LANGUAGES
    .iter()
    .find(|(value, _, _)| value.eq_ignore_ascii_case(language))
    .map(|(_, id, _)| *id)
}

/// 返回配音语言在客户端清单中的语言名。
///
/// @since Beta v0.12.3
///
/// # 参数
/// - `language`: 工具语音标识（如 `zh-cn`）。
///
/// # 返回
/// 匹配到的语言名，未匹配时返回 `None`。
fn language_name(language: &str) -> Option<&'static str> {
  AUDIO_LANGUAGES
    .iter()
    .find(|(value, _, _)| value.eq_ignore_ascii_case(language))
    .map(|(_, _, name)| *name)
}

/// 生成客户端配音语言清单内容。
///
/// 保留传入顺序、忽略无法识别的标识与重复项；没有任何可用语言时返回 `None`，
/// 避免把空清单写入游戏目录。
///
/// @since Beta v0.12.3
///
/// # 参数
/// - `installed_languages`: 已选/已安装的语音标识列表。
///
/// # 返回
/// 清单字节内容；没有可用语言时为 `None`。
pub(crate) fn list_bytes(installed_languages: &[String]) -> Option<Vec<u8>> {
  let mut names: Vec<&'static str> = Vec::new();
  for language in installed_languages {
    let Some(name) = language_name(language) else {
      continue;
    };
    if !names.contains(&name) {
      names.push(name);
    }
  }
  (!names.is_empty()).then(|| names.join("\n").into_bytes())
}

/// 同步客户端配音语言清单；内容一致时不写入。
///
/// @since Beta v0.12.3
///
/// # 参数
/// - `game_root`: 游戏安装根目录。
/// - `installed_languages`: 已选/已安装的语音标识列表。
///
/// # 返回
/// - `Ok(true)`: 已写入新清单。
/// - `Ok(false)`: 无需写入（无可用语言或内容一致）。
/// - `Err(String)`: 目录创建、写入或复核失败的错误描述。
pub(crate) fn sync_list(game_root: &Path, installed_languages: &[String]) -> Result<bool, String> {
  let Some(target) = list_bytes(installed_languages) else {
    return Ok(false);
  };
  let path = game_root.join(AUDIO_LANGUAGE_LIST_PATH);
  if fs::read(&path).is_ok_and(|current| current == target) {
    return Ok(false);
  }
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|error| format!("创建配音语言清单目录失败：{error}"))?;
  }
  fs::write(&path, &target).map_err(|error| format!("写入配音语言清单失败：{error}"))?;
  let written = fs::read(&path).map_err(|error| format!("读取配音语言清单失败：{error}"))?;
  if written != target {
    return Err("配音语言清单写入后校验失败".to_string());
  }
  Ok(true)
}

#[cfg(test)]
mod tests {
  use super::*;

  fn languages<const N: usize>(values: [&str; N]) -> Vec<String> {
    values.iter().map(|value| (*value).to_string()).collect()
  }

  #[test]
  fn registry_id_matches_supported_languages() {
    assert_eq!(registry_id("zh-cn"), Some(0));
    assert_eq!(registry_id("JA-JP"), Some(2));
    assert_eq!(registry_id("unknown"), None);
  }

  #[test]
  fn list_bytes_keeps_order_and_drops_unknown_values() {
    assert_eq!(list_bytes(&languages(["ja-jp"])), Some(b"Japanese".to_vec()));
    assert_eq!(list_bytes(&languages(["ja-jp", "zh-cn"])), Some(b"Japanese\nChinese".to_vec()));
    assert_eq!(list_bytes(&languages(["ja-jp", "ja-jp"])), Some(b"Japanese".to_vec()));
    assert_eq!(list_bytes(&languages(["unknown"])), None);
    assert_eq!(list_bytes(&[]), None);
  }

  #[test]
  fn sync_list_writes_only_when_content_changes() {
    let root = std::env::temp_dir().join(format!("tg-audio-lang-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&root).unwrap();
    assert_eq!(sync_list(&root, &languages(["ja-jp"])), Ok(true));
    assert_eq!(sync_list(&root, &languages(["ja-jp"])), Ok(false));
    assert_eq!(sync_list(&root, &languages(["ja-jp", "zh-cn"])), Ok(true));
    let content = fs::read(root.join(AUDIO_LANGUAGE_LIST_PATH)).unwrap();
    assert_eq!(content, b"Japanese\nChinese".to_vec());
    assert_eq!(sync_list(&root, &languages(["ko-kr"])), Ok(true));
    assert_eq!(fs::read(root.join(AUDIO_LANGUAGE_LIST_PATH)).unwrap(), b"Korean".to_vec());
    fs::remove_dir_all(&root).unwrap();
  }
}
