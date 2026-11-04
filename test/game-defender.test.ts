/**
 * 正式更新 Windows Defender 确认与登记的边界回归测试。
 * @since Beta v0.13.0
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(command: string, args?: Record<string, unknown>) => Promise<unknown>>(),
  confirm: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@comp/func/dialog.js", () => ({ default: { checkF: mocks.confirm } }));
vi.mock("@comp/func/snackbar.js", () => ({ default: {} }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke, Channel: class {} }));
vi.mock("../src/utils/system/TGLogger.js", () => ({
  default: { Info: vi.fn(), Error: vi.fn() },
}));

import { ensureGamePackageDefenderExclusions } from "../src/utils/game/TGGameLauncher.js";

const dirs: TGApp.Game.Installation.InstallDraftDirs = {
  targetRoot: "C:\\Games\\Genshin",
  spoolRoot: "",
  stagingRoot: "C:\\Games\\Genshin\\.teyvatguide-update\\plan-a",
  downloadRoot: "D:\\Cache\\chunks",
  journalRoot: "D:\\Tasks\\plan-a",
};

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.confirm.mockReset();
  mocks.confirm.mockResolvedValue(true);
  mocks.invoke.mockImplementation(async (command) => {
    if (command === "game_package_defender_dirs") return dirs;
    if (command === "game_install_defender_exclude_status") return false;
    if (command === "game_package_defender_exclude_add") return [dirs.targetRoot];
    throw new Error(`意外的命令：${command}`);
  });
});

describe("更新 Defender 排除确认", () => {
  it("非正式更新跳过登记与 UAC 确认", async () => {
    mocks.invoke.mockResolvedValue(null);
    await ensureGamePackageDefenderExclusions("plan-a");
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("已有排除登记时直接通过", async () => {
    mocks.invoke.mockImplementation(async (command) =>
      command === "game_package_defender_dirs" ? dirs : true,
    );
    await ensureGamePackageDefenderExclusions("plan-a");
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalledWith(
      "game_package_defender_exclude_add",
      expect.anything(),
    );
  });

  it("确认后按计划身份登记后端解析的目录", async () => {
    await ensureGamePackageDefenderExclusions("plan-a");
    expect(mocks.confirm).toHaveBeenCalledOnce();
    expect(mocks.invoke).toHaveBeenCalledWith("game_package_defender_exclude_add", {
      planId: "plan-a",
    });
    expect(mocks.invoke.mock.calls.map(([command]) => command)).toEqual([
      "game_package_defender_dirs",
      "game_install_defender_exclude_status",
      "game_package_defender_exclude_add",
    ]);
  });

  it("取消确认时阻止执行并保持系统排除不变", async () => {
    mocks.confirm.mockResolvedValue(false);
    await expect(ensureGamePackageDefenderExclusions("plan-a")).rejects.toThrow("已取消");
    expect(mocks.invoke).not.toHaveBeenCalledWith(
      "game_package_defender_exclude_add",
      expect.anything(),
    );
  });

  it("目录解析失败时不发起提权", async () => {
    mocks.invoke.mockRejectedValue(new Error("安装目录不可用"));
    await expect(ensureGamePackageDefenderExclusions("plan-a")).rejects.toThrow("安装目录不可用");
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it("提权失败时向调用方报告失败", async () => {
    mocks.invoke.mockImplementation(async (command) => {
      if (command === "game_package_defender_dirs") return dirs;
      if (command === "game_install_defender_exclude_status") return false;
      throw new Error("UAC 已取消");
    });
    await expect(ensureGamePackageDefenderExclusions("plan-a")).rejects.toThrow("UAC 已取消");
  });
});
