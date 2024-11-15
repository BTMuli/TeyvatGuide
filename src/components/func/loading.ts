/**
 * @file component/func/loading.ts
 * @description loading 组件封装，函数式调用
 * @since Beta v0.6.3
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import loading from "./loading.vue";

const loadingId = "tg-func-loading";

export type LoadingParams = { show: boolean; title: string; subtitle?: string; empty?: boolean };

/**
 * @description 自定义 loading 组件
 * @since Beta v0.6.3
 * @return LoadingInstance
 */
interface LoadingInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: (props: LoadingParams) => void;
  };
}

function renderBox(props: LoadingParams): VNode {
  const container = document.createElement("div");
  container.id = loadingId;
  const boxVNode: VNode = h(loading, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let loadingInstance: VNode;

function showLoadingFull(show: boolean, title: string, sub: string, empty: boolean): void {
  const params: LoadingParams = { show: show, title: title, subtitle: sub, empty: empty };
  if (loadingInstance !== undefined) {
    const boxVue = <LoadingInstance>loadingInstance.component;
    return boxVue.exposeProxy.displayBox(params);
  } else {
    loadingInstance = renderBox(params);
    return showLoadingFull(show, title, sub, empty);
  }
}

function showLoadingStart(title: string, sub?: string): void {
  showLoadingFull(true, title, sub ?? "", false);
}

function showLoadingUpdate(title: string, sub?: string, empty?: boolean): void {
  showLoadingFull(true, title, sub ?? "", empty ?? false);
}

function showLoadingEmpty(title: string, sub?: string): void {
  showLoadingFull(true, title, sub ?? "", true);
}

function showLoadingEnd(): void {
  showLoadingFull(false, "", "", false);
}

const showLoading = {
  _: showLoadingFull,
  start: showLoadingStart,
  update: showLoadingUpdate,
  empty: showLoadingEmpty,
  end: showLoadingEnd,
};

export default showLoading;
