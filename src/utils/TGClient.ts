/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.5.1
 */

import { event, core, webviewWindow } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import showSnackbar from "../components/func/snackbar.js";
import TGSqlite from "../plugins/Sqlite/index.js";
import { useAppStore } from "../store/modules/app.js";
import { useUserStore } from "../store/modules/user.js";
import TGConstant from "../web/constant/TGConstant.js";
import { getCookieTokenBySToken } from "../web/request/getCookieToken.js";
import TGRequest from "../web/request/TGRequest.js";
import { getDS4JS } from "../web/utils/getRequestHeader.js";

import { parseLink } from "./linkParser.js";
import TGLogger from "./TGLogger.js";
import { createPost } from "./TGWindow.js";
import { getDeviceInfo } from "./toolFunc.js";

// invoke 参数
interface InvokeArg {
  func: string;
}

/**
 * @class TGClient
 * @since Beta v0.4.4
 * @description 米游社客户端
 */
class TGClient {
  /**
   * @private 监听实例
   * @since Beta v0.3.3
   * @type {EventEmitter}
   * @memberof TGClient
   */
  private listener: UnlistenFn | undefined;

  /**
   * @private 模拟路由
   * @since Beta v0.3.4
   * @type {string[]}
   * @memberof TGClient
   */
  private route: string[] = [];

  /**
   * @constructor
   * @since Beta v0.3.4
   * @description 构造函数
   * @memberof TGClient
   */
  constructor() {
    this.route = [];
    this.listener = undefined;
  }

  /**
   * @func run
   * @since Beta v0.3.4
   * @desc 运行米游社客户端
   * @returns {void} - 无返回值
   */
  async run(): Promise<void> {
    if (this.listener === undefined) {
      this.listener = await event.listen("post_mhy_client", async (arg: Event<string>) => {
        await this.handleCallback(arg);
      });
    } else {
      console.warn("[TGClient][run] 监听器已存在");
    }
  }

  /* 内置函数 */

