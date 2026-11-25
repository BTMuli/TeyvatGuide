/**
 * 负责米游社客户端的 callback 处理
 * @since Beta v0.14.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import bbsReq from "@req/bbsReq.js";
import OtherApi from "@req/otherReq.js";
import passportReq from "@req/passportReq.js";
import takumiReq from "@req/takumiReq.js";
import TSUserAccount from "@Sqlm/userAccount.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import { core, event, webviewWindow } from "@tauri-apps/api";
import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getWebAccountCookies } from "@utils/account/accountCookie.js";
import { isRecord } from "@utils/common/typeGuards.js";
import { getDS4JS } from "@utils/network/getRequestHeader.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { v4 } from "uuid";

import TGBbs from "../bbs/TGBbs.js";
import { getDeviceInfo } from "../common/toolFunc.js";

import { parseLink } from "./linkParser.js";
import { createPost } from "./TGWindow.js";

/**
 * 一次打开请求绑定的账号与网页凭据快照。
 * @since Beta v0.14.1
 */
type ClientSession = {
  sessionId: string;
  accountId: string | undefined;
  webCookies: ReturnType<typeof getWebAccountCookies> | undefined;
};

/**
 * 内部回调目标，携带宿主验证后的会话标识。
 * @since Beta v0.14.1
 */
type ClientCallback =
  string | Pick<TGApp.Plugins.JSBridge.Arg<unknown>, "callback" | "sessionId"> | undefined;

class Client {
  private listener: UnlistenFn | undefined;
  private openQueue: Promise<void> = Promise.resolve();
  private pendingOpen: { func: string; url: string; session: ClientSession } | undefined;
  private activeSession: ClientSession | undefined;
  private route: Array<string> = [];

  private constructor() {
    this.route = [];
    this.listener = undefined;
    this.pendingOpen = undefined;
  }

  private static instance: Client | null = null;

  static getInstance(): Client {
    if (this.instance === null) this.instance = new Client();
    return this.instance;
  }

