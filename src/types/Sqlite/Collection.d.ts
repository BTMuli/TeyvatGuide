/**
 * @file types/Sqlite/Collection.d.ts
 * @description Sqlite UserCollection 类型定义文件
 * @since Beta v0.4.5
 */

/**
 * @description 用户收藏命名空间
 * @since Beta v0.4.5
 * @namespace TGApp.Sqlite.UserCollection
 * @memberof TGApp.Sqlite
 */
declare namespace TGApp.Sqlite.UserCollection {
  /**
   * @description 数据库-用户收藏表
   * @since Beta v0.4.5
   * @interface SingleTable
   * @property {string} postId - 帖子 ID
   * @property {string} title - 标题
   * @property {string} content - 内容
   * @property {string} collect - 合集
   * @property {string} uid - 用户 UID
   * @property {string} updated - 更新时间
   * @return SingleTable
   */
  interface SingleTable {
    postId: string;
    title: string;
    content: string;
    collect: string;
    uid: string;
    updated: string;
  }

  /**
   * @description 渲染卡片
   * @since Beta v0.4.5
   * @interface RenderCard
   */
  type RenderCard = TGApp.Plugins.Mys.Forum.RenderCard;
}