  /**
   * @func callback
   * @since Beta v0.5.0
   * @desc 回调函数
   * @param {string} callback - 回调函数名
   * @param {object} data - 回调数据
   * @returns {void} - 无返回值
   */
  async callback(callback: string, data: object): Promise<void> {
    const response = {
      retcode: 0,
      message: "success",
      data: data ?? {},
    };
    const js = `javascript:mhyWebBridge("${callback}", ${JSON.stringify(response)});`;
    console.info(`[callback] ${js}`);
    await core.invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * @func getSaveImgJS
   * @since Beta v0.5.1
   * @desc 获取保存图片的 JS
   * @param {string} url - 图片链接
   * @param {string} format - 图片格式
   * @returns {string} - JS
   */
  getSaveImgJS(url: string, format: string): string {
    return `javascript:(async function() {
      var _path = window.__TAURI__.path;
      var saveDefault = await _path.downloadDir() + _path.sep() + Date.now() + '.${format}';
      var savePath = await window.__TAURI_PLUGIN_DIALOG__.save({
        title: '保存图片',
        filters: [{ name: '图片', extensions: ['${format}'] }],
        defaultPath: saveDefault,
      });
      if(savePath !== null) {
        var resp = await window.__TAURI_PLUGIN_HTTP__.fetch('${url}',{
          method: 'GET'
        }).then(res => res.arrayBuffer());
        var buffer = new Uint8Array(resp);
        await window.__TAURI_PLUGIN_FS__.writeFile(savePath, buffer);
        alert('保存成功');
      }
    })();`;
  }

  /**
   * @func getUrl
   * @since Beta v0.5.0
   * @desc 获取 url
   * @param {string} func - 方法名
   * @returns {string} - url
   */
  getUrl(func: string): string {
    switch (func) {
      case "sign_in":
        return "https://act.mihoyo.com/bbs/event/signin/hk4e/index.html?act_id=e202311201442471&bbs_auth_required=true&bbs_presentation_style=fullscreen&mhy_presentation_style=fullscreen&utm_source=bbs&utm_medium=ys&utm_campaign=icon";
      case "game_record":
        return "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen&game_id=2";
      case "daily_note":
        return "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen#/ys/daily/";
      case "tavern":
        return "https://m.miyoushe.com/ys/#/home/26";
      case "birthday":
        return "https://webstatic.mihoyo.com/ys/event/e20220303-birthday/index.html?activity_id=20220301153521";
      case "toolbox":
        return "https://webstatic.mihoyo.com/bbs/event/e20200511toolbox/index.html?game_biz=ys_cn";
      default:
        return "https://api-static.mihoyo.com/";
    }
  }

  /**
   * @func handleCallback
   * @since Beta v0.4.2
   * @desc 处理米游社客户端的 callback
   * @param {Event<string>} arg - 事件参数
   * @returns {Promise<void>} - 返回值
   */
  async handleCallback(arg: Event<string>): Promise<void> {
    const argParse: TGApp.Plugins.JSBridge.Arg<any> = JSON.parse(arg.payload);
    if (argParse.method.startsWith("teyvat")) {
      await this.handleCustomCallback(argParse);
      return;
    }
    await TGLogger.Warn(`[TGClient][handleCallback] ${JSON.stringify(argParse)}`, false);
    await TGLogger.Info(
      `[TGClient][handleCallback] 处理回调 ${argParse.method}：${argParse.callback}`,
    );
    await this.hideSideBar();
    await this.hideOverlay();
    switch (argParse.method) {
      case "closePage":
        await this.closePage(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "configure_share":
        await this.configShare(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.ConfigSharePayload>>argParse,
        );
        break;
      case "eventTrack":
        await this.eventTrack(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.EventTrackPayload>>argParse,
        );
        break;
      case "getStatusBarHeight":
        await this.getStatusBarHeight(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "genAuthKey":
        await this.genAuthKey(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>>argParse,
        );
        break;
      case "getCookieInfo":
        await this.getCookieInfo(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "getCookieToken":
        await this.getCookieToken(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload>>argParse,
        );
        break;
      case "getActionTicket":
        await this.getActionTicket(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>>argParse,
        );
        break;
      case "getHTTPRequestHeaders":
        await this.getHTTPRequestHeaders(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "getDS":
        await this.getDS(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "getDS2":
        await this.getDS2(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>>argParse,
        );
        break;
      case "getUserInfo":
        await this.getUserInfo(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "login":
        await this.nullCallback(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "onBeginDragging":
        await this.nullCallback(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "onClickImg":
        await this.onClickImg(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OnClickImgPayload>>argParse,
        );
        break;
      case "openApplication":
        await this.openApplication(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenApplicationPayload>>argParse,
        );
        break;
      case "pushPage":
        await this.pushPage(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.PushPagePayload>>argParse,
        );
        break;
      case "setPresentationStyle":
        await this.setPresentationStyle(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SetPresentationStylePayload>>argParse,
        );
        break;
      case "share":
        await this.share(<TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SharePayload>>argParse);
        break;
      case "share2":
        await this.nullCallback(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      default:
        console.warn(`[${arg.event}] ${JSON.stringify(argParse)}`);
    }
  }

  /**
   * @func handleCustomCallback
   * @since Beta v0.5.0
   * @desc 处理自定义的 callback
   * @param {TGApp.Plugins.JSBridge.Arg<any>} arg - 事件参数
   * @returns {Promise<void>} - 返回值
   */
  async handleCustomCallback(arg: TGApp.Plugins.JSBridge.Arg<any>): Promise<void> {
    await TGLogger.Info(`[TGClient][handleCustomCallback] ${JSON.stringify(arg)}`);
    switch (arg.method) {
      case "teyvat_open":
        await createPost(<string>arg.payload);
        break;
      case "teyvat_remove":
        await this.hideOverlay();
        break;
      case "teyvat_retry": {
        const executeJS = `javascript:(function(){
          window.location.reload();
        })();`;
        await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
        await this.loadJSBridge();
        break;
      }
      case "teyvat_sign_in": {
        await event.emit("config_user_sign", arg.payload);
        break;
      }
      case "teyvat_touch": {
        const executeJS = `javascript:(() => {
          // 鼠标移动监听
          const mouseMoveListener = (e) => {
            console.log("mouseMoveListener");
            const touch = new Touch({
              identifier: Date.now(),
              target: e.target,
              clientX: e.clientX,
              clientY: e.clientY,
              screenX: e.screenX,
              screenY: e.screenY,
              pageX: e.pageX,
              pageY: e.pageY
            });
            const touchEvent = new TouchEvent("touchmove", {
              cancelable: true,
              bubbles: true,
              touches: [touch],
              targetTouches: [touch],
              changedTouches: [touch]
            });
            console.log(touchEvent);
            e.target.dispatchEvent(touchEvent);
          };
          // 鼠标抬起监听
          const mouseUpListener = (e) => {
            console.log("mouseUpListener");
            const touch = new Touch({
              identifier: Date.now(),
              target: e.target,
              clientX: e.clientX,
              clientY: e.clientY,
              screenX: e.screenX,
              screenY: e.screenY,
              pageX: e.pageX,
              pageY: e.pageY
            });
            const touchEvent = new TouchEvent("touchend", {
              cancelable: true,
              bubbles: true,
              touches: [touch],
              targetTouches: [touch],
              changedTouches: [touch]
            });
            console.log(touchEvent);
            e.target.dispatchEvent(touchEvent);
            // 鼠标抬起后，移除对于鼠标移动和鼠标抬起的监听
            document.removeEventListener("mousemove", mouseMoveListener);
            document.removeEventListener("mouseup", mouseUpListener);
          };
          const mouseDownListener = (e) => {
            console.log("mouseDownListener");
            const touch = new Touch({
              identifier: Date.now(),
              target: e.target,
              clientX: e.clientX,
              clientY: e.clientY,
              screenX: e.screenX,
              screenY: e.screenY,
              pageX: e.pageX,
              pageY: e.pageY
            });
            const touchEvent = new TouchEvent("touchstart", {
              cancelable: true,
              bubbles: true,
              touches: [touch],
              targetTouches: [touch],
              changedTouches: [touch]
            });
            console.log(touchEvent);
            e.target.dispatchEvent(touchEvent);
            // 鼠标按下后，监听鼠标移动和鼠标抬起事件
            document.addEventListener("mousemove", mouseMoveListener);
            document.addEventListener("mouseup", mouseUpListener);
          };
          document.addEventListener("mousedown", mouseDownListener);
        })()`;
        await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
        break;
      }
      default:
        console.warn(`[customCallback] ${arg.method}`);
    }
  }

  /**
   * @func hideOverlay
   * @since Beta v0.5.0
   * @desc 隐藏遮罩
   * @returns {Promise<void>}
   */
  async hideOverlay(): Promise<void> {
    const executeJS = `javascript:(function(){
      if (document.getElementById('mihoyo_landscape') !== null) {
        let box = document.getElementById('mihoyo_landscape');
        box.remove();
      }
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func hideSideBar
   * @since Beta v0.5.0
   * @desc 隐藏侧边栏
   * @returns {void} - 无返回值
   */
  async hideSideBar(): Promise<void> {
    const executeJS = `javascript:(function(){
      if (document.getElementById('teyvat_style')) {
        return;
      } else {
        let style = document.createElement('style');
        style.innerHTML = '::-webkit-scrollbar{display:none}';
        style.id = 'teyvat_style';
        document.querySelector('body').appendChild(style);
      }
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func loadJSBridge
   * @since Beta v0.5.0
   * @desc 加载 JSBridge
   * @returns {void} - 无返回值
   */
  async loadJSBridge(): Promise<void> {
    const executeJS = `javascript:(function() {
      if(window.MiHoYoJSInterface) return;
      window.MiHoYoJSInterface = {
        postMessage: function(arg) { window.__TAURI__.event.emit('post_mhy_client', arg) },
        closePage: function() { this.postMessage('{"method":"closePage"}') },
      };
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func nullCallback
   * @since Beta v0.3.9
   * @desc 空回调函数
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 回调参数
   * @returns {void} - 无返回值
   */
  async nullCallback(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    await this.callback(arg.callback, {});
  }

  /**
   * @func open
   * @since Beta v0.5.0
   * @desc 打开米游社客户端
   * @param {string} func - 方法名
   * @param {string} url - url
   * @returns {void} - 无返回值
   */
  async open(func: string, url?: string): Promise<void> {
    if (url === undefined) url = this.getUrl(func);
    this.route = [url];
    await TGLogger.Info(`[TGClient][open][${func}] ${url}`);
    const windowFind = webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) {
      try {
        await windowFind.destroy();
      } catch (e) {
        showSnackbar({
          text: `[TGClient][open] ${e}`,
          color: "error",
        });
      }
    }
    await core.invoke<InvokeArg>("create_mhy_client", { func, url });
    await this.loadJSBridge();
  }

  /* JSBridge 回调处理 */
  /**
   * @func closePage
   * @since Beta v0.5.0
   * @desc 关闭米游社客户端的页面
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async closePage(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    this.route.pop();
    if (this.route.length === 0) {
      await webviewWindow.WebviewWindow.getByLabel("mhy_client")?.destroy();
      return;
    }
    const url = this.route[this.route.length - 1];
    console.log(`[closePage] ${JSON.stringify(arg)}`);
    const executeJS = `javascript:(function(){
      window.location.href = '${url}';
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
    await this.loadJSBridge();
  }

  /**
   * @func configShare
   * @since Beta v0.3.9
   * @desc 配置分享
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.ConfigSharePayload>} arg - 请求参数
   * @returns {Promise<void>} - 无返回值
   */
  async configShare(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.ConfigSharePayload>,
  ): Promise<void> {
    console.log(`[configShare] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * @func eventTrack
   * @since Beta v0.3.9
   * @desc 事件跟踪
   * @param {TGApp.Plugins.Arg<TGApp.Plugins.JSBridge.EventTrackPayload>} arg - 请求参数
   * @returns {Promise<void>} - 无返回值
   */
  async eventTrack(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.EventTrackPayload>,
  ): Promise<void> {
    console.log(`[eventTrack] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * @func genAuthKey
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 authkey
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async genAuthKey(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>,
  ): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.cookie) return;
    const cookie = {
      mid: userStore.cookie.mid,
      stoken: userStore.cookie.stoken,
    };
    const res = await TGRequest.User.getAuthkey2(cookie, arg.payload);
    await this.callback(arg.callback, res.data);
  }

  /**
   * @func getActionTicket
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 action_ticket
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async getActionTicket(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>,
  ): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    const uid = user.account.gameUid;
    const mid = user.cookie.mid;
    const stoken = user.cookie.stoken;
    const ActionTicket = await TGRequest.User.bySToken.getActionTicket(
      arg.payload.action_type,
      stoken,
      mid,
      uid,
    );
    await this.callback(arg.callback, ActionTicket.data);
  }

  /**
   * @func getCookieInfo
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 cookie
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async getCookieInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    const data = {
      ltoken: user.cookie.ltoken,
      ltuid: user.cookie.ltuid,
      login_ticket: "",
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getCookieToken
   * @since Beta v0.5.0
   * @desc 获取米游社客户端的 cookie_token
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload>} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async getCookieToken(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload>,
  ): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    if (arg.payload.forceRefresh) {
      const res = await getCookieTokenBySToken(user.cookie.mid, user.cookie.stoken);
      if (typeof res !== "string") {
        return;
      }
      user.cookie.cookie_token = res;
      await TGSqlite.saveAppData("cookie", JSON.stringify(user.cookie));
    }
    // todo 优化代码
    const executeJS = `javascript:(function(){
      document.cookie = "account_id_v2=${user.cookie.account_id};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "cookie_token=${user.cookie.cookie_token};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "ltuid_v2=${user.cookie.ltuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "ltoken=${user.cookie.ltoken};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "account_id=${user.cookie.account_id};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "account_mid_v2=${user.cookie.mid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "ltuid_v2=${user.cookie.ltuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
      document.cookie = "ltmid_v2=${user.cookie.mid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";
    })();`;
    console.info(`[getCookieToken] ${executeJS}`);
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
    const data = {
      cookie_token: user.cookie.cookie_token,
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getDS
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 DS 参数
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 方法参数
   * @returns {void} - 无返回值
   */
  async getDS(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = {
      DS: getDS4JS("lk2", 1, undefined, undefined),
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getDS2
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 DS 参数
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>} arg
   * @returns {Promise<void>}
   */
  async getDS2(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>,
  ): Promise<void> {
    const data = {
      DS: getDS4JS("common", 2, arg.payload.body, arg.payload.query),
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getHTTPRequestHeaders
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的 HTTP 请求头
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async getHTTPRequestHeaders(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const localFp = getDeviceInfo("device_fp");
    let deviceInfo = useAppStore().deviceInfo;
    if (localFp === "0000000000000") {
      deviceInfo = await TGRequest.Device.getFp(deviceInfo);
    }
    const data = {
      "user-agent": TGConstant.BBS.UA_MOBILE,
      "x-rpc-client_type": "2",
      "x-rpc-device_id": deviceInfo.device_id,
      "x-rpc-app_version": TGConstant.BBS.VERSION,
      "x-rpc-device_fp": deviceInfo.device_fp,
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getStatusBarHeight
   * @since Beta v0.3.9
   * @desc 获取状态栏高度
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 请求参数
   * @returns {void} - 无返回值
   */
  async getStatusBarHeight(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = {
      statusBarHeight: 0,
    };
    await this.callback(arg.callback, data);
  }

  /**
   * @func getUserInfo
   * @since Beta v0.3.9
   * @desc 获取米游社客户端的用户信息
   * @param {TGApp.Plugins.JSBridge.NullArg} arg - 类型参数
   * @returns {void} - 无返回值
   */
  async getUserInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    const cookieToken = user.cookie.cookie_token;
    const accountId = user.cookie.account_id;
    const userInfo = await TGRequest.User.byCookie.getUserInfo(cookieToken, accountId);
    if ("retcode" in userInfo) {
      console.error(`[${arg.callback}] ${userInfo.message}`);
      return;
    }
    await this.callback(arg.callback, userInfo);
  }

  /**
   * @func onClickImg
   * @since Beta v0.5.0
   * @desc 点击图片，下载到本地
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OnClickImgPayload>} arg - 方法参数
   * @returns {void} - 无返回值
   */
  async onClickImg(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OnClickImgPayload>,
  ): Promise<void> {
    const { image_list } = arg.payload;
    const image = image_list[0];
    const executeJS = this.getSaveImgJS(image.url, image.format);
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func openApplication
   * @since Beta v0.5.0
   * @desc 打开应用
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenApplicationPayload>} arg - 方法参数
   * @returns {void} - 无返回值
   */
  async openApplication(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenApplicationPayload>,
  ): Promise<void> {
    console.log(`[openApplication] ${JSON.stringify(arg.payload)}`);
    const appWindow = webviewWindow.WebviewWindow.getByLabel("TeyvatGuide");
    await appWindow?.setFocus();
    showSnackbar({
      text: `不支持的操作：OpenApplication(${JSON.stringify(arg.payload)})`,
      color: "error",
    });
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    const windowFind = webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) {
      await windowFind.setFocus();
    }
  }

  /**
   * @func pushPage
   * @since Beta v0.5.0
   * @desc 打开米游社客户端的页面
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.PushPagePayload>} arg - 方法参数
   * @returns {Promise<void>} - 无返回值
   */
  async pushPage(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.PushPagePayload>,
  ): Promise<void> {
    const res = await parseLink(arg.payload.page, true);
    if (!res) {
      const appWindow = webviewWindow.WebviewWindow.getByLabel("TeyvatGuide");
      await appWindow?.setFocus();
      showSnackbar({
        text: `未知链接:${arg.payload.page}`,
        color: "error",
        timeout: 3000,
      });
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 3000);
      });
      const windowFind = webviewWindow.WebviewWindow.getByLabel("mhy_client");
      if (windowFind !== null) {
        await windowFind.setFocus();
      }
      return;
    }
    if (typeof res !== "string") return;
    this.route.push(res);
    console.log(`[pushPage] ${res}`);
    const executeJS = `javascript:(function(){
      window.location.href = '${res}';
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
    await this.loadJSBridge();
    await this.hideSideBar();
    await this.hideOverlay();
    const windowFind = webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) {
      await windowFind.show();
      await windowFind.setFocus();
    }
  }

  /**
   * @func setPresentationStyle
   * @since Beta v0.3.9
   * @desc 设置米游社客户端的展示方式
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SetPresentationStylePayload>} arg - 方法参数
   * @returns {Promise<void>} - 无返回值
   */
  async setPresentationStyle(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SetPresentationStylePayload>,
  ): Promise<void> {
    console.log(`[setPresentationStyle] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * @func share
   * @since Beta v0.5.1
   * @desc 分享
   * @param {TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SharePayload>} arg - 方法参数
   * @returns {Promise<void>} - 无返回值
   */
  async share(arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SharePayload>): Promise<void> {
    if (arg.payload.type === "default") {
      const image = arg.payload.content.image_url;
      const format = image.split(".").pop();
      const executeJS = this.getSaveImgJS(image, format ?? "png");
      await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
      await this.callback(arg.callback, {});
      return;
    }
    if (arg.payload.type === "screenshot") {
      const executeJS = `javascript:(async function() {
        var checkLib = false;
        var scripts = document.querySelectorAll("script");
        for(var script of scripts) {
          if(script.src.includes("https://cdn.jsdelivr.net/npm/modern-screenshot")) {
            checkLib = true;
            break;
          }
        }
        if (!checkLib) {
          var script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/modern-screenshot";
          document.body.appendChild(script);
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }
        var shareDom;
        if(${JSON.stringify(arg.payload.content)} === "{}") {
          shareDom = document.querySelector(".share");
        } else if (${arg.payload.content?.preview} === true) {
          shareDom = document.querySelector("#root");
        }
        if(shareDom === undefined || shareDom === null) {
          shareDom = document.body;
        }
        var scale = 1.5;
        var option = {
          debug: true,
          backgroundColor: "transparent",
          height: shareDom.scrollHeight * scale,
          width: shareDom.scrollWidth * scale,
          style: {
            transform: "scale(" + scale + ")",
            transformOrigin: "top left",
            padding: "0",
            margin: "0",
          }
        };
        // 等待3s，让图片充分加载
        await new Promise((resolve) => {
          setTimeout(resolve, 3000);
        });
        var pictures = shareDom.querySelectorAll("picture");
        if(pictures !== null && pictures.length > 0) {
          pictures.forEach(picture => {
            var img = picture.querySelector("img");
            if(img !== null) {
              picture.parentNode.replaceChild(img, picture);
            }
          });
        }
        var img = await modernScreenshot.domToPng(shareDom, option);
        var buffer = new Uint8Array(atob(img.split(",")[1]).split("").map(function(item) {
          return item.charCodeAt(0);
        }));
        var _path = window.__TAURI__.path;
        var saveDefault = await _path.downloadDir() + _path.sep() + Date.now() + ".png";
        var savePath = await window.__TAURI_PLUGIN_DIALOG__.save({
          title: "保存图片",
          filters: [{ name: "图片", extensions: ["png"] }],
          defaultPath: saveDefault,
        });
        if (savePath !== null) {
          await window.__TAURI_PLUGIN_FS__.writeFile(savePath, buffer);
          alert("保存成功");
        }
        mhyWebBridge("${arg.callback}", {});
      })();`;
      await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
      return;
    }
    if (arg.payload.type === "image") {
      if (arg.payload.content?.image_url !== undefined) {
        const image = arg.payload.content.image_url;
        const format = image.split(".").pop();
        const executeJS = this.getSaveImgJS(image, format ?? "png");
        await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
        await this.callback(arg.callback, {});
        return;
      }
      if (arg.payload.content?.image_base64 !== undefined) {
        let image = arg.payload.content.image_base64;
        image = `data:image/png;base64,${image}`;
        const executeJS = `javascript:(async function() {
          // 转换成 blob
          var buffer = new Uint8Array(atob('${image}'.split(',')[1]).split('').map(function(item) {
            return item.charCodeAt(0);
          }));
          var _path = window.__TAURI__.path;
          var saveDefault = await _path.downloadDir() + _path.sep() + Date.now() + ".png";
          var savePath = await window.__TAURI_PLUGIN_DIALOG__.save({
            title: "保存图片",
            filters: [{ name: "图片", extensions: ["png"] }],
            defaultPath: saveDefault,
          });
          if (savePath !== null) {
            await window.__TAURI_PLUGIN_FS__.writeFile(savePath, buffer);
            alert("保存成功");
          }
          mhyWebBridge('${arg.callback}', {});
        })();`;
        await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
        return;
      }
    }
    console.warn("[share]", arg.payload);
    // 延时 3s
    setTimeout(async () => {
      await this.callback(arg.callback, {});
    }, 10000);
  }
}

const mhyClient = new TGClient();

export default mhyClient;
