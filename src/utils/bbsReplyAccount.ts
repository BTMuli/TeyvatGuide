/**
 * 米游社回复变更的账号一致性校验
 * @since Beta v0.12.6
 */

const currentAccountStorageKey: Readonly<string> = "curAccount";

/**
 * 判断值是否为非空对象
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为非空对象
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 判断字符串是否包含有效内容
 * @since Beta v0.12.6
 * @param value - 待判断的值
 * @returns 是否为非空字符串
 */
function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * 校验回复变更账号快照
 * @since Beta v0.12.6
 * @param value - 待校验的快照
 * @returns 是否为可用于回复变更的快照
 */
function isValidSnapshot(value: unknown): value is TGApp.BBS.Reply.AccountSnapshot {
  if (!isRecord(value) || !isRecord(value.cookie)) return false;
  return (
    isNonBlankString(value.uid) &&
    isNonBlankString(value.cookie.ltoken) &&
    value.cookie.ltuid === value.uid
  );
}

/**
 * 比对持久化账号与回复变更快照
 * @since Beta v0.12.6
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
    return (
      persisted.uid === snapshot.uid &&
      persisted.cookie.ltuid === snapshot.uid &&
      persisted.cookie.ltuid === snapshot.cookie.ltuid &&
      isNonBlankString(persisted.cookie.ltoken) &&
      persisted.cookie.ltoken === snapshot.cookie.ltoken
    );
  } catch {
    return false;
  }
}

/**
 * 在回复变更前校验当前账号
 * @since Beta v0.12.6
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