  /**
   * 运行米游社客户端
   * @since Beta v0.13.0
   * @returns Promise<void>
   */
  async run(): Promise<void> {
    if (this.listener === undefined) {
      this.listener = await event.listen<string>("post_mhy_client", async (arg: Event<string>) => {
        try {
          await this.handleCallback(arg);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message !== "未找到窗口：mhy_client") throw error;
          await TGLogger.Warn("[TGClient][run] 米游社窗口已关闭，取消未完成的桥接回调", false);
        }
      });
    } else {
      console.warn("[TGClient][run] 监听器已存在");
    }
  }

  /**
   * 回调函数
   * @since Beta v0.14.1
   * @param callback - 回调函数名或带会话信息的请求
   * @param data - 回调数据
   * @param retcode - 桥接响应码
   * @param message - 桥接响应消息
   * @returns 无返回值
   */
  async callback(
    callback: ClientCallback,
    data: object | null,
    retcode: number = 0,
    message: string = "success",
  ): Promise<void> {
    const call = this.getCallbackJS(callback, data, retcode, message);
    if (!call) return;
    const callbackName = typeof callback === "object" ? callback.callback : callback;
    console.info(`[callback] ${callbackName}: ${retcode}`);
    await core.invoke("execute_js", { label: "mhy_client", js: `javascript:${call}` });
  }

  /**
   * 生成受页面会话约束的回调脚本。
   * @since Beta v0.14.1
   * @param target - 回调目标
   * @param data - 回调数据
   * @param retcode - 响应码
   * @param message - 响应消息
   * @returns 无目标时为空字符串
   */
  private getCallbackJS(
    target: ClientCallback,
    data: object | null,
    retcode: number = 0,
    message: string = "success",
  ): string {
    if (typeof target === "object" && !this.isSessionActive(target)) return "";
    const callback = typeof target === "object" ? target.callback : target;
    if (!callback) return "";
    const response = { retcode, message, data };
    const call = `mhyWebBridge(${JSON.stringify(callback)}, ${JSON.stringify(response)});`;
    if (typeof target !== "object" || target.sessionId === undefined) return call;
    return `if(window.__teyvatSessionId === ${JSON.stringify(target.sessionId)} && window === window.top && window.location.protocol === 'https:' && ['mihoyo.com', 'miyoushe.com'].some(domain => window.location.hostname === domain || window.location.hostname.endsWith('.' + domain))){${call}}`;
  }

  /**
   * 只为仍绑定当前登录账号的桥接请求提供凭据。
   * @since Beta v0.14.1
   * @param arg - 已验证会话的请求；内部调用可不携带会话
   * @returns 当前账号 Cookie，失效会话返回 undefined
   */
  private getAccountCookie(
    arg: TGApp.Plugins.JSBridge.Arg<unknown>,
  ): TGApp.App.Account.Cookie | undefined {
    const user = useUserStore();
    if (!this.isSessionActive(arg)) return undefined;
    return user.cookie;
  }

  /**
   * 检查请求所属页面是否仍绑定当前账号。
   * @since Beta v0.14.1
   * @param arg - 宿主附加的会话标识
   * @returns 内部调用或当前有效页面返回 true
   */
  private isSessionActive(arg: Pick<TGApp.Plugins.JSBridge.Arg<unknown>, "sessionId">): boolean {
    if (arg.sessionId === undefined) return true;
    const session = this.activeSession;
    if (session?.sessionId !== arg.sessionId) return false;
    const user = useUserStore();
    if (session.accountId === undefined) return user.uid === undefined && user.cookie === undefined;
    return session.accountId === user.uid && user.cookie?.account_id_v2 === session.accountId;
  }

  /**
   * 异步操作后复查账号、凭据版本和会话是否保持一致。
   * @since Beta v0.14.1
   * @param arg - 桥接请求
   * @param cookie - 操作前捕获的凭据
   * @returns 是否可继续写入或回复
   */
  private isCurrentCookie(
    arg: TGApp.Plugins.JSBridge.Arg<unknown>,
    cookie: TGApp.App.Account.Cookie,
  ): boolean {
    return this.getAccountCookie(arg) === cookie;
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
   * @since Beta v0.14.1
   * @param arg - 事件参数
   * @returns - 返回值
   */
  async handleCallback(arg: Event<string>): Promise<void> {
    let payload: unknown;
    try {
      payload = JSON.parse(arg.payload);
    } catch {
      return;
    }
    if (!isRecord(payload)) return;
    let request = payload;
    let sessionId: string | undefined;
    if ("request" in payload) {
      if (
        !this.activeSession ||
        typeof payload.sessionId !== "string" ||
        payload.sessionId === "" ||
        payload.sessionId !== this.activeSession.sessionId ||
        !isRecord(payload.request)
      )
        return;
      sessionId = payload.sessionId;
      request = payload.request;
    }
    if (typeof request.method !== "string") return;
    const argParse: TGApp.Plugins.JSBridge.Arg<unknown> = {
      method: request.method,
      payload: request.payload,
      callback: typeof request.callback === "string" ? request.callback : undefined,
      sessionId,
    };
    if (sessionId === undefined) {
      if (!argParse.method.startsWith("teyvat")) {
        if (this.activeSession !== undefined) return;
        if (
          [
            "genAuthKey",
            "getActionTicket",
            "getCookieInfo",
            "getCookieToken",
            "getUserInfo",
            "getRegionRoleInfo",
            "login",
          ].includes(argParse.method)
        )
          return;
      }
    }
    if (!this.isSessionActive(argParse)) return;
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
    if (!this.isSessionActive(argParse)) return;
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
          <TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload | null>>argParse,
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
        await this.callback(argParse, {}, 404, `不支持的桥接方法：${argParse.method}`);
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
   * @since Beta v0.14.1
   * @returns 无返回值
   */
  async loadJSBridge(): Promise<void> {
    const sessionId = this.activeSession?.sessionId;
    if (sessionId === undefined) return;
    const executeJS = `javascript:(function() {
      const host = window.location.hostname;
      if (window !== window.top || window.location.protocol !== 'https:' ||
        !['mihoyo.com', 'miyoushe.com'].some(domain => host === domain || host.endsWith('.' + domain))) return;
      if(window.MiHoYoJSInterface) return;
      if(window.__teyvatSessionId !== ${JSON.stringify(sessionId)}) return;
      window.MiHoYoJSInterface = {
        postMessage: function(arg) {
          const request = typeof arg === 'string' ? JSON.parse(arg) : arg;
          window.__TAURI__.event.emit('post_mhy_client', JSON.stringify({sessionId: ${JSON.stringify(sessionId)}, request}));
        },
        closePage: function() { this.postMessage('{"method":"closePage"}') },
      };
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * 空回调函数
   * @since Beta v0.14.1
   * @param arg - 回调参数
   * @returns 无返回值
   */
  async nullCallback(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    await this.callback(arg, {});
  }

  /**
   * 打开米游社客户端
   * @since Beta v0.14.1
   * @param func - 方法名
   * @param url - url
   * @returns 无返回值
   */
  async open(func: string, url?: string): Promise<void> {
    const targetUrl = url ?? this.getUrl(func);
    const user = useUserStore();
    const cookie = user.cookie;
    if (cookie && cookie.account_id_v2 !== user.uid)
      throw new Error("当前登录账号状态不一致，请重新选择账号");
    const session: ClientSession = {
      sessionId: v4(),
      accountId: user.uid,
      webCookies: cookie ? { ...getWebAccountCookies(cookie) } : undefined,
    };
    this.pendingOpen = { func, url: targetUrl, session };
    const currentOpen = this.openQueue
      .catch(() => undefined)
      .then(async () => {
        const pendingOpen = this.pendingOpen;
        if (pendingOpen === undefined) return;
        this.pendingOpen = undefined;
        await this.openClient(pendingOpen.func, pendingOpen.url, pendingOpen.session);
      });
    this.openQueue = currentOpen;
    return currentOpen;
  }

  /**
   * 串行创建米游社客户端窗口
   * @since Beta v0.14.1
   * @param func - 功能名
   * @param url - 客户端地址
   * @param session - 与地址一同捕获的账号快照
   * @returns 无返回值
   */
  private async openClient(func: string, url: string, session: ClientSession): Promise<void> {
    await TGLogger.Info(`[TGClient][open][${func}] ${url}`);
    try {
      this.activeSession = session;
      await core.invoke<void>("create_mhy_client", {
        func,
        url,
        sessionId: session.sessionId,
        cookies: session.webCookies ?? null,
      });
      this.route = [url];
    } catch (error) {
      if (this.activeSession?.sessionId === session.sessionId) this.activeSession = undefined;
      const message = error instanceof Error ? error.message : String(error);
      showSnackbar.error(`打开米游社失败，请关闭后重试：${message}`, 5000);
      await TGLogger.Error(`[TGClient][open][${func}] 打开米游社失败：${message}`);
      throw error;
    }
  }

  /* JSBridge 回调处理 */
  /**
   * 关闭米游社客户端的页面
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async closePage(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    this.route.pop();
    if (this.route.length === 0) {
      const closeTask = this.openQueue
        .catch(() => undefined)
        .then(async () => {
          if (!this.isSessionActive(arg)) return;
          await core.invoke<void>("destroy_window", { label: "mhy_client" });
          this.route = [];
          if (arg.sessionId === undefined || this.activeSession?.sessionId === arg.sessionId) {
            this.activeSession = undefined;
          }
        });
      this.openQueue = closeTask;
      await closeTask;
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
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async configShare(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.ConfigSharePayload>,
  ): Promise<void> {
    console.log(`[configShare] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({
      method: arg.method,
      payload: null,
      callback: arg.callback,
      sessionId: arg.sessionId,
    });
  }

  /**
   * 事件跟踪
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async eventTrack(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.EventTrackPayload>,
  ): Promise<void> {
    console.log(`[eventTrack] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({
      method: arg.method,
      payload: null,
      callback: arg.callback,
      sessionId: arg.sessionId,
    });
  }

  /**
   * 获取米游社客户端的 authkey
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async genAuthKey(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GenAuthkeyPayload>,
  ): Promise<void> {
    const accountCookie = this.getAccountCookie(arg);
    if (!accountCookie) {
      await this.callback(arg, {}, -100, "未登录");
      return;
    }
    const cookie = { mid: accountCookie.mid, stoken: accountCookie.stoken };
    let res: TGApp.BBS.Auth.AuthKeyResp | undefined;
    try {
      res = await takumiReq.bind.authKey2(cookie, arg.payload);
      if (!this.isCurrentCookie(arg, accountCookie)) return;
      if (res.retcode !== 0) {
        await TGLogger.Warn(`[TGClient][genAuthKey] 业务错误：[${res.retcode}] ${res.message}`);
      }
    } catch (e) {
      if (!this.isCurrentCookie(arg, accountCookie)) return;
      const errMsg = TGHttps.getErrMsg(e);
      await TGLogger.Error(`[TGClient][genAuthKey] 网络错误：${errMsg}`);
      await TGLogger.Error(`[TGClient][genAuthKey] ${e}`);
      await this.callback(arg, {}, 500, errMsg);
      return;
    }
    await this.callback(arg, res.data, res.retcode, res.message);
  }

  /**
   * 获取米游社客户端的 action_ticket
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getActionTicket(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetActionTicketPayload>,
  ): Promise<void> {
    const userStore = useUserStore();
    const cookie = this.getAccountCookie(arg);
    if (!cookie) {
      await this.callback(arg, {}, -100, "未登录");
      return;
    }
    let actionTicket: TGApp.BBS.Auth.ActionTicketResp | undefined;
    try {
      actionTicket = await takumiReq.auth.actionTicket(
        cookie,
        userStore.account,
        arg.payload.action_type,
      );
      if (!this.isCurrentCookie(arg, cookie)) return;
      if (actionTicket.retcode !== 0) {
        await TGLogger.Warn(
          `[TGClient][getActionTicket] 业务错误：[${actionTicket.retcode}] ${actionTicket.message}`,
        );
      }
    } catch (e) {
      if (!this.isCurrentCookie(arg, cookie)) return;
      const errMsg = TGHttps.getErrMsg(e);
      await TGLogger.Error(`[TGClient][getActionTicket] 网络错误：${errMsg}`);
      await TGLogger.Error(`[TGClient][getActionTicket] ${e}`);
      await this.callback(arg, {}, 500, errMsg);
      return;
    }
    await this.callback(arg, actionTicket.data, actionTicket.retcode, actionTicket.message);
  }

  /**
   * 写入米游社网页使用的 V2 Cookie。
   * @since Beta v0.14.1
   * @param cookie - 当前账号的 Cookie
   * @param sessionId - 页面会话标识
   * @returns 无返回值
   */
  private async setWebAccountCookies(
    cookie: TGApp.App.Account.Cookie,
    sessionId?: string,
  ): Promise<void> {
    const fields = getWebAccountCookies(cookie);
    const js = `javascript:(function(){
    const host = window.location.hostname;
    if (window !== window.top || window.location.protocol !== 'https:') return;
    ${sessionId === undefined ? "" : `if(window.__teyvatSessionId !== ${JSON.stringify(sessionId)}) return;`}
    const domain = ['mihoyo.com', 'miyoushe.com'].find(domain => host === domain || host.endsWith('.' + domain));
    if (!domain) return;
    for (const [key, value] of Object.entries(${JSON.stringify(fields)})) {
      document.cookie = key + '=' + value + '; domain=.' + domain + '; path=/; Secure;';
    }
    })();`;
    await core.invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * 获取米游社客户端的 Cookie。
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getCookieInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const cookie = this.getAccountCookie(arg);
    if (!cookie) {
      await this.callback(arg, {}, -100, "未登录");
      return;
    }
    await this.setWebAccountCookies(cookie, arg.sessionId);
    if (!this.isCurrentCookie(arg, cookie)) return;
    // APK 2.119.0 的桥接协议保留旧字段名；网页 Cookie 使用上面写入的完整 V2 字段。
    const data = { ltoken: cookie.ltoken_v2, ltuid: cookie.ltuid_v2, login_ticket: "" };
    await this.callback(arg, data);
  }

  /**
   * 获取米游社客户端的 cookie_token_v2
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getCookieToken(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetCookieTokenPayload | null>,
  ): Promise<void> {
    const cookie = this.getAccountCookie(arg);
    if (!cookie) {
      await this.callback(arg, { cookie_token: "" }, -100, "未登录");
      return;
    }
    if (arg.payload?.forceRefresh || !cookie.cookie_token_v2) {
      let res: TGApp.BBS.Passport.CookieTokenResp;
      try {
        res = await passportReq.cookieToken(cookie);
        if (this.isCurrentCookie(arg, cookie) && res.retcode === 0) {
          const nextCookie = { ...cookie, cookie_token_v2: res.data.cookie_token_v2 };
          await TSUserAccount.account.saveCookie(cookie.account_id_v2, nextCookie);
          if (!this.isCurrentCookie(arg, cookie)) return;
          cookie.cookie_token_v2 = nextCookie.cookie_token_v2;
          if (arg.sessionId === this.activeSession?.sessionId && this.activeSession) {
            this.activeSession.webCookies = getWebAccountCookies(cookie);
          }
        }
      } catch (e) {
        const errMsg = TGHttps.getErrMsg(e);
        await TGLogger.Error(`[TGClient][getCookieToken] 获取 CookieToken V2 异常：${errMsg}`);
        await this.callback(arg, { cookie_token: "" }, 500, errMsg);
        return;
      }
      if (!this.isCurrentCookie(arg, cookie)) {
        await this.callback(arg, { cookie_token: "" }, -100, "登录账号已变更，请重试");
        return;
      }
      if (res.retcode !== 0) {
        await TGLogger.Warn(`[TGClient][getCookieToken] ${res.retcode}: ${res.message}`);
        await this.callback(arg, { cookie_token: "" }, res.retcode, res.message);
        return;
      }
    }
    await this.setWebAccountCookies(cookie, arg.sessionId);
    if (!this.isCurrentCookie(arg, cookie)) return;
    // cookie_token 是 APK 桥接的兼容字段名，值仍来自 V2 凭据。
    const data = { cookie_token: cookie.cookie_token_v2 };
    await this.callback(arg, data);
  }

  /**
   * 获取米游社客户端的 DS 参数
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getDS(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = { DS: getDS4JS("LK2", 1) };
    await this.callback(arg, data);
  }

  /**
   * 获取米游社客户端的 DS 参数
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getDS2(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetDS2Payload>,
  ): Promise<void> {
    const data = {
      DS: getDS4JS("X4", 2, arg.payload.body, arg.payload.query),
    };
    await this.callback(arg, data);
  }

  /**
   * 获取米游社客户端的 HTTP 请求头
   * @since Beta v0.14.1
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
      "x-rpc-sys_version": "12",
      "x-rpc-channel": "beta",
      "x-rpc-device_name": deviceInfo.device_name,
      "x-rpc-device_model": deviceInfo.product,
      Referer: "https://app.mihoyo.com",
    };
    await this.callback(arg, data);
  }

  /**
   * 获取状态栏高度
   * @since Beta v0.14.1
   * @param arg - 请求参数
   * @returns 无返回值
   */
  async getStatusBarHeight(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const data = { statusBarHeight: 0 };
    await this.callback(arg, data);
  }

  /**
   * 获取对应区服的角色信息
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async getRegionRoleInfo(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.GetRegionRoleInfoPayload>,
  ): Promise<void> {
    const user = useUserStore();
    if (!this.getAccountCookie(arg)) {
      await this.callback(arg, {}, -100, "未登录");
      return;
    }
    const data = {
      game_biz: user.account.gameBiz,
      region: user.account.region,
      game_uid: user.account.gameUid,
      nickname: user.account.nickname,
      user_label: user.account.nickname,
      region_name: user.account.regionName,
      level: Number(user.account.level),
      is_chosen: user.account.isChosen === 1,
      is_official: user.account.isOfficial === 1,
      aid: user.account.uid,
    };
    await this.callback(arg, data);
  }

  /**
   * 获取米游社客户端的用户信息
   * @since Beta v0.14.1
   * @param arg - 类型参数
   * @returns 无返回值
   */
  async getUserInfo(arg: TGApp.Plugins.JSBridge.NullArg): Promise<void> {
    const cookie = this.getAccountCookie(arg);
    if (!cookie) {
      await this.callback(arg, {}, -100, "未登录");
      return;
    }
    let userInfo: TGApp.BBS.User.InfoResp | undefined;
    try {
      userInfo = await bbsReq.userInfo(cookie);
      if (!this.isCurrentCookie(arg, cookie)) return;
    } catch (e) {
      if (!this.isCurrentCookie(arg, cookie)) return;
      const errMsg = TGHttps.getErrMsg(e);
      console.error(`[${arg.callback}] ${errMsg}`);
      await this.callback(arg, {}, 500, errMsg);
      return;
    }
    if (userInfo.retcode !== 0) {
      console.error(`[${arg.callback}] ${userInfo.message}`);
      await this.callback(arg, userInfo.data, userInfo.retcode, userInfo.message);
      return;
    }
    // APK 使用 id；保留已有 uid 等字段供旧网页兼容。
    await this.callback(arg, {
      ...userInfo.data.user_info,
      id: userInfo.data.user_info.uid,
    });
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
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async pushPage(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.PushPagePayload>,
  ): Promise<void> {
    const res = await parseLink(arg.payload.page, true);
    if (!this.isSessionActive(arg)) return;
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
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async setPresentationStyle(
    arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SetPresentationStylePayload>,
  ): Promise<void> {
    console.log(`[setPresentationStyle] ${JSON.stringify(arg.payload)}`);
    await this.loadJSBridge();
    await this.nullCallback({
      method: arg.method,
      payload: null,
      callback: arg.callback,
      sessionId: arg.sessionId,
    });
  }

  /**
   * 分享
   * @since Beta v0.14.1
   * @param arg - 方法参数
   * @returns 无返回值
   */
  async share(arg: TGApp.Plugins.JSBridge.Arg<TGApp.Plugins.JSBridge.SharePayload>): Promise<void> {
    const callbackData = arg.payload.type === "screenshot" ? { type: "screenshot" } : {};
    const callbackJS = this.getCallbackJS(arg, callbackData);
    if (arg.payload.type === "default") {
      const image = arg.payload.content.image_url;
      const format = image.split(".").pop();
      const executeJS = this.getSaveImgJS(image, format ?? "png");
      await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
      await this.callback(arg, {});
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
        ${callbackJS}
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
        await this.callback(arg, {});
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
          ${callbackJS}
        })();`;
        await core.invoke("execute_js", { label: "mhy_client", js: executeJS });
        return;
      }
    }
    console.warn("[share]", arg.payload);
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await this.callback(arg, {});
  }
}

const TGClient = Client.getInstance();

export default TGClient;
