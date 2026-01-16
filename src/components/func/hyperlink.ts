/**
 * hyperlink 组件封装，函数式调用
 * @since Beta v0.9.1
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import hyperlink from "./hyperlink.vue";

const hyperlinkId = "tg-func-hyperlink";

export type HyperLinkParams = {
  /** id */
  id: string;
  /** 名称 */
  name: string;
  /**
   * 描述
   * @remarks htmlText
   */
  desc: string;
};

/**
 * 自定义 HyperLink 组件
 * @since Beta v0.6.3
 */
type HyperLinkInstance = {
  exposeProxy: {
    displayBox: (props: HyperLinkParams) => Promise<void>;
  };
} & ComponentInternalInstance;

function renderBox(props: HyperLinkParams): VNode {
  const container = document.createElement("div");
  container.id = hyperlinkId;
  const boxVNode: VNode = h(hyperlink, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let hyperLinkInstance: VNode;

async function showHyperLink(info: HyperLinkParams): Promise<void> {
  if (hyperLinkInstance !== undefined) {
    const boxVue = <HyperLinkInstance>hyperLinkInstance.component;
    await boxVue.exposeProxy.displayBox(info);
  } else {
    hyperLinkInstance = renderBox(info);
    await showHyperLink(info);
  }
}

export default showHyperLink;
