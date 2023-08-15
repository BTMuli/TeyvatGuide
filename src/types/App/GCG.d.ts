/**
 * @file types App GCG.d.ts
 * @description 本应用的卡牌相关类型定义
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.2
 */

declare namespace TGApp.App.GCG {
  /**
   * @description Wiki页用到的简略信息
   * @interface WikiBriefInfo
   * @since Alpha v0.2.2
   * @property {number} id - 卡牌 ID
   * @property {number} contentId - 观测枢的 content_id
   * @property {string} name - 卡牌名称
   * @property {string} type - 卡牌类型
   * @property {string} icon - 卡牌图标
   * @property {Record<string,string>} tags - 卡牌标签
   * @return WikiBriefInfo
   */
  export interface WikiBriefInfo {
    id: number;
    contentId: number;
    name: string;
    type: string;
    icon: string;
    tags: Record<string, string>;
  }
}
