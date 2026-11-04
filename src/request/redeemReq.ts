/**
 * 国服原神兑换请求
 * @since Beta v0.13.0
 */
import TGHttps from "@utils/network/TGHttps.js";

/**
 * 使用当前角色所属账号的凭据兑换一个国服原神兑换码，不重试
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
): Promise<TGApp.Game.Redeem.Response> {
  if (role.gameBiz !== "hk4e_cn" || !["cn_gf01", "cn_qd01"].includes(role.region)) {
    throw new Error("仅支持国服原神角色");
  }
  if (!/^[\p{L}\p{N}_-]{1,128}$/u.test(code)) throw new Error("兑换码格式错误");
  if (
    !/^\d+$/.test(role.gameUid) ||
    !cookie.account_id ||
    !cookie.cookie_token ||
    cookie.account_id !== role.uid
  ) {
    throw new Error("登录凭据不可用，请重新登录");
  }
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
  for (const uid of [cookie.ltuid, cookie.stuid]) {
    if (uid && uid !== cookie.account_id) throw new Error("登录凭据账号不一致，请重新登录");
  }
  const response = await TGHttps.get<{ retcode: number }>(
    "https://hk4e-api.mihoyo.com/common/apicdkey/api/webExchangeCdkey",
    {
      headers: {
        Cookie: Object.entries(credentials)
          .filter(([, value]) => value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value};`)
          .join(""),
        Referer: "https://webstatic.mihoyo.com/",
      },
      query: {
        cdkey: code,
        game_biz: "hk4e_cn",
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
  const messages: Record<number, string> = {
    [-2001]: "兑换码已过期",
    [-2003]: "无效的兑换码",
    [-2016]: "兑换冷却中，请稍后重试",
    [-1071]: "登录已失效，请重新登录",
    [-1033]: "登录验证失败，请重新登录",
    [-1035]: "需要完成安全验证，请重新登录",
  };
  return {
    retcode,
    message:
      retcode === 0
        ? "兑换成功，请到游戏邮件领取奖励"
        : `${messages[retcode] ?? "兑换失败"}（业务码 ${retcode}）`,
  };
}
