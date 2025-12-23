/**
 * 负责米游社客户端的 callback 处理
 * @since Beta v0.8.3
 */

import showSnackbar from "@comp/func/snackbar.js";
import bbsReq from "@req/bbsReq.js";
import OtherApi from "@req/otherReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TGSqlite from "@Sql/index.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { core, event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getDS4JS } from "@utils/getRequestHeader.js";

import { parseLink } from "./linkParser.js";
import TGBbs from "./TGBbs.js";
import TGLogger from "./TGLogger.js";
import { createPost } from "./TGWindow.js";
import { getDeviceInfo } from "./toolFunc.js";

class Client {
  private listener: UnlistenFn | undefined;
  private route: Array<string> = [];

  private constructor() {
    this.route = [];
    this.listener = undefined;
  }

  private static instance: Client | null = null;

  static getInstance(): Client {
    if (this.instance === null) this.instance = new Client();
    return this.instance;
  }

  /**
   * 运行米游社客户端
   * @since Beta v0.3.4
   * @returns Promise<void>
   */
  async run(): Promise<void> {
    if (this.listener === undefined) {
      this.listener = await event.listen<string>("post_mhy_client", async (arg: Event<string>) => {
        await this.handleCallback(arg);
      });
    } else {
      console.warn("[TGClient][run] 监听器已存在");
    }
  }

