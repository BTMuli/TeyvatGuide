/**
 * 极验验证组件封装
 * @since Beta v0.11.3
 */

import TGLogger from "@utils/TGLogger.js";
import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import geetest from "./geetest.vue";

/** 组件ID */
const GEETEST_COMP_ID: Readonly<string> = "tg-func-geetest";
/** SDK 超时时间 */
const GEETEST_SDK_TIMEOUT: Readonly<number> = 10_000;

/**
 * SDK加载选项
 * @since Beta v0.11.3
 */
type GeetestSdkOptions = {
  /** ID */
  id: string;
  /** SDK 链接 */
  src: string;
  /** 是否加载成功 */
  isReady: () => boolean;
};

const geetestSdkPromises = new Map<string, Promise<boolean>>();

declare function initGeetest(): void;

declare function initGeetest4(): void;

/**
 * 获取极验SDK加载参数
 * @since Beta v0.11.3
 * @param props - 创建参数
 * @returns JS加载参数
 */
function getGeetestSdkOptions(props: TGApp.BBS.Geetest.CreateRes): GeetestSdkOptions {
  if ("challenge" in props) {
    return {
      id: "tg-geetest-v3-sdk",
      src: "https://static.geetest.com/static/js/gt.0.4.9.js",
      isReady: () => typeof initGeetest === "function",
    };
  }
  return {
    id: "tg-geetest-v4-sdk",
    src: "https://static.geetest.com/v4/gt4.js",
    isReady: () => typeof initGeetest4 === "function",
  };
}

/**
 * 异步加载极验SDK
 * @since Beta v0.11.3
 * @param props - 创建参数
 * @returns 是否调用成功
 */
function loadGeetestSdk(props: TGApp.BBS.Geetest.CreateRes): Promise<boolean> {
  const options = getGeetestSdkOptions(props);
  if (options.isReady()) return Promise.resolve(true);

  const pending = geetestSdkPromises.get(options.id);
  if (pending !== undefined) return pending;

  const promise = new Promise<boolean>((resolve) => {
    document.getElementById(options.id)?.remove();
    const script = document.createElement("script");
    script.id = options.id;
    script.src = options.src;
    script.async = true;

    let settled = false;
    const timeout = window.setTimeout(() => finish(false), GEETEST_SDK_TIMEOUT);

    function finish(loaded: boolean): void {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (!loaded) {
        script.remove();
        geetestSdkPromises.delete(options.id);
      }
      resolve(loaded);
    }

    script.onload = () => finish(options.isReady());
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  });
  geetestSdkPromises.set(options.id, promise);
  return promise;
}

/**
 * 自定义 geetest 组件
 * @since Beta v0.8.7
 */
type GeetestInstance = {
  exposeProxy: {
    displayBox: (
      props: TGApp.BBS.Geetest.CreateRes,
      raw?: TGApp.BBS.CaptchaLogin.CaptchaAigis,
    ) => Promise<TGApp.BBS.Geetest.GeetestVerifyRes | false>;
  };
} & ComponentInternalInstance;

function renderBox(props: TGApp.BBS.Geetest.CreateRes): VNode {
  const container = document.createElement("div");
  container.id = GEETEST_COMP_ID;
  const boxVNode: VNode = h(geetest, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let geetestInstance: VNode;

/**
 * 弹出 geetest 验证
 * @since Beta v0.11.3
 * @param props - geetest 验证的参数
 * @param raw - 原始数据，一般用于 Gt4 验证
 * @returns 验证数据
 */
async function showGeetest(
  props: TGApp.BBS.Geetest.CreateRes,
  raw?: TGApp.BBS.CaptchaLogin.CaptchaAigis,
): Promise<TGApp.BBS.Geetest.GeetestVerifyRes | false> {
  const sdkLoaded = await loadGeetestSdk(props);
  if (!sdkLoaded) {
    try {
      await TGLogger.Error(`[Geetest] ${"challenge" in props ? "v3" : "v4"} SDK 加载失败`);
    } catch (error) {
      console.error("[Geetest] SDK 加载失败", error);
    }
    return false;
  }
  if (geetestInstance !== undefined) {
    const boxVue = <GeetestInstance>geetestInstance.component;
    return boxVue.exposeProxy.displayBox(props, raw);
  } else {
    geetestInstance = renderBox(props);
    return await showGeetest(props, raw);
  }
}

export default showGeetest;
