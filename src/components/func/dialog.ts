/**
 * dialog 组件封装，函数式调用
 * @since Beta v0.9.1
 */

import type { ComponentInternalInstance, VNode } from "vue";
import { h, render } from "vue";

import dialog from "./dialog.vue";

const dialogId = "tg-func-dialog";

export type DialogParams = DialogCheckParams | DialogInputParams;
/** 基础弹窗参数 */
type DialogBaseParams = {
  /** 标题 */
  title: string;
  /** 文本 */
  text?: string;
  /** 点击外部取消 */
  otcancel?: boolean;
  /** 确认label */
  confirmLabel?: string;
  /** 取消label */
  cancelLabel?: string;
};
/** 确认弹窗 */
export type DialogCheckParams = DialogBaseParams & {
  /** 模式：确认 */
  mode: "check";
};
/** 输入弹窗 */
export type DialogInputParams = DialogBaseParams & {
  /** 模式：输入 */
  mode: "input";
  /** 默认值 */
  input?: string;
};

/**
 * 自定义 confirm 组件
 * @since Beta v0.6.3
 */
type DialogInstance = {
  exposeProxy: {
    displayCheckBox: (props: DialogCheckParams) => Promise<boolean | undefined>;
    displayInputBox: (props: DialogInputParams) => Promise<string | false | undefined>;
  };
} & ComponentInternalInstance;

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

async function showDialogCheckFull(opts: DialogBaseParams): Promise<boolean | undefined> {
  const params: DialogCheckParams = { mode: "check", ...opts };
  if (dialogInstance !== undefined) {
    const boxVue = <DialogInstance>dialogInstance.component;
    return await boxVue.exposeProxy.displayCheckBox(params);
  } else {
    dialogInstance = renderBox(params);
    return await showDialogCheckFull(opts);
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

async function showDialogInputFull(
  opts: DialogBaseParams,
  input?: string,
): Promise<string | false | undefined> {
  const params: DialogInputParams = { mode: "input", input, ...opts };
  if (dialogInstance !== undefined) {
    const boxVue = <DialogInstance>dialogInstance.component;
    return await boxVue.exposeProxy.displayInputBox(params);
  } else {
    dialogInstance = renderBox(params);
    return await showDialogInputFull(opts);
  }
}

const showDialog = {
  _: showDialogFull,
  check: showDialogCheck,
  input: showDialogInput,
  inputF: showDialogInputFull,
  checkF: showDialogCheckFull,
};

export default showDialog;
