/**
 * 收藏帖子类型定义文件
 * @since Beta v0.4.5
 */

declare namespace TGApp.Sqlite.Collection {
  /**
   * 用户收藏帖子表
   * @since Beta v0.4.5
   * @remarks UFPost 表
   */
  type PostRaw = {
    /** 帖子 ID */
    id: string;
    /** 帖子标题 */
    title: string;
    /**
     * 帖子内容
     * @remarks 序列化，反序列化后是 {@link TGApp.BBS.Post.FullData} 类型
     */
    content: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 用户收藏合集表
   * @since Beta v0.4.5
   * @remarks UFCollection 表
   */
  type Collection = {
    /**
     * 合集ID
     * @remarks 自增ID
     */
    id: string;
    /** 合集标题 */
    title: string;
    /** 合集描述 */
    desc: string;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 帖子-合集对应数据
   * @since Beta v0.4.5
   * @remarks UFMap 表
   */
  type PcMap = {
    /** 帖子 ID */
    postId: string;
    /** 合集ID */
    collectionId: string;
    /** 帖子标题 */
    post: string;
    /** 合集标题 */
    collection: string;
    /** 合集描述 */
    desc: string;
    /** 更新时间 */
    updated: string;
  };
}
