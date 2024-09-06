/**
 * @file plugins/Mys/types/Collection.d.ts
 * @description Mys 插件合集类型声明
 * @since Beta v0.5.5
 */

/**
 * @description Mys 合集类型
 * @since Beta v0.5.5
 * @namespace TGApp.Plugins.Mys.Collection
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Collection {
  /**
   * @description 合集信息
   * @since Beta v0.3.9
   * @interface Info
   * @property {string} cover 封面
   * @property {string} desc 描述
   * @property {number} id 合集 ID
   * @property {boolean} is_delete 是否删除
   * @property {boolean} is_following 是否关注
   * @property {number} post_num 帖子数量
   * @property {number} post_updated_at 帖子更新时间（秒级时间戳）
   * @property {number} status 状态
   * @property {string} title 标题
   * @property {number} uid 用户 ID
   * @property {number} view_num 浏览量
   * @return Info
   */
  interface Info {
    cover: string;
    desc: string;
    id: number;
    is_delete: boolean;
    is_following: boolean;
    post_num: number;
    post_updated_at: number;
    status: number;
    title: string;
    uid: number;
    view_num: number;
  }

  /**
   * @description 获取合集帖子返回
   * @since Beta v0.3.9
   * @interface ResponsePosts
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Data[]} data.list 合集帖子列表
   * @return ResponsePosts
   */
  interface ResponsePosts extends TGApp.BBS.Response.BaseWithData {
    data: {
      posts: Data[];
    };
  }

  /**
   * @description 合集帖子
   * @since Beta v0.3.9
   * @interface Data
   * @see TGApp.Plugins.Mys.Post.FullData
   * @return Data
   */
  type Data = TGApp.Plugins.Mys.Post.FullData;
}
