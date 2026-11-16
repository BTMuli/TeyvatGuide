/**
 * 图鉴持有状态的数据来源、账号隔离与异步清理回归测试。
 * @since Beta v0.13.1
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref } from "vue";

const mocks = vi.hoisted(() => ({
  roles: vi.fn(),
  bagAvatars: vi.fn(),
  weapons: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}));

vi.mock("@/plugins/Sqlite/modules/userAvatar.js", () => ({
  default: { getAvatars: mocks.roles },
}));
vi.mock("@/plugins/Sqlite/modules/userBagAvatar.js", () => ({
  default: { getByUid: mocks.bagAvatars },
}));
vi.mock("@/plugins/Sqlite/modules/userBagWeapon.js", () => ({
  default: { getWeapon: mocks.weapons },
}));
vi.mock("@comp/func/snackbar.js", () => ({
  default: { warn: mocks.warn, error: mocks.error },
}));
vi.mock("@utils/system/TGLogger.js", () => ({ default: { Error: mocks.log } }));

import { useWikiOwnership } from "../src/hooks/useWikiOwnership.js";

const scopes: Array<ReturnType<typeof effectScope>> = [];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.roles.mockResolvedValue([]);
  mocks.bagAvatars.mockResolvedValue([]);
  mocks.weapons.mockResolvedValue([]);
});

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop();
});

/**
 * 创建隔离的图鉴持有状态会话。
 * @since Beta v0.13.1
 * @param mode - 图鉴类型
 * @param initialUid - 初始游戏账号
 * @returns 响应式账号与持有显示状态
 */
function createSession(mode: "character" | "weapon", initialUid = "100000001") {
  const uid = ref<string>(initialUid);
  const scope = effectScope();
  scopes.push(scope);
  const state = scope.run(() => useWikiOwnership(mode, uid));
  if (!state) throw new Error("持有状态会话未初始化");
  return { uid, state, scope };
}

describe("Wiki 已拥有显示", () => {
  it("默认不读取持有数据，角色合并战绩与背包并去重", async () => {
    const roles: Array<Pick<TGApp.Sqlite.Character.TableTrans, "cid">> = [
      { cid: 10000005 },
      { cid: 10000014 },
    ];
    const bagAvatars: Array<Pick<TGApp.Sqlite.UserBag.AvatarTable, "rid">> = [
      { rid: 10000014 },
      { rid: 10000016 },
    ];
    mocks.roles.mockResolvedValue(roles);
    mocks.bagAvatars.mockResolvedValue(bagAvatars);
    const { state } = createSession("character");
    expect(mocks.roles).not.toHaveBeenCalled();
    state.showOwnership.value = true;
    expect(state.loading.value).toBe(true);
    expect(state.ready.value).toBe(false);
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value).toEqual(new Set([10000005, 10000014, 10000016]));
    expect(state.ready.value).toBe(true);
    expect(mocks.roles).toHaveBeenCalledWith(100000001);
    expect(mocks.bagAvatars).toHaveBeenCalledWith(100000001);
    expect(mocks.weapons).not.toHaveBeenCalled();
  });

  it("武器合并背包与角色装备记录，相同武器只计一种", async () => {
    const roles: Array<{ weapon: Pick<TGApp.Sqlite.Character.TableWeapon, "id"> }> = [
      { weapon: { id: 11501 } },
      { weapon: { id: 11501 } },
      { weapon: { id: 11401 } },
    ];
    const weapons: Array<Pick<TGApp.Sqlite.UserBag.WeaponTable, "id">> = [
      { id: 11501 },
      { id: 12501 },
      { id: 12501 },
    ];
    mocks.roles.mockResolvedValue(roles);
    mocks.weapons.mockResolvedValue(weapons);
    const { state } = createSession("weapon");
    state.showOwnership.value = true;
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value).toEqual(new Set([11501, 11401, 12501]));
    expect(mocks.weapons).toHaveBeenCalledWith(100000001);
    expect(mocks.bagAvatars).not.toHaveBeenCalled();
  });

  it("切换账号立即清空旧结果，丢弃晚到的旧账号查询", async () => {
    let finishOld: (roles: Array<{ cid: number }>) => void = () => undefined;
    mocks.roles.mockImplementationOnce(
      () => new Promise<Array<{ cid: number }>>((resolve) => (finishOld = resolve)),
    );
    mocks.roles.mockResolvedValueOnce([{ cid: 10000016 }]);
    const { uid, state } = createSession("character");
    state.showOwnership.value = true;
    uid.value = "100000002";
    expect(state.ownedIds.value.size).toBe(0);
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value).toEqual(new Set([10000016]));
    finishOld([{ cid: 10000014 }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(state.ownedIds.value).toEqual(new Set([10000016]));
    expect(mocks.roles).toHaveBeenLastCalledWith(100000002);
  });

  it("取消显示后旧查询不能恢复结果，再次勾选会重新读取", async () => {
    let finish: (roles: Array<{ cid: number }>) => void = () => undefined;
    mocks.roles.mockImplementationOnce(
      () => new Promise<Array<{ cid: number }>>((resolve) => (finish = resolve)),
    );
    const { state } = createSession("character");
    state.showOwnership.value = true;
    state.showOwnership.value = false;
    finish([{ cid: 10000014 }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(state.loading.value).toBe(false);
    expect(state.ready.value).toBe(false);
    expect(state.ownedIds.value.size).toBe(0);
    mocks.roles.mockResolvedValue([{ cid: 10000016 }]);
    state.showOwnership.value = true;
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value).toEqual(new Set([10000016]));
  });

  it("未选游戏账号时给出提示，选中账号后自动载入", async () => {
    const { uid, state } = createSession("character", "");
    state.showOwnership.value = true;
    expect(mocks.roles).not.toHaveBeenCalled();
    expect(state.ready.value).toBe(false);
    expect(mocks.warn).toHaveBeenCalledWith("请先选择游戏账号");
    uid.value = "100000002";
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(mocks.roles).toHaveBeenCalledWith(100000002);
    expect(state.ownedIds.value.size).toBe(0);
    expect(state.ready.value).toBe(true);
  });

  it("读取失败保留空集合、结束载入并报告错误", async () => {
    mocks.weapons.mockRejectedValue(new Error("database unavailable"));
    const { state } = createSession("weapon");
    state.showOwnership.value = true;
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value.size).toBe(0);
    expect(state.ready.value).toBe(false);
    expect(mocks.error).toHaveBeenCalledWith("读取持有数据失败，请重试");
    expect(mocks.log).toHaveBeenCalledWith(expect.stringContaining("database unavailable"));
    mocks.weapons.mockResolvedValue([{ id: 11501 }]);
    state.showOwnership.value = false;
    state.showOwnership.value = true;
    await vi.waitFor(() => expect(state.loading.value).toBe(false));
    expect(state.ownedIds.value).toEqual(new Set([11501]));
  });
});
