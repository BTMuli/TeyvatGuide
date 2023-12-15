/**
 * @file plugins/Hutao/types/Weapon.d.ts
 * @description 武器组件类型定义
 * @since Beta v0.3.8
 */

/**
 * @description 武器类型 namespace
 * @since Beta v0.3.8
 * @namespace TGApp.Plugins.Hutao.Weapon
 * @memberof TGApp.Plugins.Hutao
 */
declare namespace TGApp.Plugins.Hutao.Weapon {
  /**
   * @description 元数据-胡桃
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Weapon
   * @description RawHutaoItem => Rhi
   * @property {number} Id 角色编号
   * @property {number} PromoteId 未知
   * @property {TGApp.Plugins.Hutao.Base.WeaponType} WeaponType 武器类型
   * @property {number} RankLevel 武器星级
   * @property {string} Name 武器名称
   * @property {string} Description 武器简介
   * @property {string} Icon 武器图标
   * @property {string} AwakenIcon 武器觉醒图标
   * @property {number} GrowCurves.InitValue 未知
   * @property {number} GrowCurves.Type 未知
   * @property {number} GrowCurves.Value 未知
   * @property {RhiAffix} Affix 精炼描述
   * @property {number[]} CultivationItems 武器培养材料
   * @return RawHutaoItem
   */
  interface RawHutaoItem {
    Id: number;
    PromoteId: number;
    WeaponType: TGApp.Plugins.Hutao.Base.WeaponType;
    RankLevel: number;
    Name: string;
    Description: string;
    Icon: string;
    AwakenIcon: string;
    GrowCurves: {
      InitValue: number;
      Type: number;
      Value: number;
    };
    Affix: RhiAffix;
    CultivationItems: number[];
  }

  /**
   * @description 精炼描述
   * @since Beta v0.3.8
   * @memberof TGApp.Plugins.Hutao.Weapon
   * @interface RhiAffix
   * @property {string} Name 精炼名称
   * @property {Array<{Level: number; Description: string}>} Description 精炼描述
   * @return RhiAffix
   */
  interface RhiAffix {
    Name: string;
    Description: Array<{
      Level: number;
      Description: string;
    }>;
  }
}
