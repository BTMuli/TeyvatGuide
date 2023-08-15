/**
 * @file types App Character.d.ts
 * @description 角色相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

declare namespace TGApp.App.Character {
  /**
   * @description Wiki 页简略信息
   * @since Alpha v0.2.2
   * @interface WikiBriefInfo
   * @property {number} id - 角色 ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {string} name - 角色名称
   * @property {string} title - 角色称号
   * @property {number[]} birthday - 角色生日 [月, 日]
   * @property {number} star - 角色星级
   * @property {string} element - 角色元素类型图标
   * @property {string} weapon - 角色武器类型图标
   * @property {string} nameCard - 角色名片
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    title: string;
    birthday: number[];
    star: number;
    element: string;
    weapon: string;
    nameCard: string;
  }
}
