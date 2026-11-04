/**
 * 国服兑换支持的游戏配置
 * @since Beta v0.13.0
 */
const configs: Array<TGApp.Game.Redeem.Config> = [
  {
    gid: 2,
    biz: "hk4e_cn",
    name: "原神",
    host: "hk4e-api.mihoyo.com",
    regions: ["cn_gf01", "cn_qd01"],
  },
  {
    gid: 8,
    biz: "nap_cn",
    name: "绝区零",
    host: "public-operation-nap.mihoyo.com",
    regions: ["prod_gf_cn", "prod_qd_cn"],
  },
];
/**
 * 按社区分区获取兑换配置
 * @since Beta v0.13.0
 * @param gid - 分区 ID
 * @returns 支持的游戏配置
 */
export function getRedeemConfig(gid: number): TGApp.Game.Redeem.Config | undefined {
  return configs.find((config) => config.gid === gid);
}
/**
 * 按游戏标识获取兑换配置
 * @since Beta v0.13.0
 * @param biz - 游戏标识
 * @returns 支持的游戏配置
 */
export function getRedeemConfigByBiz(biz: string): TGApp.Game.Redeem.Config | undefined {
  return configs.find((config) => config.biz === biz);
}
