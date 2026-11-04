/**
 * 国服兑换支持的游戏配置
 * @since Beta v0.13.0
 * @remarks 覆盖当前米游社已上线分区，排除大别野与未上线游戏。
 */

/** 崩坏 3 国服分区 @since Beta v0.13.0 */
const bh3Regions = <const>["pc01", "android01", "ios01", "bb01", "hun01", "hun02", "yyb01"];

const configs: Array<TGApp.Game.Redeem.Config> = [
  {
    gid: 1,
    biz: "bh3_cn",
    name: "崩坏3",
    host: "api-takumi.mihoyo.com",
    regions: [...bh3Regions],
  },
  {
    gid: 2,
    biz: "hk4e_cn",
    name: "原神",
    host: "hk4e-api.mihoyo.com",
    regions: ["cn_gf01", "cn_qd01"],
  },
  {
    gid: 3,
    biz: "bh2_cn",
    name: "崩坏学园2",
    host: "api-takumi.mihoyo.com",
    // 渠道分区命名不统一，国服 biz 已足够区分；空列表表示接受绑定接口返回的任意分区。
    regions: [],
  },
  {
    gid: 4,
    biz: "nxx_cn",
    name: "未定事件簿",
    host: "api-takumi.mihoyo.com",
    regions: [],
  },
  {
    gid: 6,
    biz: "hkrpg_cn",
    name: "崩坏：星穹铁道",
    host: "public-operation-hkrpg.mihoyo.com",
    regions: ["prod_gf_cn", "prod_qd_cn"],
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

/**
 * 判断角色是否属于支持兑换的国服分区
 * @since Beta v0.13.0
 * @param role - 绑定游戏角色
 * @returns 是否可兑换
 */
export function isRedeemRoleSupported(role: TGApp.Sqlite.Account.Game): boolean {
  const config = getRedeemConfigByBiz(role.gameBiz);
  if (!config) return false;
  return config.regions.length === 0 || config.regions.includes(role.region);
}
