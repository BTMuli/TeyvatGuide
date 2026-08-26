/**
 * Yae 插件类型定义
 * @since Beta v0.11.5
 */

declare namespace TGApp.Plugins.Yae {
  /**
   * 后端返的事件数据
   * @since Beta v0.11.5
   */
  type RsEvent = {
    /** 数据，序列化后的JSON */
    data: string;
    /** 类型 */
    type: "achievement" | "store" | "prop" | "avatar";
    /** 存档UID，需要预先输入 */
    uid: string;
  };

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
   * 后端返回的属性数据
   * @since Beta v0.9.1
   */
  type PropRes = Record<number, number>;

  /**
   * 后端返回的角色列表数据
   * @since Beta v0.11.5
   */
  type AvatarListRes = Array<AvatarInfo>;

  /**
   * 后端返回的角色信息
   * @since Beta v0.11.5
   */
  type AvatarInfo = {
    /** 角色 ID */
    avatar_id: number;
    /** 角色 GUID */
    guid: string;
    /** 属性表 */
    prop_map: Record<string, PropValue>;
    /** 存活状态 */
    life_state: number;
    /** 装备 GUID 列表 */
    equip_guid_list: Array<string>;
    /** 命座 ID 列表 */
    talent_id_list: Array<number>;
    /** 战斗属性 */
    fight_prop_map: Record<string, number>;
    /** 技能库 ID */
    skill_depot_id: number;
    /** 核心天赋等级 */
    core_proud_skill_level: number;
    /** 固有天赋列表 */
    inherent_proud_skill_list: Array<number>;
    /** 技能等级 */
    skill_level_map: Record<string, number>;
    /** 天赋额外等级 */
    proud_skill_extra_level_map: Record<string, number>;
    /** 角色类型 */
    avatar_type: number;
    /** 风之翼 ID */
    wearing_flycloak_id: number;
    /** 出生时间 */
    born_time: number;
    /** 衣装 ID */
    costume_id: number;
  };

  /**
   * 属性值
   * @since Beta v0.11.5
   */
  type PropValue = {
    /** 整数值 */
    ival: number | null;
    /** 浮点值 */
    fval: number | null;
    /** 通用值 */
    val: number;
  };

  /**
   * 背包物品类型
   * @since Beta v0.11.0
   */
  type BagItemUnion =
    | BagItemMaterial
    | BagItemWeapon
    | BagItemRelic
    | BagItem<"furniture">
    | BagItem<"facility">
    | BagItem<"beyond_material">
    | BagItem<"unknown">;

  /**
   * 背包物品-材料
   * @since Beta v0.9.0
   */
  type BagItemMaterial = BagItem<"material">;

  /**
   * 背包物品-武器
   * @since Beta v0.9.0
   */
  type BagItemWeapon = BagItem<"weapon">;

  /**
   * 背包物品-圣遗物
   * @since Beta v0.9.0
   */
  type BagItemRelic = BagItem<"reliquary">;

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
   * @since Beta v0.11.5
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
    /** Facility */
    facility: FacilityInfo;
    /** BeyondMaterial */
    beyond_material: BeyondMaterialInfo;
    /** 未知 */
    unknown: Record<string, never>;
  };

  /**
   * 物品类型
   * @since Beta v0.11.0
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
    /** Facility */
    facility: "facility",
    /** BeyondMaterial */
    beyondMaterial: "beyond_material",
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
   * @since Beta v0.10.5
   */
  type ReliquaryInfo = {
    /** GUID */
    guid: string;
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
   * @since Beta v0.10.5
   */
  type WeaponInfo = {
    /** GUID */
    guid: string;
    /** 等级 */
    level: number;
    /** 经验 */
    exp: number;
    /** 已完成突破次数 */
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
   * Facility信息
   * @since Beta v0.11.0
   */
  type FacilityInfo = {
    /** 数量 */
    count: number;
  };

  /**
   * BeyondMaterial信息
   * @since Beta v0.11.0
   */
  type BeyondMaterialInfo = {
    /** 数量 */
    count: number;
  };
}
