/**
 * @file plugins/Mys/types/Gacha.d.ts
 * @description Mys 插件卡池类型定义文件
 * @since Beta v0.6.6
 */

declare namespace TGApp.Plugins.Mys.Gacha {
  /**
   * @description 获取卡池信息返回
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Data[]} data.list 卡池数据
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: {
      list: Data[];
    };
  }

  /**
   * @description 卡池信息
   * @since Beta v0.4.4
   * @interface Data
   * @property {string} id 卡池ID
   * @property {string} title 卡池标题
   * @property {string} activity_url 卡池对应帖子
   * @property {string} content_before_act 卡池内容
   * @property {Array<{icon: string; url: string}>} pool 卡池角色头像
   * @property {string} voice_icon 卡池角色语音头像
   * @property {string} voice_url 卡池角色语音URL
   * @property {string} voice_status 卡池角色语音状态
   * @description 如下时间示例：2023-03-21 17:59:59
   * @property {string} start_time 卡池开始时间
   * @property {string} end_time 卡池结束时间
   * @return Data
   */
  interface Data {
    id: number;
    title: string;
    activity_url: string;
    content_before_act: string;
    pool: Array<{
      icon: string;
      url: string;
    }>;
    voice_icon: string;
    voice_url: string;
    voice_status: string;
    start_time: string;
    end_time: string;
  }

  /**
   * @description 用于渲染的卡池数据
   * @since Beta v0.6.6
   * @interface RenderCard
   * @property {string} id 卡池ID
   * @property {string} title 卡池标题
   * @property {string} subtitle 卡池副标题
   * @property {string} cover 卡池封面
   * @property {number} postId 卡池对应帖子ID
   * @property {Array<RenderItem>} characters 卡池角色头像
   * @property {string} time.str 卡池时间字符串
   * @property {string} time.startStamp 卡池开始时间戳
   * @property {string} time.endStamp 卡池结束时间戳
   * @property {string} time.totalStamp 卡池持续时间戳
   * @return RenderCard
   */
  interface RenderCard {
    id: number;
    title: string;
    subtitle: string;
    cover: string;
    postId: number;
    characters: RenderItem[];
    time: {
      str: string;
      startStamp: number;
      endStamp: number;
      totalStamp: number;
    };
  }

  /**
   * @description 用于渲染的卡池角色头像
   * @since Beta v0.4.4
   * @interface RenderItem
   * @property {string} icon 角色头像
   * @property {string} url 角色详情页URL
   * @property {TGApp.App.Character.WikiBriefInfo} info 角色简略信息
   * @return RenderItem
   */
  interface RenderItem {
    icon: string;
    url: string;
    info?: TGApp.App.Character.WikiBriefInfo;
  }
}
