/**
 * @file component/func/geetest.ts
 * @description 封装自定义 geetest 组件，通过函数调用的方式，简化 geetest 的使用
 * @since Beta v0.6.6
 */

import { h, render } from "vue";
import type { ComponentInternalInstance, VNode } from "vue";

import geetest from "./geetest.vue";

const geetestId = "tg-func-geetest";

/**
 * @description 自定义 geetest 组件
 * @since Beta v0.5.1
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 弹出 geetest 验证
 * @return GeetestInstance
 */
interface GeetestInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: (
      props: TGApp.Plugins.Mys.Geetest.reqResp,
    ) => Promise<TGApp.Plugins.Mys.Geetest.validateResp | false>;
  };
}

function renderBox(props: TGApp.Plugins.Mys.Geetest.reqResp): VNode {
  const container = document.createElement("div");
  container.id = geetestId;
  const boxVNode: VNode = h(geetest, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let geetestInstance: VNode;

/**
 * @function showGeetest
 * @since Beta v0.5.1
 * @description 弹出 geetest 验证
 * @param {TGApp.Plugins.Mys.Geetest.reqResp} props geetest 验证的参数
 * @return {Promise<TGApp.Plugins.Mys.Geetest.validateResp>} 验证成功返回验证数据
 */
async function showGeetest(
  props: TGApp.Plugins.Mys.Geetest.reqResp,
): Promise<TGApp.Plugins.Mys.Geetest.validateResp | false> {
  if (geetestInstance !== undefined) {
    const boxVue = <GeetestInstance>geetestInstance.component;
    return boxVue.exposeProxy.displayBox(props);
  } else {
    geetestInstance = renderBox(props);
    return await showGeetest(props);
  }
}

export default showGeetest;
