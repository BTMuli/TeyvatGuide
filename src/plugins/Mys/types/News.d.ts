/**
 * @file plugins/Mys/types/news.d.ts
 * @description Mys 插件咨讯类型定义文件
 * @since Beta v0.5.0
 */

/**
 * @description Mys 插件咨讯类型
 * @since Beta v0.4.5
 * @namespace TGApp.Plugins.Mys.News
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.News {
  /**
   * @description 咨讯返回数据
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data 咨讯数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullData;
  }

  /**
   * @description 咨讯数据
   * @since Beta v0.4.5
   * @interface FullData
   * @property {number} last_id 最后一条咨讯 ID
   * @property {boolean} is_last 是否最后一页
   * @property {Item[]} list 咨讯列表
   * @return FullData
   */
  interface FullData {
    last_id: number;
    is_last: boolean;
    list: TGApp.Plugins.Mys.Post.FullData[];
  }

  /**
   * @description 咨讯元数据，只有活动咨讯才有
   * @since Alpha v0.2.1
   * @interface Meta
   * @property {number} activity_status 活动状态 // ActivityStatus
   * @property {string} start_at_sec 活动开始时间戳，单位秒
   * @property {string} end_at_sec 活动结束时间戳，单位秒
   * @return Meta
   */
  interface Meta {
    activity_status: number;
    start_at_sec: string;
    end_at_sec: string;
  }

  /**
   * @description 用于渲染的咨讯卡片
   * @since Beta v0.5.0
   * @interface RenderCard
   * @property {string} title 标题
   * @property {string} cover 封面图片 URL
   * @property {number} postId 帖子 ID
   * @property {string} subtitle 副标题
   * @property {TGApp.Plugins.Mys.User.Post|null} user 发帖用户，可能为 null
   * @property forum 版块，可能为 null
   * @property {string} forum.name 版块名称
   * @property {string} forum.icon 版块图标
   * @property {RenderStatus} status 活动状态，仅活动咨讯有
   * @property data 帖子统计，可能为 null
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
    postId: number;
    subtitle: string;
    user: TGApp.Plugins.Mys.User.Post | null;
    forum: {
      name: string;
      icon: string;
    } | null;
    data: {
      mark: number;
      forward: number;
      like: number;
      reply: number;
      view: number;
    } | null;
    status?: RenderStatus;
  }

  /**
   * @description 活动状态
   * @since Alpha v0.2.1
   * @property {string} status 活动状态
   * @property {string} colorCss 活动状态按钮背景色
   * @returns RenderStatus
   */
  interface RenderStatus {
    status: string;
    colorCss: string;
  }
}
