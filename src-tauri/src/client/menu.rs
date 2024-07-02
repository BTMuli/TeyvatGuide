//! @file src/client/menu.rs
//! @desc 客户端菜单模块，负责操作米游社客户端菜单
//! @since Beta v0.4.10

use tauri::menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder, Submenu, SubmenuBuilder};
use tauri::{AppHandle, LogicalSize, Manager, Size, Window, Wry};
use tauri_utils::config::WebviewUrl;
use url::Url;

pub fn get_mhy_client_url(func: String) -> WebviewUrl {
  let mut url_res: Url = "https://bbs.mihoyo.com/ys/".parse().unwrap();
  if func == "sign_in" {
    url_res = "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501"
      .parse()
      .unwrap();
  } else if func == "game_record" {
    url_res =
            "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen".parse().unwrap();
  } else if func == "birthday" {
    url_res = "https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html?activity_id=20220301153521"
            .parse()
            .unwrap();
  }
  return WebviewUrl::External(url_res);
}

// 创建子菜单-工具
fn create_utils_menu(app: AppHandle) -> Submenu<Wry> {
  let retry_bridge_submenu = MenuItemBuilder::with_id("retry", "重试桥接").build(&app).unwrap();
  let mock_touch_submenu = MenuItemBuilder::with_id("mock_touch", "模拟触摸").build(&app).unwrap();
  let remove_overlay_submenu =
    MenuItemBuilder::with_id("remove_overlay", "移除遮罩").build(&app).unwrap();
  let rotate_window_submenu =
    MenuItemBuilder::with_id("rotate_window", "旋转窗口").build(&app).unwrap();
  let utils_menu = SubmenuBuilder::new(&app, "工具")
    .item(&retry_bridge_submenu)
    .item(&mock_touch_submenu)
    .item(&remove_overlay_submenu)
    .item(&rotate_window_submenu)
    .build()
    .expect("failed to create utils_menu");
  return utils_menu;
}

// 创建米游社客户端菜单
pub fn create_mhy_menu(func: String, app: AppHandle) -> Menu<Wry> {
  let top_menu = MenuItemBuilder::with_id("top", "置顶").build(&app).unwrap();
  let cancel_top_menu = MenuItemBuilder::with_id("cancel_top", "取消置顶").build(&app).unwrap();
  let sign_in_menu = MenuItemBuilder::with_id("sign_in", "用户登录").build(&app).unwrap();
  let open_post_menu = MenuItemBuilder::with_id("open_post", "打开帖子").build(&app).unwrap();
  let utils_menu = create_utils_menu(app.clone());
  // 如果是登录
  if func == "config_sign_in" {
    return MenuBuilder::new(&app).item(&sign_in_menu).build().expect("failed to create mhy_menu");
  }
  return MenuBuilder::new(&app)
    .item(&top_menu)
    .item(&cancel_top_menu)
    .item(&open_post_menu)
    .item(&utils_menu)
    .build()
    .expect("failed to create mhy_menu");
}

// 菜单栏事件处理
pub fn handle_menu_event(window: &Window, event: MenuEvent) {
  match event.id.as_ref() {
    "top" => handle_menu_top(window),
    "cancel_top" => handle_menu_cancel_top(window),
    "sign_in" => handle_menu_sign_in(window),
    "open_post" => handle_menu_open_post(window),
    "retry" => handle_menu_retry(window),
    "mock_touch" => handle_menu_mock_touch(window),
    "remove_overlay" => handle_menu_remove_overlay(window),
    "rotate_window" => handle_menu_rotate_window(window),
    _ => {}
  }
}

// 处理置顶菜单
fn handle_menu_top(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(true).unwrap();
  }
}

// 处理取消置顶菜单
fn handle_menu_cancel_top(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(false).unwrap();
  }
}

// 处理用户登录菜单
fn handle_menu_sign_in(app_handle: &Window) {
  let window = app_handle.get_webview_window("mhy_client");
  let execute_js = r#"
  javascript:(async function(){
    // 首先检测是不是 user.mihoyo.com
    const url = new URL(window.location.href);
    if(url.hostname !== "user.mihoyo.com"){
      alert("当前页面不是米游社登录页面");
      return;
    }
    const ck = document.cookie;
    const arg = {
      method: 'teyvat_sign_in',
      payload: ck,
    }
    await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
  })()"#;
  if window.is_some() {
    window.unwrap().eval(&execute_js).ok().unwrap();
  }
}

// 处理打开帖子菜单
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
    window.unwrap().eval(&execute_js).ok().unwrap();
  }
}

// 处理重试桥接菜单
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
    window.unwrap().eval(&execute_js).ok().unwrap();
  }
}

// 处理模拟触摸菜单
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
    window.unwrap().eval(&execute_js).ok().unwrap();
  }
}

// 处理移除遮罩菜单
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
    window.unwrap().eval(&execute_js).ok().unwrap();
  }
}

// 处理旋转窗口菜单
fn handle_menu_rotate_window(app_handle: &Window) {
  let window_get = app_handle.get_webview_window("mhy_client");
  if window_get == None {
    return;
  }
  let window = window_get.unwrap();
  // 获取窗口宽高比
  let cur_size = window.inner_size().ok().unwrap();
  if cur_size.width > cur_size.height {
    window.set_size(Size::Logical(LogicalSize { width: 400.0, height: 800.0 })).unwrap();
  } else {
    window.set_size(Size::Logical(LogicalSize { width: 1280.0, height: 720.0 })).unwrap();
  }
  window.center().unwrap();
  window.set_focus().unwrap();
}
