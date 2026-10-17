/**
 * dialog 组件封装，函数式调用
 * @since Beta v0.12.6
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
  /** 输入类型 */
  type?: string;
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

/**
 * 函数式弹窗任务
 * @since Beta v0.12.6
 */
type DialogTask<T> = () => Promise<T>;

let dialogQueueTail: Promise<void> = Promise.resolve();

/**
 * 按调用顺序串行执行函数式弹窗任务。
 * @since Beta v0.12.6
 * @param task - 待执行的弹窗任务
 * @returns 弹窗任务结果
 */
function enqueueDialog<T>(task: DialogTask<T>): Promise<T> {
  const previous = dialogQueueTail;
  const current = previous.then(task, task);
  dialogQueueTail = current.then(
    () => undefined,
    () => undefined,
  );
  return current;
}

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

/**
 * Input Mode 封装
 * @since Beta v0.10.2
 * @param opts - 参数
 * @returns 输入模式值
 */
async function showDialogInputFull(
  opts: Omit<DialogInputParams, "mode">,
): Promise<string | false | undefined> {
  const params: DialogInputParams = { mode: "input", ...opts };
  if (dialogInstance !== undefined) {
    const boxVue = <DialogInstance>dialogInstance.component;
    return await boxVue.exposeProxy.displayInputBox(params);
  } else {
    dialogInstance = renderBox(params);
    return await showDialogInputFull(opts);
  }
}

/**
 * 排队调用完整弹窗封装。
 * @since Beta v0.12.6
 * @param mode - 弹窗模式
 * @param title - 标题
 * @param text - 文本
 * @param input - 默认输入值
 * @param otcancel - 是否允许点击外部取消
 * @returns 弹窗结果
 */
function queuedDialogFull(
  mode: "check" | "input",
  title: string,
  text?: string,
  input?: string,
  otcancel?: boolean,
): Promise<boolean | string | undefined> {
  return enqueueDialog(() => showDialogFull(mode, title, text, input, otcancel));
}

/**
 * 排队调用确认弹窗简易封装。
 * @since Beta v0.12.6
 * @param title - 标题
 * @param text - 文本
 * @param otcancel - 是否允许点击外部取消
 * @returns 确认结果
 */
function queuedDialogCheck(
  title: string,
  text?: string,
  otcancel?: boolean,
): Promise<boolean | undefined> {
  return enqueueDialog(() => showDialogCheck(title, text, otcancel));
}

/**
 * 排队调用输入弹窗简易封装。
 * @since Beta v0.12.6
 * @param title - 标题
 * @param text - 文本
 * @param input - 默认输入值
 * @param otcancel - 是否允许点击外部取消
 * @returns 输入结果
 */
function queuedDialogInput(
  title: string,
  text?: string,
  input?: string,
  otcancel?: boolean,
): Promise<string | false | undefined> {
  return enqueueDialog(() => showDialogInput(title, text, input, otcancel));
}

/**
 * 排队调用输入弹窗完整封装。
 * @since Beta v0.12.6
 * @param opts - 弹窗参数
 * @returns 输入结果
 */
function queuedDialogInputFull(
  opts: Omit<DialogInputParams, "mode">,
): Promise<string | false | undefined> {
  return enqueueDialog(() => showDialogInputFull(opts));
}

/**
 * 排队调用确认弹窗完整封装。
 * @since Beta v0.12.6
 * @param opts - 弹窗参数
 * @returns 确认结果
 */
function queuedDialogCheckFull(opts: DialogBaseParams): Promise<boolean | undefined> {
  return enqueueDialog(() => showDialogCheckFull(opts));
}

const showDialog = {
  _: queuedDialogFull,
  check: queuedDialogCheck,
  input: queuedDialogInput,
  inputF: queuedDialogInputFull,
  checkF: queuedDialogCheckFull,
};

export default showDialog;
