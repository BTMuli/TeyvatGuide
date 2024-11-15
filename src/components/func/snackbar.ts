/**
 * @file component/func/snackbar.ts
 * @description snackbar 组件封装，函数式调用
 * @since Beta v0.6.3
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import snackbar from "./snackbar.vue";

const snackbarId = "tg-func-snackbar";

export type SnackbarParams = { text: string; color: string; timeout: number };

/**
 * @description 自定义 snackbar 组件
 * @since Beta v0.6.3
 * @return SnackbarInstance
 */
interface SnackbarInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: (props: SnackbarParams) => void;
  };
}

function renderBox(props: SnackbarParams): VNode {
  const container = document.createElement("div");
  container.id = snackbarId;
  const boxVNode: VNode = h(snackbar, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let snackbarInstance: VNode;

function showSnackbarFull(text: string, color?: string, timeout?: number): void {
  const params: SnackbarParams = {
    text: text,
    color: color ?? "success",
    timeout: timeout ?? 1500,
  };
  if (snackbarInstance !== undefined) {
    const boxVue = <SnackbarInstance>snackbarInstance.component;
    boxVue.exposeProxy.displayBox(params);
  } else {
    snackbarInstance = renderBox(params);
    showSnackbarFull(params.text, params.color, params.timeout);
  }
}

function showSnackbarCancel(text: string, timeout?: number): void {
  showSnackbarFull(text, "cancel", timeout);
}

function showSnackbarError(text: string, timeout?: number): void {
  showSnackbarFull(text, "error", timeout);
}

function showSnackbarInfo(text: string, timeout?: number): void {
  showSnackbarFull(text, "info", timeout);
}

function showSnackbarSuccess(text: string, timeout?: number): void {
  showSnackbarFull(text, "success", timeout);
}

function showSnackbarWarn(text: string, timeout?: number): void {
  showSnackbarFull(text, "warn", timeout);
}

const showSnackbar = {
  _: showSnackbarFull,
  cancel: showSnackbarCancel,
  error: showSnackbarError,
  info: showSnackbarInfo,
  success: showSnackbarSuccess,
  warn: showSnackbarWarn,
};
export default showSnackbar;
