/**
 * @file component func snackbar.ts
 * @description 封装 vuetify 的 snackbar 组件，通过函数调用的方式，简化 snackbar 的使用
 * @since Beta v0.3.3
 */

import { h, render, type VNode } from "vue";

import snackbar from "./snackbar.vue";

const snackbarId = "tg-func-snackbar";

const renderBox = (props: TGApp.Component.Snackbar.Params): VNode => {
  const container = document.createElement("div");
  container.id = snackbarId;
  const boxVNode: VNode = h(snackbar, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
};

let snackbarInstance: VNode;

const showSnackbar = (props: TGApp.Component.Snackbar.Params): void => {
  if (snackbarInstance !== undefined) {
    const boxVue = snackbarInstance.component;
    boxVue?.exposeProxy?.displayBox(props);
  } else {
    snackbarInstance = renderBox(props);
    showSnackbar(props);
  }
};

export default showSnackbar;
