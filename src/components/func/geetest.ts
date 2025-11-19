/**
 * 极验验证组件封装
 * @since Beta v0.8.7
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import geetest from "./geetest.vue";

const geetestId = "tg-func-geetest";

/**
 * 自定义 geetest 组件
 * @since Beta v0.8.7
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 弹出 geetest 验证
 * @return GeetestInstance
 */
interface GeetestInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayBox: (
      props: TGApp.BBS.Geetest.CreateRes,
      raw?: TGApp.BBS.CaptchaLogin.CaptchaAigis,
    ) => Promise<TGApp.BBS.Geetest.GeetestVerifyRes | false>;
  };
}

function renderBox(props: TGApp.BBS.Geetest.CreateRes): VNode {
  const container = document.createElement("div");
  container.id = geetestId;
  const boxVNode: VNode = h(geetest, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let geetestInstance: VNode;

/**
 * 弹出 geetest 验证
 * @since Beta v0.8.7
 * @param {TGApp.BBS.Geetest.CreateRes} props geetest 验证的参数
 * @param {TGApp.BBS.CaptchaLogin.CaptchaAigis} raw 原始数据，一般用于 Gt4 验证
 * @return {Promise<TGApp.BBS.Geetest.GeetestVerifyRes|false>} 验证成功返回验证数据
 */
async function showGeetest(
  props: TGApp.BBS.Geetest.CreateRes,
  raw?: TGApp.BBS.CaptchaLogin.CaptchaAigis,
): Promise<TGApp.BBS.Geetest.GeetestVerifyRes | false> {
  if (geetestInstance !== undefined) {
    const boxVue = <GeetestInstance>geetestInstance.component;
    return boxVue.exposeProxy.displayBox(props, raw);
  } else {
    geetestInstance = renderBox(props);
    return await showGeetest(props, raw);
  }
}

export default showGeetest;
