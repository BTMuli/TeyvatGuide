/**
 * @file plugins Mys types Position.d.ts
 * @description Mys 插件热点追踪接口
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 插件热点追踪类型
 * @since Alpha v0.2.1
 * @namespace Position
 * @return Position
 */
declare namespace TGApp.Plugins.Mys.Position {
  /**
   * @description 热点追踪信息的返回类型
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {ObcItem[]} data.list obc 列表
   * @return Response
   */
  export interface Response extends TGApp.Plugins.Mys.Obc.Response {
    data: {
      list: ObcItem[];
    };
  }

  /**
   * @description 热点追踪层级结构
   * @since Alpha v0.2.1
   * @interface ObcItem
   * @extends TGApp.Plugins.Mys.Obc.Data
   * @property {Data[]} list 列表
   * @return ObcItem
   */
  export interface ObcItem extends TGApp.Plugins.Mys.Obc.Data {
    list: Data[];
  }

  /**
   * @description 热点追踪信息
   * @since Alpha v0.2.1
   * @interface Data
   * @property {number} recommend_id 推荐ID
   * @property {number} content_id 内容ID
   * @property {string} title 标题
   * @property {string} ext 扩展信息
   * @property {number} type 类型
   * @property {string} url 链接
   * @property {string} icon 图标
   * @property {string} abstract 摘要
   * @property {string} article_user_name 作者
   * @property {string} avatar_url 头像
   * @property {string} article_time 时间
   * @property {string} create_time 创建时间 // 2023-03-31 11:16:57
   * @property {string} end_time 结束时间 // 1680465599000
   * @return Data
   */
  export interface Data {
    recommend_id: number;
    content_id: number;
    title: string;
    ext: string;
    type: number;
    url: string;
    icon: string;
    abstract: string;
    article_user_name: string;
    avatar_url: string;
    article_time: string;
    create_time: string;
    end_time: string;
  }

  /**
   * @description 渲染用的热点追踪信息
   * @since Alpha v0.2.1
   * @interface RenderCard
   * @property {string} title 标题
   * @property {number} postId 帖子ID
   * @property {string} icon 图标
   * @property {string} abstract 摘要
   * @property time 时间
   * @property {string} time.start 开始时间
   * @property {number} time.startStamp 开始时间戳
   * @property {string} time.end 结束时间
   * @property {number} time.endStamp 结束时间戳
   * @return RenderCard
   */
  export interface RenderCard {
    title: string;
    postId: number;
    icon: string;
    abstract: string;
    time: {
      start: string;
      startStamp: number;
      end: string;
      endStamp: number;
    };
  }
}
