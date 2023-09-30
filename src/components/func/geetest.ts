/**
 * @file component func geetest.ts
 * @description 封装自定义 geetest 组件，通过函数调用的方式，简化 geetest 的使用，使用时需要在 main.ts 中引入 geetest.js
 * @since Beta v0.3.3
 */

import { h, render, type VNode } from "vue";
import geetest, { type GeetestParam } from "./geetest.vue";

const geetestId = "tg-func-geetest";

const renderBox = (): VNode => {
  const container = document.createElement("div");
  container.id = geetestId;
  const boxVNode: VNode = h(geetest);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
};

let geetestInstance: VNode;

const showGeetest = async (props: GeetestParam): Promise<string | boolean> => {
  if (geetestInstance) {
    const boxVue = geetestInstance.component;
    return boxVue?.exposeProxy?.displayBox();
  } else {
    geetestInstance = renderBox();
    return await showGeetest(props);
  }
};

export default showGeetest;
