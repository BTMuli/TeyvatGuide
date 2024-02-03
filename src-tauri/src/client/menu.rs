//! @file src/client/menu.rs
//! @desc 客户端菜单模块，负责操作米游社客户端菜单
//! @since Beta v0.4.3

use tauri::{AppHandle, CustomMenuItem, LogicalSize, Manager, Menu, Size, Submenu, WindowUrl};
use url::Url;

pub fn get_mhy_client_url(func: String) -> WindowUrl {
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
  return WindowUrl::External(url_res);
}

// 创建子菜单-工具
fn create_utils_menu() -> Menu {
  let retry_bridge = CustomMenuItem::new("retry".to_string(), "重试桥接");
  let mock_touch = CustomMenuItem::new("mock_touch".to_string(), "模拟触摸");
  let remove_overlay = CustomMenuItem::new("remove_overlay".to_string(), "移除遮罩");
  // 旋转窗口/切换横屏或者竖屏
  let rotate_window = CustomMenuItem::new("rotate_window".to_string(), "旋转窗口");
  return Menu::new()
    .add_item(retry_bridge)
    .add_item(mock_touch)
    .add_item(remove_overlay)
    .add_item(rotate_window);
}

// 创建米游社客户端菜单
pub fn create_mhy_menu(func: String) -> Menu {
  let top = CustomMenuItem::new("top".to_string(), "置顶");
  let cancel_top = CustomMenuItem::new("cancel_top".to_string(), "取消置顶");
  let sign_in = CustomMenuItem::new("sign_in".to_string(), "用户登录");
  let open_post = CustomMenuItem::new("open_post".to_string(), "打开帖子");
  let utils_menu = Submenu::new("工具".to_string(), create_utils_menu());
  // 如果是登录
  if func == "config_sign_in" {
    return Menu::new().add_item(sign_in);
  }
  return Menu::new()
    .add_item(top)
    .add_item(cancel_top)
    .add_item(open_post)
    .add_submenu(utils_menu);
}

// 菜单栏事件处理
pub fn handle_menu_event(app_handle: AppHandle, event: tauri::MenuEvent) {
  match event.menu_item_id() {
    "top" => handle_menu_top(app_handle),
    "cancel_top" => handle_menu_cancel_top(app_handle),
    "sign_in" => handle_menu_sign_in(app_handle),
    "open_post" => handle_menu_open_post(app_handle),
    "retry" => handle_menu_retry(app_handle),
    "mock_touch" => handle_menu_mock_touch(app_handle),
    "remove_overlay" => handle_menu_remove_overlay(app_handle),
    "rotate_window" => handle_menu_rotate_window(app_handle),
    _ => {}
  }
}

// 处理置顶菜单
fn handle_menu_top(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(true).unwrap();
  }
}

// 处理取消置顶菜单
fn handle_menu_cancel_top(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
  if window.is_some() {
    window.unwrap().set_always_on_top(false).unwrap();
  }
}

// 处理用户登录菜单
fn handle_menu_sign_in(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
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
fn handle_menu_open_post(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
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
fn handle_menu_retry(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
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
fn handle_menu_mock_touch(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
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
fn handle_menu_remove_overlay(app_handle: AppHandle) {
  let window = app_handle.get_window("mhy_client");
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
fn handle_menu_rotate_window(app_handle: AppHandle) {
  let window_get = app_handle.get_window("mhy_client");
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
