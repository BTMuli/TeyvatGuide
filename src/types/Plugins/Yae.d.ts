/**
 * Yae 插件类型定义
 * @since Beta v0.9.0
 */

declare namespace TGApp.Plugins.Yae {
  /**
   * 后端返的成就列表数据
   * @since Beta v0.7.8
   */
  type AchiListRes = Array<TGApp.Plugins.UIAF.Achievement>;

  /**
   * 后端返的背包物品数据
   * @since Beta v0.9.0
   */
  type BagListRes = Array<BagItemUnion>;

  /**
   * 背包物品类型
   * @since Beta v0.9.0
   */
  type BagItemUnion =
    | BagItemMaterial
    | BagItem<"weapon">
    | BagItem<"reliquary">
    | BagItem<"furniture">
    | BagItem<"virtual">
    | BagItem<"unknown">;

  /**
   * 背包物品-材料
   * @since Beta v0.9.0
   */
  type BagItemMaterial = BagItem<"material">;

  /**
   * 背包物品信息
   * @since Beta v0.9.0
   */
  type BagItem<T extends ItemKindEnum> = {
    /** 物品ID */
    item_id: number;
    /** 物品类型 */
    kind: T;
    /** 物品信息 */
    info: ItemInfoMap[T];
  };

  /**
   * 物品信息表，用于锁定类型
   * @since Beta v0.9.0
   */
  type ItemInfoMap = {
    /** 材料 */
    material: MaterialInfo;
    /** 圣遗物 */
    reliquary: ReliquaryInfo;
    /** 武器 */
    weapon: WeaponInfo;
    /** 家具 */
    furniture: FurnitureInfo;
    /** 虚拟物品 */
    virtual: VirtualInfo;
    /** 未知 */
    unknown: Record<string, never>;
  };

  /**
   * 物品类型
   * @since Beta v0.9.0
   */
  const ItemKindType = <const>{
    /** 材料 */
    material: "material",
    /** 圣遗物 */
    relic: "reliquary",
    /** 武器 */
    weapon: "weapon",
    /** 家具 */
    furniture: "furniture",
    /** 虚拟物品 */
    virtual: "virtual",
    /** 未知 */
    unknown: "unknown",
  };

  /**
   * 物品类型枚举
   * @since Beta v0.9.0
   */
  type ItemKindEnum = (typeof ItemKindType)[keyof typeof ItemKindType];

  /**
   * 材料物品信息
   * @since Beta v0.9.0
   */
  type MaterialInfo = {
    /** 数量 */
    count: number;
  };

  /**
   * 圣遗物物品信息
   * @since Beta v0.9.0
   */
  type ReliquaryInfo = {
    /** 等级 */
    level: number;
    /** 经验 */
    exp: number;
    /** 精炼等级 */
    promote_level: number;
    /** 主属性ID */
    main_prop_id: number;
    /** 副属性 */
    append_prop_id_list: Array<number>;
    /** 是否标记 */
    is_marked: boolean;
    /** 是否锁定 */
    is_locked: true;
  };

  /**
   * 武器信息
   * @since Beta v0.9.0
   */
  type WeaponInfo = {
    /** 等级 */
    level: number;
    /** 经验 */
    exp: number;
    /** 精炼等级 */
    promote_level: number;
    /** 未知Map */
    affix_map: Record<string, number>;
    /** 未知属性 */
    is_arkhe_ousia: boolean;
    /** 是否锁定 */
    is_locked: boolean;
  };

  /**
   * 家具信息
   * @since Beta v0.9.0
   */
  type FurnitureInfo = {
    /** 数量 */
    count: number;
  };

  /**
   * 虚拟物品
   * @since Beta v0.9.0
   */
  type VirtualInfo = {
    /** 数量 */
    count: number;
  };
}
