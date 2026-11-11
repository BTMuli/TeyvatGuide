/**
 * 米社商店商品展示格式。
 * @since Beta v0.13.1
 */

import fmtUtil from "@utils/display/fmtUtil.js";

import { getShopGoodsLimits, getShopGoodsStatus, parseShopTime } from "./shop.js";

/**
 * 商品状态的展示文案。
 * @since Beta v0.13.1
 */
const shopStatusLabels: Readonly<Record<TGApp.BBS.Shop.GoodsStatus, string>> = {
  available: "可兑换",
  upcoming: "待开售",
  "sold-out": "已售罄",
  ended: "已结束",
  "limit-reached": "已达限购",
  unavailable: "暂不可兑换",
};

/**
 * 获取商品限购范围的说明。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 账号和角色的限购说明
 */
export function getShopLimitText(goods: TGApp.BBS.Shop.Goods): string {
  return getShopGoodsLimits(goods)
    .map(
      (limit) =>
        `${limit.scope === "account" ? "账号" : "角色"}限兑 ${fmtUtil.num(limit.limit)} 件，剩余 ${fmtUtil.num(limit.remaining)} 件`,
    )
    .join(" · ");
}

/**
 * 获取最严格限购范围的剩余数量与上限。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 剩余数量/上限；不限购时返回空字符串
 */
export function getShopLimitBadge(goods: TGApp.BBS.Shop.Goods): string {
  const limit = getShopGoodsLimits(goods).sort(
    (a, b) => a.remaining - b.remaining || a.limit - b.limit,
  )[0];
  return limit ? `${fmtUtil.num(limit.remaining)}/${fmtUtil.num(limit.limit)}` : "";
}

/**
 * 判断当前批次库存是否售罄，不影响下一批开售状态。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 当前批次是否售罄
 */
export function isShopBatchSoldOut(goods: TGApp.BBS.Shop.Goods): boolean {
  return !goods.unlimit && goods.total <= 0;
}

/**
 * 格式化下一批开售时间。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 下一批开售时间；未安排下一批时返回空字符串
 */
export function getShopNextTimeText(goods: TGApp.BBS.Shop.Goods): string {
  const time = parseShopTime(goods.next_time);
  if (!time) return "";
  return new Date(time).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 获取当前库存的完整说明。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 库存说明
 */
export function getShopStockText(goods: TGApp.BBS.Shop.Goods): string {
  return goods.unlimit ? "库存不限" : `当前库存 ${fmtUtil.num(Math.max(0, goods.total))}`;
}

/**
 * 获取商品当前状态的展示文案。
 * @since Beta v0.13.1
 * @param goods - 商品信息
 * @returns 状态文案
 */
export function getShopStatusText(goods: TGApp.BBS.Shop.Goods): string {
  return shopStatusLabels[getShopGoodsStatus(goods)];
}
