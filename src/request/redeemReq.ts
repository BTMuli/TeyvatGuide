/**
 * 国服游戏兑换请求
 * @since Beta v0.13.0
 */
import { isValidRedeemCode } from "@utils/game/redeemCode.js";
import { getRedeemConfigByBiz } from "@utils/game/redeemConfig.js";
import TGHttps from "@utils/network/TGHttps.js";

/**
 * 检查 UID 是否仅包含数字
 * @since Beta v0.13.0
 * @param value - UID
 * @returns 是否为数字 UID
 */
function isNumericUid(value: string): boolean {
  return (
    value.length > 0 && Array.from(value).every((character) => character >= "0" && character <= "9")
  );
}

/**
 * 校验角色所属账号
 * @since Beta v0.13.0
 */
function validateAccount(role: TGApp.Sqlite.Account.Game, cookie: TGApp.App.Account.Cookie): void {
  if (!getRedeemConfigByBiz(role.gameBiz)?.regions.includes(role.region)) {
    throw new Error("仅支持原神或绝区零国服角色");
  }
  if (
    !isNumericUid(role.gameUid) ||
    !cookie.account_id ||
    !cookie.cookie_token ||
    cookie.account_id !== role.uid
  ) {
    throw new Error("登录凭据不可用，请重新登录");
  }
  if ([cookie.ltuid, cookie.stuid].some((uid) => uid && uid !== cookie.account_id)) {
    throw new Error("登录凭据账号不一致，请重新登录");
  }
}

/**
 * 只序列化兑换所需的已校验凭据
 * @since Beta v0.13.0
 * @param cookie - 当前账号凭据
 * @returns Cookie 请求头
 */
function serializeCookie(cookie: TGApp.App.Account.Cookie): string {
  const credentials = {
    account_id: cookie.account_id,
    cookie_token: cookie.cookie_token,
    ltuid: cookie.ltuid,
    ltoken: cookie.ltoken,
    stuid: cookie.stuid,
    stoken: cookie.stoken,
    mid: cookie.mid,
  };
  if (Object.values(credentials).some((value) => /[;\r\n]/u.test(value))) {
    throw new Error("登录凭据格式错误，请重新登录");
  }
  return Object.entries(credentials)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value};`)
    .join("");
}

/**
 * 将官方业务码映射为安全的展示消息
 * @since Beta v0.13.0
 * @param retcode - 官方业务码
 * @returns 不含外部响应文本的消息
 */
function getRedeemMessage(retcode: number): string {
  if (retcode === 0) return "兑换成功，请到游戏邮件领取奖励";
  const messages: Record<number, string> = {
    [-2001]: "兑换码已过期",
    [-2003]: "无效的兑换码",
    [-2016]: "兑换冷却中，请稍后重试",
    [-1071]: "登录已失效，请重新登录",
    [-1033]: "登录验证失败，请重新登录",
    [-1035]: "需要完成安全验证，请重新登录",
  };
  return `${messages[retcode] ?? "兑换失败"}（业务码 ${retcode}）`;
}

/**
 * 使用当前角色所属账号的凭据兑换一个国服游戏兑换码，不重试
 * @since Beta v0.13.0
 * @param code - 兑换码
 * @param role - 当前选中的游戏角色
 * @param cookie - 角色所属账号的凭据
 * @returns 不含外部响应文本的兑换结果
 */
export default async function redeemCode(
  code: string,
  role: TGApp.Sqlite.Account.Game,
  cookie: TGApp.App.Account.Cookie,
): Promise<Pick<TGApp.BBS.Response.Base, "retcode" | "message">> {
  validateAccount(role, cookie);
  if (!isValidRedeemCode(code)) throw new Error("兑换码格式错误");
  const response = await TGHttps.get<TGApp.BBS.Response.Base>(
    `https://${getRedeemConfigByBiz(role.gameBiz)?.host}/common/apicdkey/api/webExchangeCdkey`,
    {
      headers: { Cookie: serializeCookie(cookie), Referer: "https://webstatic.mihoyo.com/" },
      query: {
        cdkey: code,
        game_biz: role.gameBiz,
        region: role.region,
        uid: role.gameUid,
        lang: "zh-cn",
        t: String(Date.now()),
      },
      maxRedirections: 0,
      timeout: 20000,
    },
  );
  if (!Number.isInteger(response.data?.retcode)) throw new Error("兑换响应无效");
  const retcode = response.data.retcode;
  return { retcode, message: getRedeemMessage(retcode) };
}
