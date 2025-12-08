/**
 * 本应用的祈愿相关类型定义
 * @since Beta v0.8.9
 */

declare namespace TGApp.App.Gacha {
  /**
   * 祈愿类型枚举
   * @since Beta v0.8.7
   */
  const WishType = <const>{
    /** 新手祈愿 */
    Newbie: 100,
    /** 常驻祈愿 */
    Normal: 200,
    /** 角色活动祈愿 */
    CharacterUp: 301,
    /** 角色活动祈愿2 */
    CharacterUp2: 400,
    /** 武器活动祈愿 */
    WeaponUp: 302,
    /** 集录祈愿 */
    MixUp: 500,
  };

  /**
   * 祈愿类型枚举
   * @since Beta v0.8.4
   */
  type WishTypeEnum = (typeof WishType)[keyof typeof WishType];

  /**
   * 千星奇域祈愿类型
   * @since Beta v0.8.4
   */
  const WishTypeB = <const>{
    /** 常驻祈愿 */
    Normal: "1000",
    /** 活动祈愿 */
    Event: "2000",
    /** 男性活动祈愿1 */
    EventBoy1: "20011",
    /** 男性活动祈愿2 */
    EventBoy2: "20012",
    /** 女性活动祈愿1 */
    EventGirl1: "20021",
    /** 女性活动祈愿2 */
    EventGirl2: "20022",
  };

  /**
   * 千星奇域祈愿类型
   * @since Beta v0.8.4
   */
  type WishTypeBEnum = (typeof WishTypeB)[keyof typeof WishTypeB];

  /**
   * @description 祈愿记录项
   * @interface PoolItem
   * @since Beta v0.4.4
   * @property {string} name 卡池名称
   * @property {string} version 卡池版本
   * @property {number} order 卡池排序
   * @property {string} banner 卡池横幅
   * @property {string} from 卡池开始时间 yyyy-MM-ddTHH:mm:ss+08:00
   * @property {string} to 卡池结束时间 yyyy-MM-ddTHH:mm:ss+08:00
   * @property {WishType} type 卡池类型
   * @property {string} postId 卡池帖子ID
   * @property {number[]} up5List up五星
   * @property {number[]} up4List up四星
   * @return PoolItem
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
    /** 卡池类型 */
    type: number;
    /** 卡池帖子ID */
    postId: string;
    /** up五星 */
    up5List: Array<number>;
    /** up四星 */
    up4List: Array<number>;
  };

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
