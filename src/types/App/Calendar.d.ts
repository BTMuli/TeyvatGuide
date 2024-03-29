/**
 * @file types/App/Calendar.d.ts
 * @description 应用素材日历相关类型定义文件
 * @since Beta v0.3.8
 */

declare namespace TGApp.App.Calendar {
  /**
   * @description 素材日历类型
   * @since Beta v0.3.8
   * @interface Item
   * @property {number} id - 角色ID/武器ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {number[]} dropDays - 掉落日
   * @property {string} name - 角色/武器名称
   * @property {string} itemType - 角色|武器
   * @property {number} star - 角色/武器星级
   * @property {string} bg - 日历项背景
   * @property {string} icon - 日历项图标
   * @property {string} weaponIcon - 武器类型图标
   * @property {string} elementIcon - 角色元素类型图标
   * @property {Material[]} materials - 日历项需要的素材
   * @property {Source} source - 日历项来源
   * @return Item
   */
  interface Item {
    id: number;
    contentId: number;
    dropDays: number[];
    name: string;
    itemType: string; // character | weapon
    star: number;
    bg: string;
    icon: string;
    weaponIcon: string;
    elementIcon?: string;
    materials: Material[];
    source: Source;
  }

  /**
   * @description 素材日历材料类型
   * @since Alpha v0.1.5
   * @interface Material
   * @property {number} id - 素材 ID
   * @property {string} name - 素材名称
   * @property {number} star - 素材星级
   * @property {string} starIcon - 素材星级图标
   * @property {string} bg - 素材背景
   * @property {string} icon - 素材图标
   * @return Material
   */
  interface Material {
    id: number;
    name: string;
    star: number;
    starIcon: string;
    bg: string;
    icon: string;
  }

  /**
   * @description 素材日历来源类型
   * @since Alpha v0.1.5
   * @interface Source
   * @property {string} area - 来源区域
   * @property {string} icon - 来源图标
   * @property {string} name - 来源名称
   * @return Source
   */
  interface Source {
    area: string;
    icon: string;
    name: string;
  }
}
