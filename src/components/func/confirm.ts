/**
 * @file component/func/confirm.ts
 * @description 封装自定义 confirm 组件，通过函数调用的方式，简化 confirm 的使用
 * @since Beta v0.3.9
 */

import { h, render } from "vue";
import type { ComponentInternalInstance, VNode } from "vue";

import confirm from "./confirm.vue";

const confirmId = "tg-func-confirm";

/**
 * @description 自定义 confirm 组件
 * @since Beta v0.3.4
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 显示 confirm
 * @return ConfirmInstance
 */
interface ConfirmInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: (props: TGApp.Component.Confirm.Params) => Promise<string | boolean>;
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

/**
 * @function showConfirm
 * @since Beta v0.3.9
 * @todo 重载重构
 * @description 弹出 confirm
 * @param {TGApp.Component.Confirm.Params} props confirm 的参数
 * @return {Promise<string | boolean | undefined>} 点击确认返回 true，点击取消返回 false，点击外部返回 undefined
 */
async function showConfirm(
  props: TGApp.Component.Confirm.ParamsConfirm,
): Promise<boolean | undefined>;
async function showConfirm(
  props: TGApp.Component.Confirm.ParamsInput,
): Promise<string | false | undefined>;
async function showConfirm(
  props: TGApp.Component.Confirm.Params,
): Promise<string | boolean | undefined>;
async function showConfirm(
  props: TGApp.Component.Confirm.Params,
): Promise<string | boolean | undefined> {
  if (confirmInstance !== undefined) {
    const boxVue = <ConfirmInstance>confirmInstance.component;
    return await boxVue.exposeProxy.displayBox(props);
  } else {
    confirmInstance = renderBox(props);
    return await showConfirm(props);
  }
}

export default showConfirm;
