/**
 * @file types BBS.d.ts
 * @description 米游社BBS相关类型定义
 * @auther BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

declare namespace BTMuli.SQLite {
  /**
   * @description BBS帖子数据
   * @interface BBSPost
   * @since Alpha v0.1.4
   * @property {number} id 帖子ID
   * @property {created} created 帖子创建时间
   * @property {modified} modified 帖子修改时间
   * @return BBSPost
   */
  export interface BBSPost {
    id: number
    created: string
    modified: string
  }
}
