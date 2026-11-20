/**
 * 米游社回复变更的账号一致性校验
 * @since Beta v0.13.2
 */

import { getLTokenCookie, normalizeAccountCookie } from "@utils/account/accountCookie.js";
import { isNonBlankString, isRecord } from "@utils/common/typeGuards.js";

const currentAccountStorageKey: Readonly<string> = "curAccount";

/**
 * 从回复快照或本地存储中提取登录凭据，兼容旧版字段名。
 * @since Beta v0.13.2
 * @param value - 可能包含登录凭据的对象
 * @returns V2 登录凭据；字段缺失时返回 undefined
 */
function getLoginCookie(value: unknown): TGApp.App.Account.LoginCookie | undefined {
  if (!isRecord(value)) return undefined;
  const cookie = normalizeAccountCookie(value);
  if (!isNonBlankString(cookie.ltoken_v2) || !isNonBlankString(cookie.ltuid_v2)) {
    return undefined;
  }
  return getLTokenCookie(cookie);
}

/**
 * 校验回复变更账号快照
 * @since Beta v0.13.2
 * @param value - 待校验的快照
 * @returns 是否为可用于回复变更的快照
 */
function isValidSnapshot(value: unknown): value is TGApp.BBS.Reply.AccountSnapshot {
  if (!isRecord(value) || !isRecord(value.cookie)) return false;
  const cookie = getLoginCookie(value.cookie);
  return isNonBlankString(value.uid) && cookie !== undefined && cookie.ltuid_v2 === value.uid;
}

/**
 * 比对持久化账号与回复变更快照
 * @since Beta v0.13.2
 * @param snapshot - 回复变更账号快照
 * @param storage - 账号持久化存储
 * @returns 持久化账号是否与快照完全匹配
 */
export function matchesCurrentAccount(
  snapshot: unknown,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): snapshot is TGApp.BBS.Reply.AccountSnapshot {
  try {
    if (!isValidSnapshot(snapshot)) return false;
    const serialized = storage.getItem(currentAccountStorageKey);
    if (serialized === null) return false;

    const persisted: unknown = JSON.parse(serialized);
    if (!isRecord(persisted) || !isRecord(persisted.cookie)) return false;
    const persistedCookie = getLoginCookie(persisted.cookie);
    const snapshotCookie = getLoginCookie(snapshot.cookie);
    if (persistedCookie === undefined || snapshotCookie === undefined) return false;
    return (
      persisted.uid === snapshot.uid &&
      persistedCookie.ltuid_v2 === snapshot.uid &&
      persistedCookie.ltuid_v2 === snapshotCookie.ltuid_v2 &&
      persistedCookie.ltoken_v2 === snapshotCookie.ltoken_v2 &&
      persistedCookie.ltmid_v2 === snapshotCookie.ltmid_v2
    );
  } catch {
    return false;
  }
}

/**
 * 在回复变更前校验当前账号
 * @since Beta v0.13.0
 * @typeParam T - 变更 action 的返回值类型
 * @param snapshot - 回复变更账号快照
 * @param action - 通过账号校验后立即执行的变更 action
 * @param storage - 账号持久化存储，默认使用本地存储
 * @returns 账号校验结果与 action 数据
 */
export async function executeReplyForCurrentAccount<T>(
  snapshot: TGApp.BBS.Reply.AccountSnapshot,
  action: () => Promise<T>,
  storage: Pick<Storage, "getItem"> = window.localStorage,
): Promise<TGApp.BBS.Reply.AccountExecution<T>> {
  if (!matchesCurrentAccount(snapshot, storage)) return { allowed: false };
  const data = await action();
  return { allowed: true, data };
}
