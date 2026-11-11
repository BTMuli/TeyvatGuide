/**
 * 米游社商店请求。
 * @since Beta v0.13.1
 */

import TGHttps from "@utils/network/TGHttps.js";

const shopApiBaseUrl: Readonly<string> = "https://bbs-api.mihoyo.com/";
const shopReferer: Readonly<string> = "https://webstatic.mihoyo.com/app/community-shop/index.html";
const shopUserAgent: Readonly<string> =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const shopAppId: Readonly<number> = 1;
const shopPointSn: Readonly<"myb"> = "myb";

/**
 * 构建米社商店网页请求头。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @param withBody - 是否为 JSON 请求体
 * @returns 商店请求头
 */
function getShopHeaders(
  cookie: TGApp.App.Account.Cookie,
  withBody: boolean = false,
): Record<string, string> {
  const cookieParts = [
    ["account_id", cookie.account_id],
    ["cookie_token", cookie.cookie_token],
    ["ltoken", cookie.ltoken],
    ["ltuid", cookie.ltuid],
  ]
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}=${value}`);
  const headers: Record<string, string> = {
    "x-rpc-client_type": "4",
    "x-rpc-app_version": "2.102.0",
    "User-Agent": shopUserAgent,
    Origin: "https://www.miyoushe.com",
    Referer: shopReferer,
    Cookie: cookieParts.join("; "),
  };
  if (withBody) headers["Content-Type"] = "application/json";
  return headers;
}

/**
 * 获取米游币余额。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @returns 余额响应
 */
async function getPoint(cookie: TGApp.App.Account.Cookie): Promise<TGApp.BBS.Shop.PointResp> {
  const query = { app_id: shopAppId, point_sn: shopPointSn };
  const resp = await TGHttps.get<TGApp.BBS.Shop.PointResp>(
    `${shopApiBaseUrl}common/homutreasure/v1/web/user/point`,
    { headers: getShopHeaders(cookie), query },
  );
  return resp.data;
}

/**
 * 获取商品列表与接口驱动的分类。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @param game - 分类键；all 按网页端约定发送空值
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页数量
 * @returns 商品列表响应
 */
async function getGoods(
  cookie: TGApp.App.Account.Cookie,
  game: string = "all",
  page: number = 1,
  pageSize: number = 20,
): Promise<TGApp.BBS.Shop.GoodsListResp> {
  const query = {
    app_id: shopAppId,
    point_sn: shopPointSn,
    page,
    page_size: pageSize,
    game: game === "all" ? "" : game,
  };
  const resp = await TGHttps.get<TGApp.BBS.Shop.GoodsListResp>(
    `${shopApiBaseUrl}common/homushop/v1/web/goods/list`,
    { headers: getShopHeaders(cookie), query },
  );
  const response = resp.data;
  if (response.retcode !== 0 || game === "all") return response;
  return {
    ...response,
    data: { ...response.data, list: response.data.list.map((item) => ({ ...item, game })) },
  };
}

/**
 * 获取商品详情。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @param goodsId - 商品 ID
 * @returns 商品详情响应
 */
async function getGoodsDetail(
  cookie: TGApp.App.Account.Cookie,
  goodsId: string,
): Promise<TGApp.BBS.Shop.GoodsDetailResp> {
  const query = { app_id: shopAppId, point_sn: shopPointSn, goods_id: goodsId };
  const resp = await TGHttps.get<TGApp.BBS.Shop.GoodsDetailResp>(
    `${shopApiBaseUrl}common/homushop/v1/web/goods/detail`,
    { headers: getShopHeaders(cookie), query },
  );
  return resp.data;
}

/**
 * 兑换商品。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @param params - 兑换请求体
 * @returns 兑换响应
 */
async function exchange(
  cookie: TGApp.App.Account.Cookie,
  params: TGApp.BBS.Shop.ExchangeParams,
): Promise<TGApp.BBS.Shop.ExchangeResp> {
  const resp = await TGHttps.post<TGApp.BBS.Shop.ExchangeResp>(
    `${shopApiBaseUrl}common/homushop/v1/web/goods/exchange`,
    { headers: getShopHeaders(cookie, true), body: params },
  );
  return resp.data;
}

/**
 * 获取米游币变动记录。
 * @since Beta v0.13.1
 * @param cookie - 当前账户 Cookie
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页数量
 * @returns 米游币记录响应
 */
async function getRecords(
  cookie: TGApp.App.Account.Cookie,
  page: number = 1,
  pageSize: number = 20,
): Promise<TGApp.BBS.Shop.RecordResp> {
  const query = {
    app_id: shopAppId,
    point_sn: shopPointSn,
    page,
    page_size: pageSize,
  };
  const resp = await TGHttps.get<TGApp.BBS.Shop.RecordResp>(
    `${shopApiBaseUrl}common/homutreasure/v1/web/user/record`,
    { headers: getShopHeaders(cookie), query },
  );
  return resp.data;
}

const shopReq = {
  point: getPoint,
  goods: getGoods,
  detail: getGoodsDetail,
  exchange,
  records: getRecords,
};

export default shopReq;
