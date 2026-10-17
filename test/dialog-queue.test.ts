/**
 * 函数式弹窗队列回归测试。
 * @since Beta v0.12.6
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import type { DialogCheckParams, DialogInputParams } from "../src/components/func/dialog.js";

/**
 * Vue 虚拟节点测试桩。
 * @since Beta v0.12.6
 */
type FakeVNode = {
  component?: {
    exposeProxy: {
      displayCheckBox: (params: DialogCheckParams) => Promise<boolean | undefined>;
      displayInputBox: (params: DialogInputParams) => Promise<string | false | undefined>;
    };
  };
};

/**
 * 待完成的确认弹窗测试调用。
 * @since Beta v0.12.6
 */
type PendingCheck = {
  mode: "check";
  params: DialogCheckParams;
  resolve: (value: boolean | undefined) => void;
  reject: (reason?: unknown) => void;
};

/**
 * 待完成的输入弹窗测试调用。
 * @since Beta v0.12.6
 */
type PendingInput = {
  mode: "input";
  params: DialogInputParams;
  resolve: (value: string | false | undefined) => void;
  reject: (reason?: unknown) => void;
};

/**
 * 待完成的弹窗测试调用。
 * @since Beta v0.12.6
 */
type PendingDialog = PendingCheck | PendingInput;

/**
 * 函数式弹窗测试桩。
 * @since Beta v0.12.6
 */
type DialogHarness = {
  pending: Array<PendingDialog>;
  displayCheckBox: (params: DialogCheckParams) => Promise<boolean | undefined>;
  displayInputBox: (params: DialogInputParams) => Promise<string | false | undefined>;
};

const mocks = vi.hoisted(() => ({
  h: vi.fn(),
  render: vi.fn(),
}));

vi.mock("vue", () => ({ h: mocks.h, render: mocks.render }));
vi.mock("../src/components/func/dialog.vue", () => ({ default: {} }));

let activeHarness: DialogHarness | undefined;

/**
 * 创建一个可手动完成的弹窗调用测试桩。
 * @since Beta v0.12.6
 * @returns 弹窗调用测试桩
 */
function createDialogHarness(): DialogHarness {
  const pending: Array<PendingDialog> = [];
  return {
    pending,
    displayCheckBox: (params) =>
      new Promise<boolean | undefined>((resolve, reject) => {
        pending.push({ mode: "check", params, resolve, reject });
      }),
    displayInputBox: (params) =>
      new Promise<string | false | undefined>((resolve, reject) => {
        pending.push({ mode: "input", params, resolve, reject });
      }),
  };
}

/**
 * 加载一个带有隔离弹窗桩的函数式弹窗模块。
 * @since Beta v0.12.6
 * @returns 弹窗 API 与测试桩
 */
async function loadDialog(): Promise<{
  showDialog: typeof import("../src/components/func/dialog.js").default;
  harness: DialogHarness;
}> {
  vi.resetModules();
  const harness = createDialogHarness();
  activeHarness = harness;
  mocks.h.mockImplementation(
    (_component: unknown, props: DialogCheckParams | DialogInputParams) => ({
      props,
    }),
  );
  mocks.render.mockImplementation((vnode: FakeVNode) => {
    if (activeHarness === undefined) throw new Error("dialog harness is not ready");
    vnode.component = {
      exposeProxy: {
        displayCheckBox: activeHarness.displayCheckBox,
        displayInputBox: activeHarness.displayInputBox,
      },
    };
  });
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({ id: "" })),
    body: { appendChild: vi.fn() },
  });

  const module = await import("../src/components/func/dialog.js");
  return { showDialog: module.default, harness };
}

/**
 * 等待排队任务完成当前微任务链。
 * @since Beta v0.12.6
 * @returns 微任务链完成信号
 */
