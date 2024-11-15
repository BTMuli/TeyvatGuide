/**
 * @file component/func/dialog.ts
 * @description dialog 组件封装，函数式调用
 * @since Beta v0.6.3
 */

import { h, render } from "vue";
import type { ComponentInternalInstance, VNode } from "vue";

import dialog from "./dialog.vue";

const dialogId = "tg-func-dialog";

export type DialogParams = DialogCheckParams | DialogInputParams;
export type DialogCheckParams = {
  mode: "check";
  title: string;
  text?: string;
  otcancel?: boolean;
};
export type DialogInputParams = {
  mode: "input";
  title: string;
  text?: string;
  otcancel?: boolean;
  input?: string;
};

/**
 * @description 自定义 confirm 组件
 * @since Beta v0.6.3
 * @extends ComponentInternalInstance
 * @property {Function} exposeProxy.displayBox 显示 confirm
 * @return DialogInstance
 */
interface DialogInstance extends ComponentInternalInstance {
  exposeProxy: {
    displayCheckBox: (props: DialogCheckParams) => Promise<boolean | undefined>;
    displayInputBox: (props: DialogInputParams) => Promise<string | false | undefined>;
  };
}

function renderBox(props: DialogParams): VNode {
  const container = document.createElement("div");
  container.id = dialogId;
  const boxVNode: VNode = h(dialog, props);
  render(boxVNode, container);
  document.body.appendChild(container);
  return boxVNode;
}

let dialogInstance: VNode;

async function showDialogFull(
  mode: "check" | "input",
  title: string,
  text?: string,
  input?: string,
  otcancel?: boolean,
): Promise<boolean | string | undefined> {
  if (mode === "check") return await showDialogCheck(title, text, otcancel);
  return await showDialogInput(title, text, input, otcancel);
}

async function showDialogCheck(
  title: string,
  text?: string,
  otcancel?: boolean,
): Promise<boolean | undefined> {
  const params: DialogCheckParams = {
    mode: "check",
    title: title,
    text: text,
    otcancel: otcancel,
  };
  if (dialogInstance !== undefined) {
    const boxVue = <DialogInstance>dialogInstance.component;
    return await boxVue.exposeProxy.displayCheckBox(params);
  } else {
    dialogInstance = renderBox(params);
    return await showDialogCheck(title, text, otcancel);
  }
}

async function showDialogInput(
  title: string,
  text?: string,
  input?: string,
  otcancel?: boolean,
): Promise<string | false | undefined> {
  const params: DialogInputParams = {
    mode: "input",
    title: title,
    text: text,
    input: input,
    otcancel: otcancel,
  };
  if (dialogInstance !== undefined) {
    const boxVue = <DialogInstance>dialogInstance.component;
    return await boxVue.exposeProxy.displayInputBox(params);
  } else {
    dialogInstance = renderBox(params);
    return await showDialogInput(title, text, input, otcancel);
  }
}

const showDialog = {
  _: showDialogFull,
  check: showDialogCheck,
  input: showDialogInput,
};

export default showDialog;
