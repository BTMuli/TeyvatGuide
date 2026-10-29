/**
 * 米游社窗口关闭后的桥接回调回归测试。
 * @since Beta v0.13.0
 */

import type { Event, UnlistenFn } from "@tauri-apps/api/event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn<() => Promise<void>>(),
  listen:
    vi.fn<
      (name: string, callback: (event: Event<string>) => Promise<void>) => Promise<UnlistenFn>
    >(),
  warn: vi.fn(async () => undefined),
  info: vi.fn(async () => undefined),
}));

vi.mock("@tauri-apps/api", () => ({
  core: { invoke: mocks.invoke },
  event: { listen: mocks.listen },
  webviewWindow: {},
}));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("@comp/func/snackbar.js", () => ({ default: {} }));
vi.mock("@req/bbsReq.js", () => ({ default: {} }));
vi.mock("@req/otherReq.js", () => ({ default: {} }));
vi.mock("@req/passportReq.js", () => ({ default: {} }));
vi.mock("@req/takumiReq.js", () => ({ default: {} }));
vi.mock("@Sql/index.js", () => ({ default: {} }));
vi.mock("@store/app.js", () => ({ default: vi.fn() }));
vi.mock("@store/user.js", () => ({ default: vi.fn() }));
vi.mock("../src/utils/network/getRequestHeader.js", () => ({ getDS4JS: vi.fn() }));
vi.mock("../src/utils/network/TGHttps.js", () => ({ default: {} }));
vi.mock("../src/utils/system/TGLogger.js", () => ({
  default: { Info: mocks.info, Warn: mocks.warn },
}));
vi.mock("../src/utils/bbs/TGBbs.js", () => ({ default: {} }));
vi.mock("../src/utils/common/toolFunc.js", () => ({ getDeviceInfo: vi.fn() }));
vi.mock("../src/utils/app/linkParser.js", () => ({ parseLink: vi.fn() }));
vi.mock("../src/utils/app/TGWindow.js", () => ({ createPost: vi.fn() }));

const bridgeEvent: Event<string> = {
  event: "post_mhy_client",
  id: 1,
  payload: JSON.stringify({ method: "getStatusBarHeight", callback: "callback", payload: null }),
};

/**
 * 注册真实客户端的桥接监听器并返回可直接等待的回调。
 * @since Beta v0.13.0
 * @returns 桥接事件回调
 */
async function loadListener(): Promise<(event: Event<string>) => Promise<void>> {
  const { default: client } = await import("../src/utils/app/TGClient.js");
  await client.run();
  const listener = mocks.listen.mock.calls[0]?.[1];
  if (listener === undefined) throw new Error("桥接监听器未注册");
  return listener;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.invoke.mockReset();
  mocks.invoke.mockResolvedValue(undefined);
  mocks.listen.mockResolvedValue(vi.fn());
});

describe("米游社桥接回调", () => {
  it("窗口存在时正常执行脚本并返回状态栏高度", async () => {
    const listener = await loadListener();

    await expect(listener(bridgeEvent)).resolves.toBeUndefined();

    expect(mocks.invoke).toHaveBeenCalledTimes(3);
    expect(mocks.invoke).toHaveBeenLastCalledWith("execute_js", {
      label: "mhy_client",
      js: 'javascript:mhyWebBridge("callback", {"retcode":0,"message":"success","data":{"statusBarHeight":0}});',
    });
  });

  it.each([0, 1, 2])(
    "窗口在第 %i 个脚本后关闭时取消剩余回调并可继续处理事件",
    async (completed) => {
      const listener = await loadListener();
      for (let index = 0; index < completed; index += 1) {
        mocks.invoke.mockResolvedValueOnce(undefined);
      }
      mocks.invoke.mockRejectedValueOnce("未找到窗口：mhy_client");

      await expect(listener(bridgeEvent)).resolves.toBeUndefined();

      expect(mocks.invoke).toHaveBeenCalledTimes(completed + 1);
      expect(mocks.warn).toHaveBeenCalledWith(
        "[TGClient][run] 米游社窗口已关闭，取消未完成的桥接回调",
        false,
      );

      await expect(listener(bridgeEvent)).resolves.toBeUndefined();
      expect(mocks.invoke).toHaveBeenCalledTimes(completed + 4);
    },
  );

  it("也处理 Error 形式的窗口关闭错误", async () => {
    const listener = await loadListener();
    mocks.invoke.mockRejectedValueOnce(new Error("未找到窗口：mhy_client"));

    await expect(listener(bridgeEvent)).resolves.toBeUndefined();
  });

  it.each([new Error("脚本执行失败"), "未找到窗口：other_window"])(
    "保留非米游社窗口关闭错误：%s",
    async (error) => {
      const listener = await loadListener();
      mocks.invoke.mockRejectedValueOnce(error);

      await expect(listener(bridgeEvent)).rejects.toBe(error);
    },
  );
});