async function flushDialogQueue(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  activeHarness = undefined;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("showDialog FIFO queue", () => {
  it("serializes concurrent checkF calls and keeps their parameters", async () => {
    const { showDialog, harness } = await loadDialog();

    const first = showDialog.checkF({ title: "first", text: "first text" });
    const second = showDialog.checkF({ title: "second", text: "second text" });
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(1);
    const firstCall = harness.pending[0];
    expect(firstCall).toMatchObject({
      mode: "check",
      params: { mode: "check", title: "first", text: "first text" },
    });
    if (firstCall?.mode !== "check") throw new Error("first dialog is not a check dialog");
    firstCall.resolve(true);
    await expect(first).resolves.toBe(true);
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(2);
    const secondCall = harness.pending[1];
    expect(secondCall).toMatchObject({
      mode: "check",
      params: { mode: "check", title: "second", text: "second text" },
    });
    if (secondCall?.mode !== "check") throw new Error("second dialog is not a check dialog");
    secondCall.resolve(false);

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(false);
  });

  it("shares one FIFO across check, input, inputF, and full calls", async () => {
    const { showDialog, harness } = await loadDialog();

    const check = showDialog.check("check title");
    const input = showDialog.input("input title", "input text", "prefilled", true);
    const inputFull = showDialog.inputF({
      title: "full input",
      text: "full input text",
      input: "full value",
      type: "number",
      confirmLabel: "Use",
      cancelLabel: "Back",
    });
    const full = showDialog._("check", "full check", "full check text", "ignored", true);
    const checkFull = showDialog.checkF({
      title: "full check 2",
      text: "full check text 2",
      confirmLabel: "Approve",
      cancelLabel: "Reject",
    });
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(1);
    const checkCall = harness.pending[0];
    expect(checkCall).toMatchObject({
      mode: "check",
      params: { mode: "check", title: "check title", text: undefined, otcancel: undefined },
    });
    if (checkCall?.mode !== "check") throw new Error("check dialog is not a check dialog");
    checkCall.resolve(true);
    await expect(check).resolves.toBe(true);
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(2);
    const inputCall = harness.pending[1];
    expect(inputCall).toMatchObject({
      mode: "input",
      params: {
        mode: "input",
        title: "input title",
        text: "input text",
        input: "prefilled",
        otcancel: true,
      },
    });
    if (inputCall?.mode !== "input") throw new Error("input dialog is not an input dialog");
    inputCall.resolve("entered");
    await expect(input).resolves.toBe("entered");
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(3);
    const inputFullCall = harness.pending[2];
    expect(inputFullCall).toMatchObject({
      mode: "input",
      params: {
        mode: "input",
        title: "full input",
        text: "full input text",
        input: "full value",
        type: "number",
        confirmLabel: "Use",
        cancelLabel: "Back",
      },
    });
    if (inputFullCall?.mode !== "input") throw new Error("inputF is not an input dialog");
    inputFullCall.resolve(false);
    await expect(inputFull).resolves.toBe(false);
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(4);
    const fullCall = harness.pending[3];
    expect(fullCall).toMatchObject({
      mode: "check",
      params: {
        mode: "check",
        title: "full check",
        text: "full check text",
        otcancel: true,
      },
    });
    if (fullCall?.mode !== "check") throw new Error("full dialog is not a check dialog");
    fullCall.resolve(undefined);
    await expect(full).resolves.toBeUndefined();
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(5);
    const checkFullCall = harness.pending[4];
    expect(checkFullCall).toMatchObject({
      mode: "check",
      params: {
        mode: "check",
        title: "full check 2",
        text: "full check text 2",
        confirmLabel: "Approve",
        cancelLabel: "Reject",
      },
    });
    if (checkFullCall?.mode !== "check") throw new Error("checkF is not a check dialog");
    checkFullCall.resolve(false);

    await expect(check).resolves.toBe(true);
    await expect(input).resolves.toBe("entered");
    await expect(inputFull).resolves.toBe(false);
    await expect(full).resolves.toBeUndefined();
    await expect(checkFull).resolves.toBe(false);
  });

  it("continues with later dialogs after a rejected task", async () => {
    const { showDialog, harness } = await loadDialog();
    const error = new Error("first dialog failed");

    const first = showDialog.checkF({ title: "failure" });
    const second = showDialog.input("later");
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(1);
    const firstCall = harness.pending[0];
    if (firstCall?.mode !== "check") throw new Error("first dialog is not a check dialog");
    firstCall.reject(error);
    await expect(first).rejects.toBe(error);
    await flushDialogQueue();

    expect(harness.pending).toHaveLength(2);
    const secondCall = harness.pending[1];
    expect(secondCall).toMatchObject({
      mode: "input",
      params: { mode: "input", title: "later" },
    });
    if (secondCall?.mode !== "input") throw new Error("second dialog is not an input dialog");
    secondCall.resolve("continued");
    await expect(second).resolves.toBe("continued");
  });
});
