//! @file src/client/menu.rs
//! @desc 客户端菜单模块，负责操作米游社客户端菜单
//! @since Beta v0.11.3

use crate::client::utils;
use tauri::menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder, Submenu, SubmenuBuilder};
use tauri::{AppHandle, LogicalSize, Manager, Size, Window, Wry};
use url::Url;

/// 根据功能名返回米游社客户端对应的 URL。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `func`: 功能名（如 `sign_in`）。
///
/// # 返回
/// - `Ok(Url)`: 解析后的米游社 URL。
/// - `Err(String)`: URL 无效的错误描述。
pub fn get_mhy_client_url(func: &str) -> Result<Url, String> {
  let url = match func {
    "sign_in" => {
      "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501"
    }
    "game_record" => {
      "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen"
    }
    "birthday" => {
      "https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html?activity_id=20220301153521"
    }
    _ => "https://bbs.mihoyo.com/ys/",
  };

  url.parse().map_err(|error| format!("米游社链接无效：{error}"))
}

/// 创建米游社客户端的“工具”子菜单。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app`: Tauri 应用句柄。
///
/// # 返回
/// - `Ok(Submenu<Wry>)`: 创建的子菜单。
/// - `Err(String)`: 菜单项创建失败的错误描述。
fn create_utils_menu(app: AppHandle) -> Result<Submenu<Wry>, String> {
  let retry_bridge_submenu =
    MenuItemBuilder::with_id("retry", "重试桥接").build(&app).map_err(|error| error.to_string())?;
  let mock_touch_submenu = MenuItemBuilder::with_id("mock_touch", "模拟触摸")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let remove_overlay_submenu = MenuItemBuilder::with_id("remove_overlay", "移除遮罩")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let rotate_window_submenu = MenuItemBuilder::with_id("rotate_window", "旋转窗口")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let open_with_webview_submenu = MenuItemBuilder::with_id("open_with_webview", "外部打开")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let utils_menu = SubmenuBuilder::new(&app, "工具")
    .item(&retry_bridge_submenu)
    .item(&mock_touch_submenu)
    .item(&remove_overlay_submenu)
    .item(&rotate_window_submenu)
    .item(&open_with_webview_submenu)
    .build()
    .map_err(|error| error.to_string())?;
  Ok(utils_menu)
}

/// 创建米游社客户端菜单。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app`: Tauri 应用句柄。
///
/// # 返回
/// - `Ok(Menu<Wry>)`: 创建完成的菜单。
/// - `Err(String)`: 菜单创建失败的错误描述。
pub fn create_mhy_menu(app: AppHandle) -> Result<Menu<Wry>, String> {
  let top_menu =
    MenuItemBuilder::with_id("top", "置顶").build(&app).map_err(|error| error.to_string())?;
  let cancel_top_menu = MenuItemBuilder::with_id("cancel_top", "取消置顶")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let open_post_menu = MenuItemBuilder::with_id("open_post", "打开帖子")
    .build(&app)
    .map_err(|error| error.to_string())?;
  let utils_menu = create_utils_menu(app.clone())?;
  MenuBuilder::new(&app)
    .item(&top_menu)
    .item(&cancel_top_menu)
    .item(&open_post_menu)
    .item(&utils_menu)
    .build()
    .map_err(|error| error.to_string())
}

/// 按菜单事件 ID 分发到对应的处理函数。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `window`: 触发事件的窗口。
/// - `event`: 菜单事件。
pub fn handle_menu_event(window: &Window, event: MenuEvent) {
  match event.id.as_ref() {
    "top" => handle_menu_top(window),
    "cancel_top" => handle_menu_cancel_top(window),
    "open_post" => handle_menu_open_post(window),
    "retry" => handle_menu_retry(window),
    "mock_touch" => handle_menu_mock_touch(window),
    "remove_overlay" => handle_menu_remove_overlay(window),
    "rotate_window" => handle_menu_rotate_window(window),
    "open_with_webview" => handle_menu_open_with_webview(window),
    _ => {}
  }
}

