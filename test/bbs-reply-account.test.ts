/**
 * 米游社回复变更账号校验回归测试。
 * @since Beta v0.13.2
 */

import { describe, expect, it, vi } from "vitest";

import { createReplyInteraction } from "../src/hooks/useReplyInteraction.js";
import { executeReplyForCurrentAccount } from "../src/utils/bbs/replyAccount.js";

const snapshot: TGApp.BBS.Reply.AccountSnapshot = {
  uid: "100000001",
  cookie: { ltmid_v2: "mid-value", ltoken_v2: "ltoken-value", ltuid_v2: "100000001" },
};

/**
 * 创建序列化的本地账号状态
 * @since Beta v0.13.0
 * @param uid - 持久化账号 UID
 * @param ltoken - 持久化账号 token
 * @param ltuid - 持久化账号 UID
 * @returns 序列化的账号状态
 */
function serializedAccount(
  uid: string = snapshot.uid,
  ltoken: string = snapshot.cookie.ltoken_v2,
  ltuid: string = snapshot.cookie.ltuid_v2,
  ltmid: string = snapshot.cookie.ltmid_v2,
): string {
  return JSON.stringify({ uid, cookie: { ltmid_v2: ltmid, ltoken_v2: ltoken, ltuid_v2: ltuid } });
}

/**
 * 创建内存存储替身
 * @since Beta v0.13.0
 * @param value - getItem 返回值
 * @returns 仅实现 getItem 的存储替身
 */
function memoryStorage(value: string | null): Pick<Storage, "getItem"> {
  return { getItem: vi.fn(() => value) };
}

describe("executeReplyForCurrentAccount", () => {
  it("runs the action immediately for the matching persisted account", async () => {
    const storage = memoryStorage(serializedAccount());
    let actionStarted = false;
    const action = vi.fn(async () => {
      actionStarted = true;
      return "done";
    });

    const execution = executeReplyForCurrentAccount(snapshot, action, storage);

    expect(actionStarted).toBe(true);
    await expect(execution).resolves.toEqual({ allowed: true, data: "done" });
    expect(action).toHaveBeenCalledTimes(1);
    expect(storage.getItem).toHaveBeenCalledWith("curAccount");
  });

  it("fails closed without invoking the action for invalid account state", async () => {
    const cases: Array<{
      name: string;
      stored: string | null;
      currentSnapshot?: TGApp.BBS.Reply.AccountSnapshot;
      getItem?: () => string | null;
    }> = [
      { name: "switched uid", stored: serializedAccount("100000002", "other-token", "100000002") },
      { name: "logout", stored: serializedAccount("", "", "") },
      { name: "missing key", stored: null },
      { name: "malformed JSON", stored: "{" },
      { name: "null JSON", stored: "null" },
      { name: "missing cookie", stored: JSON.stringify({ uid: snapshot.uid }) },
      { name: "token mismatch", stored: serializedAccount(snapshot.uid, "other-token") },
      {
        name: "ltuid_v2 mismatch",
        stored: serializedAccount(snapshot.uid, snapshot.cookie.ltoken_v2, "100000002"),
      },
      {
        name: "token changed",
        stored: serializedAccount(),
        currentSnapshot: {
          ...snapshot,
          cookie: { ...snapshot.cookie, ltoken_v2: "new-token" },
        },
      },
      {
        name: "mid changed",
        stored: serializedAccount(
          snapshot.uid,
          snapshot.cookie.ltoken_v2,
          snapshot.cookie.ltuid_v2,
          "other-mid",
        ),
      },
      { name: "blank token", stored: serializedAccount(snapshot.uid, "  ") },
      {
        name: "blank snapshot uid",
        stored: serializedAccount("", "", ""),
        currentSnapshot: { uid: "", cookie: { ltmid_v2: "", ltoken_v2: "", ltuid_v2: "" } },
      },
      {
        name: "storage error",
        stored: null,
        getItem: () => {
          throw new Error("storage unavailable");
        },
      },
    ];

    for (const testCase of cases) {
      const storage = testCase.getItem
        ? { getItem: vi.fn(testCase.getItem) }
        : memoryStorage(testCase.stored);
      const action = vi.fn(async () => "must not run");
      const execution = await executeReplyForCurrentAccount(
        testCase.currentSnapshot ?? snapshot,
        action,
        storage,
      );

      expect(execution, testCase.name).toEqual({ allowed: false });
      expect(action, testCase.name).not.toHaveBeenCalled();
    }
  });

  it.each(<const>["switch", "logout"])(
    "blocks an account %s during confirmation and releases the interaction lock",
    async (change) => {
      let stored = serializedAccount();
      const storage = { getItem: vi.fn(() => stored) };
      const action = vi.fn(async () => "must not run");
      const interaction = createReplyInteraction();
      let confirm: (value: boolean) => void = () => undefined;
      const confirmation = new Promise<boolean>((resolve) => {
        confirm = resolve;
      });
      const results: Array<TGApp.BBS.Reply.AccountExecution<string>> = [];
      const pending = interaction.run(async () => {
        if (!(await confirmation)) return;
        results.push(await executeReplyForCurrentAccount(snapshot, action, storage));
      });

      expect(interaction.busy.value).toBe(true);
      expect(storage.getItem).not.toHaveBeenCalled();
      stored =
        change === "switch"
          ? serializedAccount("100000002", "other-token", "100000002")
          : JSON.stringify({});
      confirm(true);
      await pending;

      expect(results).toEqual([{ allowed: false }]);
      expect(action).not.toHaveBeenCalled();
      expect(interaction.busy.value).toBe(false);
    },
  );

  it("propagates action rejection after the account check succeeds", async () => {
    const rejection = new Error("action failed");
    const action = vi.fn().mockRejectedValue(rejection);

    await expect(
      executeReplyForCurrentAccount(snapshot, action, memoryStorage(serializedAccount())),
    ).rejects.toBe(rejection);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
