/**
 * @file utils/TGClient.ts
 * @desc 负责米游社客户端的 callback 处理
 * @since Beta v0.3.8
 */

import { event, invoke } from "@tauri-apps/api";
import type { Event } from "@tauri-apps/api/event";
import { appWindow, WebviewWindow } from "@tauri-apps/api/window";

import { parseLink } from "./linkParser";
import { getDeviceInfo } from "./toolFunc";
import showSnackbar from "../components/func/snackbar";
import { useAppStore } from "../store/modules/app";
import { useUserStore } from "../store/modules/user";
import TGConstant from "../web/constant/TGConstant";
import TGRequest from "../web/request/TGRequest";
import { getDS4JS } from "../web/utils/getRequestHeader";

// 正常 arg 参数
interface NormalArg {
  method: string;
  payload: any;
  callback: string;
}

// invoke 参数
interface InvokeArg {
  func: string;
}

/**
 * @class TGClient
 * @since Beta v0.3.8
 * @description 米游社客户端
 */
class TGClient {
  /**
   * @private 监听实例
   * @since Beta v0.3.3
   * @type {EventEmitter}
   * @memberof TGClient
   */
  private listener: any;

  /**
   * @private 窗口实例
   * @since Beta v0.3.4
   * @type {WebviewWindow}
   * @memberof TGClient
   */
  private window: WebviewWindow | null;

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
    try {
      this.window = WebviewWindow.getByLabel("mhy_client");
    } catch (error) {
      this.window = null;
    }
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
    }
  }

  /**
   * @func loadJSBridge
   * @since Beta v0.3.8
   * @desc 加载 JSBridge
   * @returns {void} - 无返回值
   */
  async loadJSBridge(): Promise<void> {
    const executeJS = `javascript:(function() {
      if(window.MiHoYoJSBridge) return;
      window.MiHoYoJSInterface = {
        postMessage: function(arg) { window.__TAURI__.event.emit('post_mhy_client', arg) },
        closePage: function() { this.postMessage('{"method":"closePage"}') },
      };
    })();`;
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func hideSideBar
   * @since Beta v0.3.5
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
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func hideOverlay
   * @since Beta v0.3.7
   * @desc 隐藏遮罩
   * @returns {void}
   */
  async hideOverlay(): Promise<void> {
    const executeJS = `javascript:(function(){
      if (document.getElementById('mihoyo_landscape') !== null) {
        let box = document.getElementById('mihoyo_landscape');
        box.remove();
      }
    })();`;
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func getUrl
   * @since Beta v0.3.6
   * @desc 获取 url
   * @param {string} func - 方法名
   * @returns {string} - url
   */
  getUrl(func: string): string {
    switch (func) {
      case "sign_in":
        return "https://webstatic.mihoyo.com/bbs/event/signin-ys/index.html?act_id=e202009291139501";
      case "game_record":
        return "https://webstatic.mihoyo.com/app/community-game-records/index.html?bbs_presentation_style=fullscreen";
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
   * @func open
   * @since Beta v0.3.7
   * @desc 打开米游社客户端
   * @param {string} func - 方法名
   * @param {string} url - url
   * @returns {void} - 无返回值
   */
  async open(func: string, url?: string): Promise<void> {
    if (this.window !== null) {
      try {
        await this.window.close();
      } catch (e) {
        console.error(e);
        await invoke<InvokeArg>("create_mhy_client", {
          func: "default",
          url: "https://api-static.mihoyo.com/",
        });
        await this.open(func, url);
      }
    }
    if (url === undefined) url = this.getUrl(func);
    this.route = [url];
    console.log(`[open] ${url}`);
    await invoke<InvokeArg>("create_mhy_client", { func, url });
    this.window = WebviewWindow.getByLabel("mhy_client");
    await this.window?.show();
    await this.window?.setFocus();
  }

  /**
   * @func handleCallback
   * @since Beta v0.3.8
   * @desc 处理米游社客户端的 callback
   * @param {Event<string>} arg - 事件参数
   * @returns {any} - 返回值
   */
  async handleCallback(arg: Event<string>): Promise<any> {
    console.log(`[${arg.windowLabel}] ${arg.payload}`);
    await this.hideSideBar();
    await this.hideOverlay();
    const { method, payload, callback } = <NormalArg>JSON.parse(arg.payload);
    switch (method) {
      case "closePage":
        await this.closePage();
        break;
      case "configure_share":
        break;
      case "eventTrack":
        await this.eventTrack(payload);
        break;
      case "getStatusBarHeight":
        await this.getStatusBarHeight(callback);
        break;
      case "genAuthKey":
        await this.genAuthKey(payload, callback);
        break;
      case "getCookieInfo":
        await this.getCookieInfo(payload, callback);
        break;
      case "getCookieToken":
        await this.getCookieToken(callback);
        break;
      case "getActionTicket":
        await this.getActionTicket(payload, callback);
        break;
      case "getHTTPRequestHeaders":
        await this.getHTTPRequestHeaders(callback);
        break;
      case "getDS":
        await this.getDS(1, callback, payload);
        break;
      case "getDS2":
        await this.getDS(2, callback, payload);
        break;
      case "getUserInfo":
        await this.getUserInfo(callback);
        break;
      case "login":
        await this.nullCallback(arg);
        break;
      case "onBeginDragging":
        await this.nullCallback(arg);
        break;
      case "onClickImg":
        await this.onClickImg(payload);
        break;
      case "openApplication":
        await this.openApplication(payload);
        break;
      case "pushPage":
        await this.pushPage(payload);
        break;
      case "share":
        await this.share(payload, callback);
        break;
      case "share2":
        await this.nullCallback(arg);
        break;
      default:
        console.warn(`[${arg.windowLabel}] ${arg.payload}`);
    }
  }

  /**
   * @func callback
   * @since Beta v0.3.4
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
    await invoke("create_mhy_client", { func: "execute_js", url: "" });
    await invoke("execute_js", { label: "mhy_client", js });
  }

  /**
   * @func getStatusBarHeight
   * @since Beta v0.3.4
   * @desc 获取状态栏高度
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getStatusBarHeight(callback: string): Promise<void> {
    const data = {
      statusBarHeight: 0,
    };
    await this.callback(callback, data);
  }

  /**
   * @func genAuthKey
   * @since Beta v0.3.7
   * @desc 获取米游社客户端的 authkey
   * @param {Record<string, string>} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async genAuthKey(payload: Record<string, string>, callback: string): Promise<void> {
    const userStore = useUserStore();
    const cookie = {
      mid: userStore.cookie.mid,
      stoken: userStore.cookie.stoken,
    };
    const res = await TGRequest.User.getAuthkey2(cookie, payload);
    await this.callback(callback, res.data);
  }

  /**
   * @func getCookieInfo
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 cookie
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getCookieInfo(payload: unknown, callback: string): Promise<void> {
    const user = useUserStore();
    const data = {
      ltoken: user.cookie.ltoken,
      ltuid: user.cookie.ltuid,
      login_ticket: "",
    };
    await this.callback(callback, data);
  }

  /**
   * @func getCookieToken
   * @since Beta v0.3.4
   * @todo 待完善
   * @desc 获取米游社客户端的 cookie_token
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getCookieToken(callback: string): Promise<void> {
    const user = useUserStore();
    const executeJS =
      "javascript:(function(){" +
      `document.cookie = "account_id=${user.cookie.account_id};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "cookie_token=${user.cookie.cookie_token};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "ltoken=${user.cookie.ltoken};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "ltuid=${user.cookie.ltuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "stuid=${user.cookie.stuid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "stoken=${user.cookie.stoken};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      `document.cookie = "mid=${user.cookie.mid};domain=.mihoyo.com;path=/;expires=Fri, 31 Dec 9999 23:59:59 GMT;";` +
      "})();";
    console.info(`[getCookieToken] ${executeJS}`);
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
    // callback
    const data = {
      cookie_token: user.cookie.cookie_token,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getActionTicket
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 action_ticket\
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getActionTicket(payload: any, callback: string): Promise<void> {
    const actionType = payload.action_type;
    const user = useUserStore();
    const uid = user.getCurAccount().gameUid;
    const mid = user.cookie.mid;
    const stoken = user.cookie.stoken;
    const ActionTicket = await TGRequest.User.bySToken.getActionTicket(
      actionType,
      stoken,
      mid,
      uid,
    );
    await this.callback(callback, ActionTicket.data);
  }

  /**
   * @func getHTTPRequestHeaders
   * @since Beta v0.3.6
   * @desc 获取米游社客户端的 HTTP 请求头
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getHTTPRequestHeaders(callback: string): Promise<void> {
    const localFp = getDeviceInfo("device_fp");
    let deviceInfo = useAppStore().deviceInfo;
    if (localFp === "0000000000000") {
      deviceInfo = await TGRequest.Device.getFp(deviceInfo);
    }
    const data = {
      "user-agent": TGConstant.BBS.UA_MOBILE,
      "x-rpc-client_type": "5",
      "x-rpc-device_id": deviceInfo.device_id,
      "x-rpc-app_version": TGConstant.BBS.VERSION,
      "x-rpc-device_fp": deviceInfo.device_fp,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getDS
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的 DS 参数
   * @param {number} dsType - DS 类型
   * @param {string} callback - 回调函数名
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async getDS(dsType: 1, callback: string, payload: undefined): Promise<void>;
  async getDS(dsType: 2, callback: string, payload: any): Promise<void>;
  async getDS(dsType: 1 | 2, callback: string, payload?: any): Promise<void> {
    const saltType = dsType === 1 ? "lk2" : "common";
    let ds: string;
    if (dsType === 2) {
      const { body, query } = payload;
      ds = getDS4JS(saltType, dsType, body, query);
    } else {
      ds = getDS4JS(saltType, dsType, undefined, undefined);
    }
    const data = {
      DS: ds,
    };
    await this.callback(callback, data);
  }

  /**
   * @func getUserInfo
   * @since Beta v0.3.4
   * @desc 获取米游社客户端的用户信息
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async getUserInfo(callback: string): Promise<void> {
    const user = useUserStore();
    const cookieToken = user.cookie.cookie_token;
    const accountId = user.cookie.account_id;
    const userInfo = await TGRequest.User.byCookie.getUserInfo(cookieToken, accountId);
    if ("retcode" in userInfo) {
      console.error(`[${callback}] ${userInfo.message}`);
      return;
    }
    await this.callback(callback, userInfo);
  }

  /**
   * @func pushPage
   * @since Beta v0.3.8
   * @desc 打开米游社客户端的页面
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async pushPage(payload: any): Promise<void> {
    const url = payload.page;
    const res = await parseLink(url, true);
    if (!res) {
      await appWindow.setFocus();
      showSnackbar({
        text: `未知链接:${url}`,
        color: "error",
        timeout: 3000,
      });
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 3000);
      });
      await this.window?.setFocus();
      return;
    }
    if (typeof res !== "string") return;
    this.route.push(res);
    console.log(`[pushPage] ${res}`);
    const executeJS = `javascript:(function(){
      window.location.href = '${res}';
    })();`;
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
    await this.loadJSBridge();
    await this.hideSideBar();
    await this.hideOverlay();
    await this.window?.setFocus();
  }

  /**
   * @func closePage
   * @since Beta v0.3.7
   * @desc 关闭米游社客户端的页面
   * @returns {void} - 无返回值
   */
  async closePage(): Promise<void> {
    this.route.pop();
    if (this.route.length === 0) {
      await this.window?.close();
      return;
    }
    const url = this.route[this.route.length - 1];
    const executeJS = `javascript:(function(){
      window.location.href = '${url}';
    })();`;
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
    await this.loadJSBridge();
  }

  /**
   * @func nullCallback
   * @since Beta v0.3.4
   * @desc 空回调函数
   * @param {Event<string>} arg - 回调参数
   * @returns {void} - 无返回值
   */
  async nullCallback(arg: Event<string>): Promise<void> {
    const { callback } = <NormalArg>JSON.parse(arg.payload);
    await this.callback(callback, {});
  }

  /**
   * @func onClickImg
   * @since Beta v0.3.7
   * @desc 点击图片，下载到本地
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async onClickImg(payload: any): Promise<void> {
    const image = payload.image_list[0];
    const executeJS = this.getSaveImgJS(image.url, image.format);
    await invoke("execute_js", { label: "mhy_client", js: executeJS });
  }

  /**
   * @func getSaveImgJS
   * @since Beta v0.3.7
   * @desc 获取保存图片的 JS
   * @param {string} url - 图片链接
   * @param {string} format - 图片格式
   * @returns {string} - JS
   */
  getSaveImgJS(url: string, format: string): string {
    return `javascript:(async function() {
      const _t = window.__TAURI__;
      const defaultPath = await _t.path.downloadDir() + Date.now() + '.${format}';
      const savePath = await _t.dialog.save({
        title: '保存图片',
        filters: [{ name: '图片', extensions: ['png'] }],
        defaultPath: defaultPath,
      });
      if (savePath) {
        const resBlob = await _t.http.fetch('${url}',{
          method: 'GET',
          responseType: _t.http.ResponseType.Binary
        });
        const buffer = new Uint8Array(resBlob.data);
        await _t.fs.writeBinaryFile({
          contents: buffer,
          path: savePath,
        });
        alert('保存成功');
      }
    })();`;
  }

  /**
   * @func share
   * @since Beta v0.3.8
   * @desc 分享
   * @param {unknown} payload - 请求参数
   * @param {string} callback - 回调函数名
   * @returns {void} - 无返回值
   */
  async share(payload: any, callback: string): Promise<void> {
    // 如果有数据
    if (payload?.content.image_url !== undefined) {
      const image = payload.content.image_url;
      const format = image.split(".").pop();
      const executeJS = this.getSaveImgJS(image, format);
      await invoke("execute_js", { label: "mhy_client", js: executeJS });
      await this.callback(callback, {});
      return;
    }
    if (payload?.type === "screenshot") {
      const executeJS = `javascript:(async function() {
        // 查找 id 为 dom2img 的 script
        var hasDom2img = false;
        var scripts = document.querySelectorAll('script');
        for (var i = 0; i < scripts.length; i++) {
          if (scripts[i].src === 'https://cdn.bootcdn.net/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js') {
            hasDom2img = true;
            break;
          }
        }
        // 如果没有 dom2img 的 js
        if (!hasDom2img) {
          // 添加 dom2img 的 js
          var script = document.createElement('script');
          script.src = 'https://cdn.bootcdn.net/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js';
          document.body.appendChild(script);
          // 等待 dom2img 加载完成
          await new Promise((resolve) => {
            script.onload = function() {
              resolve();
            }
          });
        }
        // 用 dom2img 生成图片
        var shareDom = document.querySelector('.share');
        var scale = 2;
        var img = await domtoimage.toPng(shareDom, { 
          width: shareDom.offsetWidth * scale,
          height: shareDom.offsetHeight * scale,
          style: {
            transform: 'scale(' + scale + ')',
            transformOrigin: 'top left'
          }
        });
        // 转换成 blob
        var buffer = new Uint8Array(atob(img.split(',')[1]).split('').map(function(item) {
          return item.charCodeAt(0);
        }));
        var _t = window.__TAURI__;
        var savePath = await _t.path.downloadDir() + Date.now() + '.png';
        await _t.dialog.save({
          title: '保存图片',
          filters: [{ name: '图片', extensions: ['png'] }],
          defaultPath: savePath,
        }).then(async function(savePath) {
          if (savePath) {
            await _t.fs.writeBinaryFile({
              contents: buffer,
              path: savePath,
            });
            alert('保存成功');
            // 处理回调
            mhyWebBridge('${callback}', {});
          }
        });
      })();`;
      await invoke("execute_js", { label: "mhy_client", js: executeJS });
      return;
    }
    // 延时 3s
    setTimeout(async () => {
      await this.callback(callback, {});
    }, 10000);
  }

  /**
   * @func eventTrack
   * @since Beta v0.3.8
   * @desc 事件跟踪
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async eventTrack(payload: unknown): Promise<void> {
    console.log(`[eventTrack] ${JSON.stringify(payload)}`);
    await this.loadJSBridge();
  }

  /**
   * @func openApplication
   * @since Beta v0.3.8
   * @desc 打开应用
   * @param {unknown} payload - 请求参数
   * @returns {void} - 无返回值
   */
  async openApplication(payload: unknown): Promise<void> {
    console.log(`[openApplication] ${JSON.stringify(payload)}`);
    await appWindow.setFocus();
    showSnackbar({
      text: `不支持的操作：OpenApplication(${JSON.stringify(payload)})`,
      color: "error",
    });
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    await this.window?.setFocus();
  }
}

const mhyClient = new TGClient();

export default mhyClient;
