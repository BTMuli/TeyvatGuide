/**
 * 应用圣遗物数据类型定义
 * @since 0.11.0
 */

declare namespace TGApp.App.Relic {
  /**
   * 套装文件
   * @since 0.11.0
   */
  type RawSet = Array<SetItem>;

  /**
   * 圣遗物ID-圣遗物套装映射
   * @since 0.11.0
   */
  type RelicMap = Record<number, RelicMini>;

  /**
   * 圣遗物文件
   * @since 0.11.0
   */
  type RawRelic = Array<RelicItem>;

  /**
   * MainLv文件
   * @since 0.11.0
   */
  type MainLv = Array<MainLvItem>;

  /**
   * MainProp文件
   * @since 0.11.0
   */
  type MainProp = Record<number, number>;

  /**
   * SubProp文件
   * @since 0.11.0
   */
  type SubProp = Record<number, SubPropItem>;

  /**
   * 套装项
   * @since 0.11.0
   */
  type SetItem = {
    /** 套装ID */
    id: number;
    /** 套装名称 */
    name: string;
    /** 套装图标 */
    icon: string;
    /** 最大星级 */
    maxStar: number;
    /** 星级列表 */
    stars: Array<number>;
    /** 部位列表 */
    pos: Array<number>;
    /** 效果 */
    affix: Array<SetAffix>;
    /** 子部件 */
    suits: Array<SetSuit>;
  };

  /**
   * 套装效果
   * @since 0.11.0
   */
  type SetAffix = {
    /** 计数 */
    cnt: number;
    /** 效果 */
    desc: string;
  };

  /**
   * 套装子部件
   * @since 0.11.0
   */
  type SetSuit = {
    /** 星级 */
    star: number;
    /** 部位 */
    pos: number;
    /** ID列表 */
    list: Array<number>;
  };

  /**
   * MainLv项
   * @since 0.11.0
   */
  type MainLvItem = {
    /** 星级 */
    star: number;
    /** 等级 */
    level: number;
    /** 属性 */
    prop: Record<number, number>;
  };

  /**
   * SubProp项
   * @since 0.11.0
   */
  type SubPropItem = {
    val: number;
    type: number;
  };

  /**
   * 圣遗物-简略
   * @since 0.11.0
   */
  type RelicMini = {
    /** 套装ID */
    set: number;
    /** 星级 */
    star: number;
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /** 部位 */
    pos: number;
  };

  /**
   * 圣遗物项
   * @since 0.11.0
   */
  type RelicItem = {
    /** 圣遗物套装ID */
    set: number;
    /** 部位 */
    pos: number;
    /** 名称 */
    name: string;
    /** 描述 */
    desc: string;
    /** 图标 */
    icon: string;
    /** 故事 */
    story: string;
  };
}
