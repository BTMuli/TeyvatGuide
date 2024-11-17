/**
 * @file plugins/Mys/types/Forum.d.ts
 * @description Mys 插件论坛类型定义文件
 * @since Beta v0.6.3
 */

/**
 * @description Mys 插件论坛类型
 * @since Beta v0.4.5
 * @namespace TGApp.Plugins.Mys.Forum
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Forum {
  /**
   * @description 特定论坛返回数据
   * @since Beta v0.3.7
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data 特定论坛数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullData;
  }

  /**
   * @description 特定论坛数据
   * @since Beta v0.6.3
   * @interface FullData
   * @property {string} last_id 最后一条帖子 ID
   * @property {boolean} is_last 是否最后一页
   * @property {boolean} is_origin 是否原创
   * @property {number} page 页码
   * @property {unknown} databox 数据盒子
   * @property {TGApp.Plugins.Mys.Post.FullData[]} list 帖子列表
   * @return FullData
   */
  interface FullData {
    last_id: string;
    is_last: boolean;
    is_origin: boolean;
    page: number;
    databox: unknown;
    list: TGApp.Plugins.Mys.Post.FullData[];
  }

  /**
   * @description 用于渲染的咨讯卡片
   * @since Beta v0.4.0
   * @interface RenderCard
   * @property {string} title 标题
   * @property {string} cover 封面图片 URL
   * @property {string} postId 帖子 ID
   * @property {string} subtitle 副标题
   * @property {TGApp.Plugins.Mys.User.Post} user 发帖用户
   * @property forum 版块
   * @property {string} forum.name 版块名称
   * @property {string} forum.icon 版块图标
   * @property {RenderStatus} status 活动状态，仅活动咨讯有
   * @property data 帖子统计
   * @property {number} data.mark 帖子收藏数
   * @property {number} data.forward 帖子转发数
   * @property {number} data.like 帖子点赞数
   * @property {number} data.reply 帖子回复数
   * @property {number} data.view 帖子浏览数
   * @return RenderCard
   */
  interface RenderCard {
    title: string;
    cover: string;
    postId: string;
    subtitle: string;
    user: TGApp.Plugins.Mys.User.Post;
    forum: {
      name: string;
      icon: string;
    };
    data: {
      mark: number;
      forward: number;
      like: number;
      reply: number;
      view: number;
    };
  }
}
