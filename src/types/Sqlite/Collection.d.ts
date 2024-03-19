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
   * @description 数据库-用户收藏帖子表
   * @since Beta v0.4.5
   * @interface UFPost
   * @property {string} id - 帖子 ID
   * @property {string} title - 标题
   * @description 反序列化后是 TGApp.Plugins.Mys.Post.FullData
   * @property {string} content - 内容
   * @property {string} updated - 更新时间
   * @return UFPost
   */
  interface UFPost {
    id: string;
    title: string;
    content: string;
    updated: string;
  }

  /**
   * @description 数据库-用户收藏合集表
   * @since Beta v0.4.5
   * @interface UFCollection
   * @property {string} id - 合集 ID
   * @property {string} title - 标题
   * @property {string} desc - 描述
   * @property {string} updated - 更新时间
   * @return UFCollection
   */
  interface UFCollection {
    id: string;
    title: string;
    desc: string;
    updated: string;
  }

  /**
   * @description 数据库-用户收藏帖子合集关联表
   * @since Beta v0.4.5
   * @interface UFMap
   * @property {string} postId - 帖子 ID
   * @property {string} collectionId - 合集 ID
   * @property {string} post - 帖子标题
   * @property {string} collection - 合集标题
   * @property {string} desc - 合集描述
   * @property {string} updated - 更新时间
   * @return UFMap
   */
  interface UFMap {
    postId: string;
    collectionId: string;
    post: string;
    collection: string;
    desc: string;
    updated: string;
  }
}