/// 将米游社客户端窗口置顶。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_top(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(true).unwrap();
  }
}

/// 取消米游社客户端窗口置顶。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_cancel_top(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(false).unwrap();
  }
}

/// 在米游社客户端中打开当前帖子。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_open_post(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
  javascript:(async function(){
    let url = new URL(window.location.href);
    const whiteList = [
      "bbs.mihoyo.com",
      "www.miyoushe.com",
      "m.miyoushe.com",
    ];
    if(!whiteList.includes(url.hostname)){
      alert(`当前页面不是米游社帖子页面\n${window.location.href}`);
      return;
    }
    if(!url.pathname.includes("/article/") && !url.hash.includes("/article/")){
      alert(`当前页面不是米游社帖子页面\n${window.location.href}`);
      return;
    }
    let postId;
    if(url.pathname.includes("/article/")){
      postId = url.pathname.split("/").pop();
    }else{
      postId = url.hash.split("/").pop();
    }
    if(typeof postId !== "string"){
      alert("帖子 ID 无效");
      return;
    }
    const arg = {
      method: 'teyvat_open',
      payload: postId,
    }
    await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
  })()"#;
  if window.is_some() {
    window.unwrap().eval(execute_js).ok().unwrap();
  }
}

/// 向米游社客户端发送重试桥接指令。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_retry(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
  javascript:(async function(){
    const arg = {
      method: 'teyvat_retry',
    }
    await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
  })()"#;
  if window.is_some() {
    window.unwrap().eval(execute_js).ok().unwrap();
  }
}

/// 向米游社客户端发送模拟触摸指令。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_mock_touch(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
  javascript:(async function(){
    const arg = {
      method: 'teyvat_touch',
    }
    await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
  })()"#;
  if window.is_some() {
    window.unwrap().eval(execute_js).ok().unwrap();
  }
}

/// 向米游社客户端发送移除遮罩指令。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_remove_overlay(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
  javascript:(async function(){
    const arg = {
      method: 'teyvat_remove',
    }
    await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
  })()"#;
  if window.is_some() {
    window.unwrap().eval(execute_js).ok().unwrap();
  }
}

/// 在竖屏与横屏尺寸之间切换米游社客户端窗口。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_rotate_window(app_handle: &Window) {
  let Some(window) = app_handle.get_webview_window("mhy_client") else {
    return;
  };
  // 获取窗口宽高比
  let cur_size = match window.inner_size() {
    Ok(size) => size,
    Err(error) => {
      log::warn!("[mhy_client] 获取窗口尺寸失败：{error}");
      return;
    }
  };
  let trans_size = if cur_size.width > cur_size.height {
    utils::get_window_size_for_window(&window, 400.0, 800.0)
  } else {
    utils::get_window_size_for_window(&window, 1280.0, 720.0)
  };
  if let Err(error) = window.set_size(Size::Logical(LogicalSize::new(trans_size.0, trans_size.1))) {
    log::warn!("[mhy_client] 旋转窗口失败：{error}");
    return;
  }
  if let Err(error) = window.center() {
    log::warn!("[mhy_client] 居中窗口失败：{error}");
  }
  if let Err(error) = window.set_focus() {
    log::warn!("[mhy_client] 聚焦窗口失败：{error}");
  }
}

/// 向米游社客户端发送使用外部 WebView 打开当前页面的指令。
///
/// @since Beta v0.11.3
///
/// # 参数
/// - `app_handle`: 主窗口引用，用于定位米游社客户端窗口。
fn handle_menu_open_with_webview(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
    javascript:(async function(){
      const url = window.location.href;
      const arg = {
        method: 'teyvat_open_webview',
        payload: url,
      }
      await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
    })()"#;
  if window.is_some() {
    window.unwrap().eval(execute_js).ok().unwrap();
  }
}