  /**
   * 回调函数
   * @since Beta v0.5.0
   * @param callback - 回调函数名
   * @param data - 回调数据
   * @returns 无返回值
   */
  async callback(callback: string, data: object): Promise<void> {
    const response = { retcode: 0, message: "success", data: data ?? {} };
    const js = `javascript:mhyWebBridge("${callback}", ${JSON.stringify(response)});`;
    console.info(`[callback] ${js}`);
    await core.invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * 获取保存图片的 JS
   * @since Beta v0.5.1
   * @param url - 图片链接
   * @param format - 图片格式
   * @returns JS代码字符串
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
   * 获取 url
   * @since Beta v0.5.0
   * @param func - 方法名
   * @returns url
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
   * 处理米游社客户端的 callback
   * @since Beta v0.6.1
   * @param arg - 事件参数
   * @returns - 返回值
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
      case "genAuthKey":
        await this.genAuthKey(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>>argParse,
        );
        break;
      case "getActionTicket":
        await this.getActionTicket(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>>argParse,
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
      case "getDS":
        await this.getDS(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "getDS2":
        await this.getDS2(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>>argParse,
        );
        break;
      case "getHTTPRequestHeaders":
        await this.getHTTPRequestHeaders(<TGApp.Plugins.JSBridge.NullArg>argParse);
        break;
      case "getRegionRoleInfo":
        await this.getRegionRoleInfo(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetRegionRoleInfoPayload>>argParse,
        );
        break;
      case "getStatusBarHeight":
        await this.getStatusBarHeight(<TGApp.Plugins.JSBridge.NullArg>argParse);
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
      case "openSystemBrowser":
        await this.openSystemBrowser(
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenSystemBrowserPayload>>argParse,
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
   * 处理自定义的 callback
   * @since Beta v0.7.6
   * @param arg - 事件参数
   * @returns 返回值
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
      case "teyvat_open_webview":
        await openUrl(arg.payload);
        break;
      default:
        console.warn(`[customCallback] ${arg.method}`);
    }
  }

  /**
   * 隐藏遮罩
   * @since Beta v0.5.0
   * @returns 无返回值
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
   * 隐藏侧边栏
   * @since Beta v0.5.0
   * @returns 无返回值
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
   * 加载 JSBridge
   * @since Beta v0.5.0
   * @returns 无返回值
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
   * 空回调函数
   * @since Beta v0.3.9
   * @param arg - 回调参数
   * @returns 无返回值
   */
  async nullCallback(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    await this.callback(arg.callback, {});
  }

  /**
   * 打开米游社客户端
   * @since Beta v0.5.5
   * @param func - 方法名
   * @param url - url
   * @returns 无返回值
   */
  async open(func: string, url?: string): Promise<void> {
    if (url === undefined) url = this.getUrl(func);
    this.route = [url];
    await TGLogger.Info(`[TGClient][open][${func}] ${url}`);
    const windowFind = await webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) {
      try {
        await windowFind.destroy();
      } catch (e) {
        showSnackbar.error(`[TGClient][open] ${e}`);
        await TGLogger.Error(`[TGClient][open] ${e}`);
      }
    }
    await core.invoke("create_mhy_client", { func, url });
    await this.loadJSBridge();
  }

  /* JSBridge 回调处理 */
  /**
   * 关闭米游社客户端的页面
   * @since Beta v0.5.0
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async closePage(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    this.route.pop();
    if (this.route.length === 0) {
      const windowFind = await webviewWindow.WebviewWindow.getByLabel("mhy_client");
      if (windowFind != null) await windowFind.destroy();
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
   * 配置分享
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async configShare(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.ConfigSharePayload>,
  ): Promise<void> {
    console.log(`[configShare] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * 事件跟踪
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async eventTrack(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.EventTrackPayload>,
  ): Promise<void> {
    console.log(`[eventTrack] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * 获取米游社客户端的 authkey
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async genAuthKey(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>,
  ): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.cookie) return;
    const cookie = { mid: userStore.cookie.mid, stoken: userStore.cookie.stoken };
    const res = await takumiReq.bind.authKey2(cookie, arg.payload);
    await this.callback(arg.callback, res.data);
  }

  /**
   * 获取米游社客户端的 action_ticket
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getActionTicket(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>,
  ): Promise<void> {
    const userStore = useUserStore();
    if (!userStore.cookie) return;
    const ActionTicket = await takumiReq.auth.actionTicket(
      userStore.cookie,
      userStore.account,
      arg.payload.action_type,
    );
    await this.callback(arg.callback, ActionTicket.data);
  }

  /**
   * 获取米游社客户端的 cookie
   * @since Beta v0.8.3
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getCookieInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    const executeJS = `javascript:(function(){
    let domainCur = window.location.hostname;
    if (domainCur.endsWith('.miyoushe.com')) domainCur = '.miyoushe.com';
    else domainCur = '.mihoyo.com';
    document.cookie = 'account_id=${user.cookie!.account_id}; domain=' + domainCur + '; path=/;';
    document.cookie = 'account_id_v2=${user.cookie!.account_id}; domain=' + domainCur + '; path=/;';
    document.cookie = 'account_mid_v2=${user.cookie!.mid}; domain=' + domainCur + '; path=/;';
    document.cookie = 'cookie_token=${user.cookie!.cookie_token}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltmid_v2=${user.cookie!.mid}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltoken=${user.cookie!.ltoken}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltuid_v2=${user.cookie!.ltuid}; domain=' + domainCur + '; path=/;';
    })();`;
    console.info(`[getCookieInfo] ${executeJS}`);
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
    const data = { ltoken: user.cookie.ltoken, ltuid: user.cookie.ltuid, login_ticket: "" };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取米游社客户端的 cookie_token
   * @since Beta v0.8.3
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getCookieToken(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload>,
  ): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    if (arg.payload.forceRefresh) {
      const res = await passportReq.cookieToken(user.cookie);
      if (typeof res !== "string") return;
      user.cookie.cookie_token = res;
      await TGSqlite.saveAppData("cookie", JSON.stringify(user.cookie));
    }
    const executeJS = `javascript:(function(){
    let domainCur = window.location.hostname;
    if (domainCur.endsWith('.miyoushe.com')) domainCur = '.miyoushe.com';
    else domainCur = '.mihoyo.com';
    document.cookie = 'account_id=${user.cookie!.account_id}; domain=' + domainCur + '; path=/;';
    document.cookie = 'account_id_v2=${user.cookie!.account_id}; domain=' + domainCur + '; path=/;';
    document.cookie = 'account_mid_v2=${user.cookie!.mid}; domain=' + domainCur + '; path=/;';
    document.cookie = 'cookie_token=${user.cookie!.cookie_token}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltmid_v2=${user.cookie!.mid}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltoken=${user.cookie!.ltoken}; domain=' + domainCur + '; path=/;';
    document.cookie = 'ltuid_v2=${user.cookie!.ltuid}; domain=' + domainCur + '; path=/;';
    })();`;
    console.info(`[getCookieToken] ${executeJS}`);
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
    const data = { cookie_token: user.cookie.cookie_token };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取米游社客户端的 DS 参数
   * @since Beta v0.7.3
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getDS(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = { DS: getDS4JS("LK2", 1) };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取米游社客户端的 DS 参数
   * @since Beta v0.3.9
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getDS2(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>,
  ): Promise<void> {
    const data = {
      DS: getDS4JS("X4", 2, arg.payload.body, arg.payload.query),
    };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取米游社客户端的 HTTP 请求头
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getHTTPRequestHeaders(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const localFp = getDeviceInfo("device_fp");
    let deviceInfo = useAppStore().deviceInfo;
    if (localFp === "0000000000000") deviceInfo = await OtherApi.fp(deviceInfo);
    const data = {
      "user-agent": TGBbs.ua,
      "x-rpc-client_type": "2",
      "x-rpc-device_id": deviceInfo.device_id,
      "x-rpc-app_version": TGBbs.version,
      "x-rpc-device_fp": deviceInfo.device_fp,
    };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取状态栏高度
   * @since Beta v0.3.9
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getStatusBarHeight(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = { statusBarHeight: 0 };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取对应区服的角色信息
   * @since Beta v0.8.4
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getRegionRoleInfo(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetRegionRoleInfoPayload>,
  ): Promise<void> {
    const user = useUserStore();
    const data = {
      region: user.account.region,
      game_uid: user.account.gameUid,
      nickname: user.account.nickname,
      user_label: user.account.nickname,
      region_name: user.account.regionName,
    };
    await this.callback(arg.callback, data);
  }

  /**
   * 获取米游社客户端的用户信息
   * @since Beta v0.3.9
   * @param arg - 类型参数
   * @returns 无返回值
   */
  async getUserInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const user = useUserStore();
    if (!user.cookie) return;
    const userInfo = await bbsReq.userInfo(user.cookie);
    if ("retcode" in userInfo) {
      console.error(`[${arg.callback}] ${userInfo.message}`);
      return;
    }
    await this.callback(arg.callback, userInfo);
  }

