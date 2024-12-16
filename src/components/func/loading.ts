/**
 * @file component/func/loading.ts
 * @description loading 组件封装，函数式调用
 * @since Beta v0.6.7
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import loading from "./loading.vue";

const loadingId = "tg-func-loading";

export type LoadingParams = { show: boolean; title?: string; subtitle?: string; empty?: boolean };
type LoadingUpdateParams = Omit<LoadingParams, "show" | "subtitle"> & { timeout?: number };
// 低于100则不可感，高于200则过于缓慢
const TIMEOUT: Readonly<number> = 150;

/**
 * @description 自定义 loading 组件
 * @since Beta v0.6.7
 * @return LoadingInstance
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

const showLoading = {
  _: showLoadingFull,
  start: showLoadingStart,
  update: showLoadingUpdate,
  empty: showLoadingEmpty,
  end: showLoadingEnd,
};

export default showLoading;
