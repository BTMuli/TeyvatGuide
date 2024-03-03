/**
 * @file types/App/Gacha.d.ts
 * @description 本应用的祈愿相关类型定义
 * @since Beta v0.4.4
 */

/**
 * @description 祈愿记录命名空间
 * @namespace Gacha
 * @since Beta v0.4.4
 * @memberof TGApp.App
 */
declare namespace TGApp.App.Gacha {
  /**
   * @description 祈愿类型枚举
   * @since Beta v0.4.4
   * @enum {number}
   * @property {number} Newbie 新手祈愿 = 100
   * @property {number} Normal 常驻祈愿 = 200
   * @property {number} CharacterUp 角色活动祈愿 = 301
   * @property {number} CharacterUp2 角色活动祈愿2 = 400
   * @property {number} WeaponUp 武器活动祈愿 = 302
   * @property {number} MixUp 集录祈愿 = 500
   * @return WishType
   */
  const enum WishType {
    Newbie = 100,
    Normal = 200,
    CharacterUp = 301,
    CharacterUp2 = 400,
    WeaponUp = 302,
    MixUp = 500,
  }
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
  interface PoolItem {
    name: string;
    version: string;
    order: number;
    banner: string;
    from: string;
    to: string;
    type: WishType;
    postId: string;
    up5List: number[];
    up4List: number[];
  }
}
