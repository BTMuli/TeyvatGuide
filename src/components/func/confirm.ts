/**
 * @file component func confirm.ts
 * @description 封装自定义 confirm 组件，通过函数调用的方式，简化 confirm 的使用
 * @since Beta v0.3.3
 */

import { h, render } from "vue";
import type { ComponentInternalInstance, VNode } from "vue";

import confirm from "./confirm.vue";

const confirmId = "tg-func-confirm";

/**
 * @description 自定义 confirm 组件
 * @since Beta v0.3.3
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 显示 confirm
 * @return ConfirmInstance
 */
interface ConfirmInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: typeof TGApp.Component.Confirm.displayBox;
  };
}

const renderBox = (props: TGApp.Component.Confirm.Params): VNode => {
  const container = document.createElement("div");
  container.id = confirmId;
  const boxVNode: VNode = h(confirm, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
};

let confirmInstance: VNode;

async function showConfirm(props: TGApp.Component.Confirm.ParamsConfirm): Promise<boolean>;
async function showConfirm(props: TGApp.Component.Confirm.ParamsInput): Promise<string>;
async function showConfirm(props: TGApp.Component.Confirm.Params): Promise<string | boolean>;
async function showConfirm(props: TGApp.Component.Confirm.Params): Promise<string | boolean> {
  if (confirmInstance !== undefined) {
    const boxVue = <ConfirmInstance>confirmInstance.component;
    return boxVue.exposeProxy.displayBox(props);
  } else {
    confirmInstance = renderBox(props);
    return await showConfirm(props);
  }
}

export default showConfirm;