  /**
   * 点击图片，下载到本地
   * @since Beta v0.5.0
   * @param arg - 方法参数
   * @returns 无返回值
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
   * 打开应用
   * @since Beta v0.5.5
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async openApplication(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenApplicationPayload>,
  ): Promise<void> {
    console.log(`[openApplication] ${JSON.stringify(arg.payload)}`);
    const appWindow = await webviewWindow.WebviewWindow.getByLabel("TeyvatGuide");
    await appWindow?.setFocus();
    showSnackbar.error(`不支持的操作：OpenApplication(${JSON.stringify(arg.payload)})`);
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    const windowFind = await webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) await windowFind.setFocus();
  }

  /**
   * 打开系统浏览器
   * @since Beta v0.6.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async openSystemBrowser(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.OpenSystemBrowserPayload>,
  ): Promise<void> {
    console.log(`[openSystemBrowser] ${JSON.stringify(arg)}`);
    const url = arg.payload.open_url;
    await openUrl(url);
  }

  /**
   * 打开米游社客户端的页面
   * @since Beta v0.5.5
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async pushPage(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.PushPagePayload>,
  ): Promise<void> {
    const res = await parseLink(arg.payload.page, true);
    if (!res) {
      const appWindow = await webviewWindow.WebviewWindow.getByLabel("TeyvatGuide");
      if (appWindow != null) {
        await appWindow.setFocus();
      }
      showSnackbar.error(`未知链接:${arg.payload.page}`, 3000);
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
      const windowFind = await webviewWindow.WebviewWindow.getByLabel("mhy_client");
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
    const windowFind = await webviewWindow.WebviewWindow.getByLabel("mhy_client");
    if (windowFind !== null) {
      await windowFind.show();
      await windowFind.setFocus();
    }
  }

  /**
   * 设置米游社客户端的展示方式
   * @since Beta v0.3.9
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async setPresentationStyle(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SetPresentationStylePayload>,
  ): Promise<void> {
    console.log(`[setPresentationStyle] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({ method: arg.method, payload: null, callback: arg.callback });
  }

  /**
   * 分享
   * @since Beta v0.5.1
   * @param arg - 方法参数
   * @returns 无返回值
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
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await this.callback(arg.callback, {});
  }
}

const TGClient = Client.getInstance();

export default TGClient;
