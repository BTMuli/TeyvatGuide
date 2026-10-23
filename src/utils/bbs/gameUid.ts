/**
 * 米游社回复 UID 卡片工具
 * @since Beta v0.13.0
 */

import { isRecord } from "@utils/common/typeGuards.js";

/**
 * 大别野分区 ID，该分区为跨游戏社区，UID 卡片不限制游戏范围
 * @since Beta v0.13.0
 */
const VillaGid = 5;

/**
 * 判断值是否为无首尾空白且不含换行的非空字符串
 * @since Beta v0.13.0
 * @param value - 待判断的值
 * @returns 是否为有效字符串
 */
function isGameUidText(value: unknown): value is string {
  return (
    typeof value === "string" && value.trim() === value && value !== "" && !/[\r\n]/u.test(value)
  );
}

/**
 * 判断对象是否只包含指定自有键
 * @since Beta v0.13.0
 * @param value - 待判断的对象
 * @param keys - 允许的键
 * @returns 是否完全匹配指定键
 */
function hasExactKeys(value: Record<string, unknown>, keys: Array<string>): boolean {
  const ownKeys = Object.keys(value);
  return ownKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

/**
 * 校验 UID 卡片请求使用的登录凭据
 * @since Beta v0.13.0
 * @param value - 待校验的凭据
 * @returns 已整理的登录凭据
 */
export function validateGameUidCookie(value: unknown): TGApp.App.Account.Cookie {
  if (!isRecord(value)) throw new TypeError("登录凭据无效");
  const accountId = typeof value.account_id === "string" ? value.account_id.trim() : "";
  const cookieToken = typeof value.cookie_token === "string" ? value.cookie_token.trim() : "";
  const ltoken = typeof value.ltoken === "string" ? value.ltoken.trim() : "";
  const ltuid = typeof value.ltuid === "string" ? value.ltuid.trim() : "";
  if (!accountId || !cookieToken || !ltoken || !ltuid || accountId !== ltuid) {
    throw new TypeError("登录凭据缺少 UID 卡片所需字段");
  }
  return {
    account_id: accountId,
    cookie_token: cookieToken,
    ltoken,
    ltuid,
    mid: typeof value.mid === "string" ? value.mid : "",
    stoken: typeof value.stoken === "string" ? value.stoken : "",
    stuid: typeof value.stuid === "string" ? value.stuid : "",
  };
}

/**
 * 解析 UID 卡片等级
 * @since Beta v0.13.0
 * @param value - 角色接口返回的等级
 * @returns 数字等级
 */
function parseGameUidLevel(value: unknown): number {
  const level =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^[0-9]+$/u.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(level) || level < 0) throw new TypeError("UID 卡片等级无效");
  return level;
}

/**
 * 校验并复制 UID 卡片游戏账号信息
 * @since Beta v0.13.0
 * @param value - 待校验的信息
 * @returns 已校验的 UID 卡片信息
 */
export function validateGameUidInfo(value: unknown): TGApp.BBS.GameUid.Info {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["game_biz", "game_name", "game_uid", "level", "nickname", "region_name"])
  ) {
    throw new TypeError("UID 卡片信息字段无效");
  }
  if (!isGameUidText(value.game_biz) || !/^[A-Za-z0-9_]+$/u.test(value.game_biz)) {
    throw new TypeError("UID 卡片游戏业务标识无效");
  }
  if (!isGameUidText(value.game_name)) throw new TypeError("UID 卡片游戏名称无效");
  if (!isGameUidText(value.game_uid) || !/^[1-9][0-9]*$/u.test(value.game_uid)) {
    throw new TypeError("UID 卡片游戏 UID 无效");
  }
  if (typeof value.level !== "number" || !Number.isSafeInteger(value.level) || value.level < 0) {
    throw new TypeError("UID 卡片等级无效");
  }
  if (!isGameUidText(value.nickname)) throw new TypeError("UID 卡片昵称无效");
  if (!isGameUidText(value.region_name)) throw new TypeError("UID 卡片区域无效");
  return {
    game_biz: value.game_biz,
    game_name: value.game_name,
    game_uid: value.game_uid,
    level: value.level,
    nickname: value.nickname,
    region_name: value.region_name,
  };
}

/**
 * 从绑定角色接口结果创建 UID 卡片信息
 * @since Beta v0.13.0
 * @param account - 绑定游戏角色
 * @param gameName - 游戏显示名称
 * @returns UID 卡片信息
 */
export function createGameUidInfo(
  account: TGApp.BBS.Game.Account,
  gameName: string,
): TGApp.BBS.GameUid.Info {
  return validateGameUidInfo({
    game_biz: account.game_biz,
    game_name: gameName,
    game_uid: account.game_uid,
    level: parseGameUidLevel(account.level),
    nickname: account.nickname,
    region_name: account.region_name,
  });
}

/**
 * 筛选当前分区的绑定角色并转换为可预览的 UID 卡片。
 * 大别野分区为跨游戏社区，返回全部分区绑定角色的 UID 卡片。
 * @since Beta v0.13.0
 * @param accounts - 当前账号的绑定游戏角色
 * @param games - 米游社分区与游戏标识列表
 * @param gid - 当前分区 ID
 * @returns 当前分区中信息有效的 UID 卡片
 */
export function getGameUidInfos(
  accounts: ReadonlyArray<TGApp.BBS.Game.Account>,
  games: ReadonlyArray<Pick<TGApp.BBS.Game.Item, "id" | "name" | "op_name" | "en_name">>,
  gid: number,
): Array<TGApp.BBS.GameUid.Info> {
  const game = games.find((item) => item.id === gid);
  if (!game) return [];
  const gameKeys = new Set([game.op_name, game.en_name].filter((key) => !!key));
  const isVilla = game.id === VillaGid;
  const infos: Array<TGApp.BBS.GameUid.Info> = [];
  for (const account of accounts) {
    try {
      const gameKey = account.game_biz.split("_", 1)[0];
      if (!gameKey) continue;
      if (gameKeys.has(gameKey)) {
        infos.push(createGameUidInfo(account, game.name));
        continue;
      }
      if (!isVilla) continue;
      const accountGame = games.find(
        (item) => item.op_name === gameKey || item.en_name === gameKey,
      );
      if (accountGame) infos.push(createGameUidInfo(account, accountGame.name));
    } catch {
      // 单个角色信息异常时继续显示同分区的其他有效角色。
    }
  }
  return infos;
}

/**
 * 创建 UID 卡片结构化节点
 * @since Beta v0.13.0
 * @param info - UID 卡片信息
 * @returns UID 卡片节点
 */
export function createGameUidNode(info: TGApp.BBS.GameUid.Info): {
  insert: TGApp.BBS.GameUid.Insert;
} {
  return {
    insert: {
      game_user_info: validateGameUidInfo(info),
    },
  };
}

/**
 * 创建 UID 卡片的本地确认预览文本
 * @since Beta v0.13.0
 * @param info - UID 卡片信息
 * @returns 预览文本
 */
export function getGameUidPreviewText(info: TGApp.BBS.GameUid.Info): string {
  const normalized = validateGameUidInfo(info);
  return `${normalized.game_name} · UID ${normalized.game_uid}`;
}
