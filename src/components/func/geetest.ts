/**
 * @file component func geetest.ts
 * @description 封装自定义 geetest 组件，通过函数调用的方式，简化 geetest 的使用，使用时需要在 main.ts 中引入 geetest.js
 * @since Beta v0.3.3
 */

import { h, render } from "vue";
import type { ComponentInternalInstance, VNode } from "vue";

import geetest from "./geetest.vue";

const geetestId = "tg-func-geetest";

/**
 * @description 自定义 geetest 组件
 * @since Beta v0.3.3
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 弹出 geetest 验证
 * @return GeetestInstance
 */
interface GeetestInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: () => boolean;
  };
}

const renderBox = (): VNode => {
  const container = document.createElement("div");
  container.id = geetestId;
  const boxVNode: VNode = h(geetest);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
};

let geetestInstance: VNode;

async function showGeetest(): Promise<boolean> {
  if (geetestInstance !== undefined) {
    const boxVue = <GeetestInstance>geetestInstance.component;
    return boxVue.exposeProxy.displayBox();
  } else {
    geetestInstance = renderBox();
    return await showGeetest();
  }
}

export default showGeetest;
