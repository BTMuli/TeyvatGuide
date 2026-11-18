/**
 * loading 组件封装，函数式调用
 * @since Beta v0.13.2
 */

import type { ShareProgress } from "@utils/share/TGShare.js";
import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import loading from "./loading.vue";

const loadingId = "tg-func-loading";

export type LoadingParams = { show: boolean; title?: string; subtitle?: string; empty?: boolean };
type LoadingUpdateParams = Omit<LoadingParams, "show" | "subtitle"> & { timeout?: number };
// 低于100则不可感，高于200则过于缓慢
const TIMEOUT: Readonly<number> = 150;

/**
 * 自定义 loading 组件
 * @since Beta v0.6.7
 * @returns LoadingInstance
 */
type LoadingInstance = ComponentInternalInstance & {
  exposeProxy: { displayBox: (props: LoadingParams) => Promise<void> };
};

function renderBox(props: LoadingParams): VNode {
  const container = document.createElement("div");
  container.id = loadingId;
  const boxVNode: VNode = h(loading, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let loadingInstance: VNode;

async function showLoadingFull(option: LoadingParams): Promise<void> {
  if (loadingInstance !== undefined) {
    const boxVue = <LoadingInstance>loadingInstance.component;
    return await boxVue.exposeProxy.displayBox(option);
  } else {
    loadingInstance = renderBox(option);
    return await showLoadingFull(option);
  }
}

async function showLoadingStart(
  title: string,
  subtitle?: string,
  timeout: number = TIMEOUT,
): Promise<void> {
  await showLoadingFull({ show: true, title, subtitle, empty: false });
  await new Promise<void>((resolve) => setTimeout(resolve, timeout));
}

async function showLoadingUpdate(subtitle: string, opt?: LoadingUpdateParams): Promise<void> {
  await showLoadingFull({ show: true, title: opt?.title, subtitle, empty: opt?.empty });
  await new Promise<void>((resolve) => setTimeout(resolve, opt?.timeout ?? TIMEOUT));
}

async function showLoadingEmpty(title: string, subtitle?: string): Promise<void> {
  await showLoadingFull({ show: true, title, subtitle, empty: true });
}

async function showLoadingEnd(): Promise<void> {
  await showLoadingFull({ show: false });
}

/**
 * 将一次分享截图的阶段进度显示在加载浮层中
 * @since Beta v0.13.2
 * @returns 独立的分享进度回调
 */
export function createShareProgressReporter(): (progress: ShareProgress) => void {
  let lastPhase: ShareProgress["phase"] | undefined;
  let lastUpdateAt = 0;

  return ({ phase, current, total }) => {
    const now = performance.now();
    if (phase === lastPhase && current < total && now - lastUpdateAt < 80) return;
    lastPhase = phase;
    lastUpdateAt = now;

    const title = phase === "capture" ? "正在生成图片" : "正在烘焙毛玻璃";
    const progressText = total > 0 ? `${current}/${total}` : "正在渲染截图";
    const subtitle = phase === "snapshot" ? "正在截取背景" : progressText;
    void showLoadingUpdate(subtitle, { title, timeout: 0 });
  };
}

const showLoading = {
  _: showLoadingFull,
  start: showLoadingStart,
  update: showLoadingUpdate,
  empty: showLoadingEmpty,
  end: showLoadingEnd,
};

export default showLoading;
