/**
 * @file types/App/Calendar.d.ts
 * @description 应用素材日历相关类型定义文件
 * @since Beta v0.6.7
 */

declare namespace TGApp.App.Calendar {
  /**
   * @description 素材日历类型
   * @since Beta v0.6.7
   * @interface Item
   * @property {number} id - 角色ID/武器ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {number[]} dropDays - 掉落日
   * @property {string} name - 角色/武器名称
   * @property {string} itemType - 角色|武器
   * @property {number} star - 角色/武器星级
   * @property {string} weapon - 武器类型图标
   * @property {string} element - 角色元素类型图标
   * @property {Material[]} materials - 日历项需要的素材
   * @property {Source} source - 日历项来源
   * @return Item
   */
  type Item = {
    id: number;
    contentId: number;
    dropDays: number[];
    itemType: string;
    name: string;
    star: number;
    weapon: string;
    element?: string;
    materials: Material[];
    source: Source;
  };

  /**
   * @description 素材日历材料类型
   * @since Beta v0.6.7
   * @interface Material
   * @property {number} id - 素材 ID
   * @property {string} name - 素材名称
   * @property {number} star - 素材星级
   * @return Material
   */
  type Material = { id: number; name: string; star: number };

  /**
   * @description 素材日历来源类型
   * @since Beta v0.6.7
   * @interface Source
   * @property {number} index - 来源索引
   * @property {string} area - 来源区域
   * @property {string} name - 来源名称
   * @return Source
   */
  type Source = { index: number; area: string; name: string };
}
