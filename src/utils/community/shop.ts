/**
 * 米游社商店商品状态与兑换参数工具。
 * @since Beta v0.13.1
 */

/**
 * 将商店接口中的时间值转换为毫秒时间戳。
 * @since Beta v0.13.1
 * @param value - 秒级/毫秒级时间戳或可解析日期字符串
 * @returns 毫秒时间戳；无法解析时返回 undefined
 */
export function parseShopTime(value: number | string | undefined): number | undefined {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * 获取商品实际可展示的库存数量。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 不限库存时返回 undefined，否则返回当前批次库存
 */
export function getShopGoodsStock(goods: TGApp.BBS.Shop.Goods): number | undefined {
  return goods.unlimit === true ? undefined : Math.max(0, goods.total);
}

/**
 * 获取商品的账户与角色限购信息。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 有效的限购项；未设置限购时返回空数组
 */
export function getShopGoodsLimits(goods: TGApp.BBS.Shop.Goods): Array<TGApp.BBS.Shop.GoodsLimit> {
  const limits: Array<TGApp.BBS.Shop.GoodsLimit> = [];
  const candidates: Array<{
    scope: TGApp.BBS.Shop.GoodsLimit["scope"];
    type: string | undefined;
    limit: number | undefined;
    used: number | undefined;
  }> = [
    {
      scope: "account",
      type: goods.account_cycle_type,
      limit: goods.account_cycle_limit,
      used: goods.account_exchange_num,
    },
    {
      scope: "role",
      type: goods.role_cycle_type,
      limit: goods.role_cycle_limit,
      used: goods.role_exchange_num,
    },
  ];
  for (const candidate of candidates) {
    const limit = candidate.limit;
    if (
      !candidate.type ||
      candidate.type === "not_limit" ||
      limit === undefined ||
      !Number.isFinite(limit)
    )
      continue;
    const used = Math.max(0, candidate.used ?? 0);
    limits.push({
      scope: candidate.scope,
      type: candidate.type,
      limit: Math.max(0, limit),
      used,
      remaining: Math.max(0, limit - used),
    });
  }
  return limits;
}

/**
 * 获取商品当前最小剩余限购数量。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 剩余限购数量；未设置限购时返回 undefined
 */
export function getShopGoodsRemainingLimit(goods: TGApp.BBS.Shop.Goods): number | undefined {
  const limits = getShopGoodsLimits(goods);
  if (!limits.length) return undefined;
  return Math.min(...limits.map((limit) => limit.remaining));
}

/**
 * 判断商品是否可兑换。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @param now - 当前时间；用于测试时可传入固定时间
 * @returns 商品展示状态
 */
export function getShopGoodsStatus(
  goods: TGApp.BBS.Shop.Goods,
  now: number = Date.now(),
): TGApp.BBS.Shop.GoodsStatus {
  const start = Math.max(
    parseShopTime(goods.start) ?? 0,
    parseShopTime(goods.sale_start_time) ?? 0,
  );
  const end = parseShopTime(goods.end);
  if (goods.status !== "online" && goods.status !== "not_in_sell") {
    return "unavailable";
  }
  if (goods.status === "not_in_sell" || now < start) return "upcoming";
  if (end !== undefined && now >= end) return "ended";
  if (getShopGoodsRemainingLimit(goods) === 0) return "limit-reached";
  if (goods.unlimit !== true && goods.total <= 0) {
    const nextTime = parseShopTime(goods.next_time);
    if ((goods.next_num ?? 0) > 0 || (nextTime !== undefined && nextTime > now)) return "upcoming";
    return "sold-out";
  }
  return "available";
}

/**
 * 获取商店接口的业务错误提示，保留服务端给出的封禁等业务说明。
 * @since Beta v0.13.1
 * @param response - 接口响应状态
 * @returns 业务错误提示；成功时返回 undefined
 */
export function getShopResponseError(
  response: Pick<TGApp.BBS.Response.Base, "retcode" | "message">,
): string | undefined {
  if (response.retcode === 0) return undefined;
  if (response.retcode === -10000 || response.retcode === -2007)
    return "登录态已失效，请重新登录米游社账号。";
  if (response.retcode === 1034 || response.retcode === 1028)
    return "需要人机验证，请前往官方商店完成验证后刷新。";
  return `[${response.retcode}] ${response.message}`;
}

/**
 * 构建商店兑换请求体。
 * @since Beta v0.13.1
 * @param goods - 商品详情
 * @param cookie - 当前账户 Cookie
 * @param role - 游戏商品的目标角色；BBS 商品不需要
 * @param exchangeNum - 兑换数量
 * @param addressId - 收货地址 ID
 * @returns 符合商店接口约定的请求体
 */
export function buildShopExchangeParams(
  goods: TGApp.BBS.Shop.Goods,
  cookie: TGApp.App.Account.Cookie,
  role?: TGApp.BBS.Shop.Role,
  exchangeNum: number = 1,
  addressId: number = 0,
): TGApp.BBS.Shop.ExchangeParams {
  if (!Number.isInteger(exchangeNum) || exchangeNum < 1) {
    throw new RangeError("兑换数量必须为正整数");
  }
  const base = {
    app_id: 1,
    point_sn: <const>"myb",
    goods_id: goods.goods_id,
    exchange_num: exchangeNum,
    address_id: Number.isInteger(addressId) && addressId >= 0 ? addressId : 0,
  };
  if (goods.game === "bbs") {
    const accountId = cookie.account_id.trim();
    const ltuid = cookie.ltuid.trim();
    if (accountId && ltuid && accountId !== ltuid) {
      throw new Error("登录凭据账号 ID 不一致，请刷新登录凭据");
    }
    const uid = accountId || ltuid;
    if (!uid) throw new Error("米游社账号 ID 缺失");
    return { ...base, uid, game_biz: "bbs" };
  }
  if (!role?.game_uid || !role.game_biz || !role.region) {
    throw new Error("游戏商品需要选择可用的游戏角色");
  }
  if (goods.game_biz && role.game_biz !== goods.game_biz) {
    throw new Error("所选游戏角色与商品发放业务不匹配");
  }
  return {
    ...base,
    uid: role.game_uid,
    game_biz: role.game_biz,
    region: role.region,
  };
}
