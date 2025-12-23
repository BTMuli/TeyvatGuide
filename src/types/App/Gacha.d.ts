/**
 * 本应用的祈愿相关类型定义
 * @since Beta v0.8.9
 */

declare namespace TGApp.App.Gacha {
  /**
   * 祈愿卡池
   * @since Beta v0.4.4
   */
  type PoolItem = {
    /** 卡池名称 */
    name: string;
    /** 卡池版本 */
    version: string;
    /** 卡池排序 */
    order: number;
    /** 卡池横幅 */
    banner: string;
    /** 卡池开始时间 yyyy-MM-ddTHH:mm:ss+08:00 */
    from: string;
    /** 卡池结束时间 yyyy-MM-ddTHH:mm:ss+08:00 */
    to: string;
    /** 卡池类型 {@link PoolGachaType} */
    type: number;
    /** 卡池帖子ID */
    postId: string;
    /** up五星 */
    up5List: Array<number>;
    /** up四星 */
    up4List: Array<number>;
  };

  /**
   * 卡池类型
   * @since Beta v0.9.1
   */
  type PoolGachaType = Exclude<
    TGApp.Game.Gacha.GachaTypeEnum,
    (typeof TGApp.Game.Gacha.GachaType)["Newbie" | "Normal"]
  >;

  /**
   * 千星奇域祈愿元数据
   * @since Beta v0.8.9
   */
  type GachaBMeta = {
    /** ID */
    id: string;
    /** 名称 */
    name: string;
    /** 图标 */
    icon: string;
    /** 稀有度 */
    rank: number;
    /** 类型 */
    type: string;
  };
}
