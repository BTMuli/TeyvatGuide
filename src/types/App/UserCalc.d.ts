/**
 * 用户养成计算相关类型定义文件
 * @since Beta v0.11.2
 */

declare namespace TGApp.App.UserCalc {
  /**
   * 角色选择项
   * @since Beta v0.11.2
   */
  type CharacterOption = {
    /**
     * 选择器中显示的角色标题
     * @since Beta v0.11.2
     */
    title: string;
    /** 角色 ID */
    value: number;
    /** 用户存档中的角色数据 */
    role: TGApp.Sqlite.Character.TableTrans;
    /** 角色使用的武器类型 */
    weaponType: string;
  };

  /**
   * 武器选择项
   * @since Beta v0.11.2
   */
  type WeaponOption = {
    /** 用于区分背包武器和默认武器的唯一键 */
    key: string;
    /** 选择器中显示的武器标题 */
    title: string;
    /** 武器 Wiki 数据 */
    wiki: TGApp.App.Weapon.WikiItem;
    /** 当前等级 */
    level: number;
    /** 已完成的突破次数 */
    promoteLevel: number;
    /** 精炼等级 */
    affixLevel: number;
    /** 是否来自用户背包 */
    fromBag: boolean;
    /** 是否已锁定 */
    locked: boolean;
    /** 背包武器 GUID */
    guid?: string;
  };

  /**
   * 合成方案实际消耗的背包材料
   * @since Beta v0.11.2
   */
  type CraftingCost = {
    /** 材料 ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 合成消耗数量 */
    count: number;
    /** 背包持有数量 */
    owned: number;
  };

  /**
   * 材料需求计算结果
   * @since Beta v0.11.2
   */
  type ResultMaterial = {
    /** 材料 ID */
    id: number;
    /** 材料名称 */
    name: string;
    /** 材料类型 */
    type: string;
    /** 材料星级 */
    star: number;
    /** 所需数量 */
    required: number;
    /** 已持有数量 */
    owned: number;
    /** 可通过合成补足的数量 */
    craftable: number;
    /** 合成补足方案实际消耗的背包材料 */
    craftingCosts: Array<CraftingCost>;
    /** 缺少数量 */
    missing: number;
    /** 持有与可合成数量的合计进度，取值范围为 0 到 100 */
    progress: number;
  };
}
