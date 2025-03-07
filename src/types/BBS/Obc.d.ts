/**
 * @file types/BBS/Obc.d.ts
 * @description 观测枢相关请求类型
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Obc {
  /**
   * @description 卡池返回响应
   * @since Beta v0.7.2
   * @interface GachaResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {GachaRes} data
   * @return GachaResp
   */
  type GachaResp = TGApp.BBS.Response.BaseWithData<GachaRes>;

  /**
   * @description 卡池返回数据
   * @since Beta v0.7.2
   * @interface GachaRes
   * @property {Array<GachaItem>} list 卡池列表
   * @return GachaRes
   */
  type GachaRes = { list: Array<GachaItem> };

  /**
   * @description 卡池信息
   * @since Beta v0.7.2
   * @interface GachaItem
   * @property {string} id 卡池ID
   * @property {string} title 卡池标题
   * @property {string} activity_url 卡池对应帖子
   * @property {string} content_before_act 卡池内容
   * @property {Array<GachaPool>} pool 卡池角色头像
   * @property {string} voice_icon 卡池角色语音头像
   * @property {string} voice_url 卡池角色语音URL
   * @property {string} voice_status 卡池角色语音状态
   * @description 如下时间示例：2023-03-21 17:59:59
   * @property {string} start_time 卡池开始时间
   * @property {string} end_time 卡池结束时间
   * @return GachaItem
   */
  type GachaItem = {
    id: number;
    title: string;
    activity_url: string;
    content_before_act: string;
    pool: Array<GachaPool>;
    voice_icon: string;
    voice_url: string;
    voice_status: string;
    start_time: string;
    end_time: string;
  };

  /**
   * @description 卡池数据
   * @since Beta v0.7.2
   * @interface GachaPool
   * @property {string} icon 头像
   * @property {string} url 链接
   * @return GachaPool
   */
  type GachaPool = { icon: string; url: string };

  /**
   * @description 活动返回响应
   * @since Beta v0.7.2
   * @interface PositionResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {PositionRes} data
   * @return PositionResp
   */
  type PositionResp = TGApp.BBS.Response.BaseWithData<PositionRes>;

  /**
   * @description 活动返回数据
   * @since Beta v0.7.2
   * @interface PositionRes
   * @property {Array<PositionItem>} list 活动列表
   * @return PositionRes
   */
  type PositionRes = { list: Array<ObcItem<PositionItem>> };

  /**
   * @description 观测枢通用接口
   * @since Beta v0.7.2
   * @interface ObcItem
   * @template T
   * @property {number} id ID
   * @property {string} name 名称
   * @property {number} parent_id 父ID
   * @property {number} depth 深度
   * @property {string} ch_ext 结构化扩展信息
   * @property {Array<ObcItem>} children 子项递归
   * @property {Array<T>} list 列表
   */
  type ObcItem<T = unknown> = {
    id: number;
    name: string;
    parent_id: number;
    depth: number;
    ch_ext: string;
    children: Array<ObcItem<T>>;
    list: Array<T>;
  };

  /**
   * @description 热点追踪信息
   * @since Beta v0.7.2
   * @interface PositionItem
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
   * @return PositionItem
   */
  type PositionItem = {
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
  };
}
