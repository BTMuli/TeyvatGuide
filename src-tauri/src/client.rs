//! @file src/client.rs
//! @desc 客户端模块，负责操作米游社客户端
//! @since Beta v0.4.0

use tauri::{
  AppHandle, CustomMenuItem, LogicalSize, Manager, Menu, Size, Submenu, WindowBuilder, WindowUrl,
};
use url::Url;

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
fn create_mhy_menu() -> Menu {
  let top = CustomMenuItem::new("top".to_string(), "置顶");
  let cancel_top = CustomMenuItem::new("cancel_top".to_string(), "取消置顶");
  let open_post = CustomMenuItem::new("open_post".to_string(), "打开帖子");
  let utils_menu = Submenu::new("工具".to_string(), create_utils_menu());
  return Menu::new()
    .add_item(top)
    .add_item(cancel_top)
    .add_item(open_post)
    .add_submenu(utils_menu);
}

// 获取米游社客户端入口地址
fn get_mhy_client_url(func: String) -> WindowUrl {
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

// 操作米游社客户端
#[tauri::command]
pub async fn create_mhy_client(handle: AppHandle, func: String, url: String) {
  let mut mhy_window_config = handle.config().tauri.windows.get(1).unwrap().clone();
  // 如果没有传入 url 参数，则使用默认的米游社客户端入口地址
  if url != "" {
    mhy_window_config.url = WindowUrl::External(url.parse().unwrap());
  } else {
    mhy_window_config.url = get_mhy_client_url(func.clone());
  }
  if func == "birthday"
    || func == "web_act"
    || url.starts_with("https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html")
  {
    mhy_window_config.width = 1280.0;
    mhy_window_config.height = 720.0;
  }
  let has_mhy_client = handle.get_window("mhy_client").is_some();
  if has_mhy_client {
    dbg!("mhy_client exists");
    return;
  }
  WindowBuilder::from_config(&handle, mhy_window_config)
    .menu(create_mhy_menu())
    .build()
    .expect("failed to create mhy_client")
    .on_menu_event(move |event| match event.menu_item_id() {
      "top" => {
        let window = handle.get_window("mhy_client").unwrap();
        window.set_always_on_top(true).unwrap();
      }
      "cancel_top" => {
        let window = handle.get_window("mhy_client").unwrap();
        window.set_always_on_top(false).unwrap();
      }
      "open_post" => {
        let window = handle.get_window("mhy_client").unwrap();
        let execute_js = r#"javascript:(async function(){
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
        window.eval(&execute_js).ok().unwrap();
      }
      "retry" => {
        let window = handle.get_window("mhy_client").unwrap();
        let execute_js = r#"javascript:(async function(){
            const arg = {
                method: 'teyvat_retry',
            }
            await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
            })()"#;
        window.eval(&execute_js).ok().unwrap();
      }
      "mock_touch" => {
        let window = handle.get_window("mhy_client").unwrap();
        let execute_js = r#"javascript:(async function(){
                const arg = {
                    method: 'teyvat_touch',
                }
                await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
                })()"#;
        window.eval(&execute_js).ok().unwrap();
      }
      "remove_overlay" => {
        let window = handle.get_window("mhy_client").unwrap();
        let execute_js = r#"javascript:(async function(){
                        const arg = {
                            method: 'teyvat_remove',
                        }
                        await window.__TAURI__.event.emit('post_mhy_client',JSON.stringify(arg));
                        })()"#;
        window.eval(&execute_js).ok().unwrap();
      }
      "rotate_window" => {
        let window = handle.get_window("mhy_client").unwrap();
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
      _ => {}
    });
}
