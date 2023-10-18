/**
 * @file types App GCG.d.ts
 * @description 本应用的卡牌相关类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.3
 */

declare namespace TGApp.App.GCG {
  /**
   * @description Wiki页用到的简略信息
   * @interface WikiBriefInfo
   * @since Beta v0.3.3
   * @property {number} id - 卡牌 ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {string} icon - 卡牌图标
   * @property {Partial<GCGTags>} tags - 卡牌标签
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    type: string;
    icon: string;
    tags: Partial<GCGTags> | null;
  }

  /**
   * @description 卡牌 Tag
   * @interface GCGTags
   * @since Beta v0.3.3
   * @description 元素标签
   * @property {string} GCG_TAG_ELEMENT_CRYO - 冰元素
   * @property {string} GCG_TAG_ELEMENT_DENDRO - 草元素
   * @property {string} GCG_TAG_ELEMENT_ELECTRO - 雷元素
   * @property {string} GCG_TAG_ELEMENT_GEO - 岩元素
   * @property {string} GCG_TAG_ELEMENT_HYDRO - 水元素
   * @property {string} GCG_TAG_ELEMENT_PYRO - 火元素
   * @property {string} GCG_TAG_ELEMENT_ANEMO - 风元素
   * @description 武器标签
   * @property {string} GCG_TAG_WEAPON_SWORD - 单手剑
   * @property {string} GCG_TAG_WEAPON_CLAYMORE - 双手剑
   * @property {string} GCG_TAG_WEAPON_POLE - 长柄武器
   * @property {string} GCG_TAG_WEAPON_BOW - 弓
   * @property {string} GCG_TAG_WEAPON_CATALYST - 法器
   * @property {string} GCG_TAG_WEAPON_NONE - 无
   * @description 地区标签
   * @property {string} GCG_TAG_NATION_MONDSTADT - 蒙德
   * @property {string} GCG_TAG_NATION_LIYUE - 璃月
   * @property {string} GCG_TAG_NATION_INAZUMA - 稻妻
   * @property {string} GCG_TAG_NATION_SUMERU - 须弥
   * @description 阵营
   * @property {string} GCG_TAG_CAMP_FATUI - 愚人众
   * @property {string} GCG_TAG_CAMP_MONSTER - 魔物
   * @property {string} GCG_TAG_CAMP_HILICHURL - 丘丘人
   * @return GCGTags
   */
  export interface GCGTags {
    GCG_TAG_ELEMENT_CRYO: string;
    GCG_TAG_ELEMENT_DENDRO: string;
    GCG_TAG_ELEMENT_ELECTRO: string;
    GCG_TAG_ELEMENT_GEO: string;
    GCG_TAG_ELEMENT_HYDRO: string;
    GCG_TAG_ELEMENT_PYRO: string;
    GCG_TAG_ELEMENT_ANEMO: string;
    GCG_TAG_WEAPON_SWORD: string;
    GCG_TAG_WEAPON_CLAYMORE: string;
    GCG_TAG_WEAPON_POLE: string;
    GCG_TAG_WEAPON_BOW: string;
    GCG_TAG_WEAPON_CATALYST: string;
    GCG_TAG_WEAPON_NONE: string;
    GCG_TAG_NATION_MONDSTADT: string;
    GCG_TAG_NATION_LIYUE: string;
    GCG_TAG_NATION_INAZUMA: string;
    GCG_TAG_NATION_SUMERU: string;
    GCG_TAG_CAMP_FATUI: string;
    GCG_TAG_CAMP_MONSTER: string;
    GCG_TAG_CAMP_HILICHURL: string;
  }
}
