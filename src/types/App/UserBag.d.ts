/**
 * 应用背包视图类型定义
 * @since Beta v0.12.2
 */

declare namespace TGApp.App.UserBag {
  /**
   * 武器实例及其 Wiki 资料
   * @since Beta v0.12.2
   */
  type WeaponItem = {
    guid: string;
    tb: TGApp.Sqlite.UserBag.WeaponTable;
    info: TGApp.App.Weapon.WikiItem;
  };

  /**
   * 武器合并组
   * @since Beta v0.12.2
   */
  type WeaponGroup = {
    key: string;
    name: string;
    star: number;
    weaponType: string;
    items: Array<WeaponItem>;
    visibleItems: Array<WeaponItem>;
    totalCount: number;
    visibleCount: number;
    representative: WeaponItem;
    minLevel: number;
    maxLevel: number;
    minRefine: number;
    maxRefine: number;
    equippedCount: number;
    lockedCount: number;
  };

  /**
   * 圣遗物星级数量摘要
   * @since Beta v0.12.2
   */
  type RelicStarCount = {
    star: number;
    count: number;
  };

  /**
   * 圣遗物部位数量摘要
   * @since Beta v0.12.2
   */
  type RelicPositionCount = {
    position: number;
    name: string;
    count: number;
  };

  /**
   * 圣遗物套装合并组
   * @since Beta v0.12.2
   */
  type RelicGroup = {
    key: string;
    setId: number;
    setName: string;
    items: Array<TGApp.Sqlite.UserBag.RelicTable>;
    visibleItems: Array<TGApp.Sqlite.UserBag.RelicTable>;
    totalCount: number;
    visibleCount: number;
    representative: TGApp.Sqlite.UserBag.RelicTable;
    starCounts: Array<RelicStarCount>;
    positionCounts: Array<RelicPositionCount>;
    equippedCount: number;
    markedCount: number;
    lockedCount: number;
  };
}
