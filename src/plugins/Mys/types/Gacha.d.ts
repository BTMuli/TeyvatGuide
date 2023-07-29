/**
 * @file plugins Mys types Gacha.d.ts
 * @description Mys 插件卡池类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description Mys 卡池类型定义
 * @since Alpha v0.2.1
 * @namespace Gacha
 * @return Gacha
 */
declare namespace TGApp.Plugins.Mys.Gacha {
  /**
   * @description 获取卡池信息返回
   * @since Alpha v0.2.1
   * @interface Response
   * @extends TGApp.Plugins.Mys.Base.Response
   * @property {Data[]} data.list 卡池数据
   * @return Response
   */
  export interface Response extends TGApp.Plugins.Mys.Base.Response {
    data: {
      list: Data[];
    };
  }

  /**
   * @description 卡池信息
   * @since Alpha v0.2.1
   * @interface Data
   * @property {string} id 卡池ID
   * @property {string} title 卡池标题
   * @property {string} activity_url 卡池对应帖子
   * @property {string} content_before_act 卡池内容
   * @property {MiniItem[]} pool 卡池包含的角色
   * @property {string} voice_icon 卡池角色语音头像
   * @property {string} voice_url 卡池角色语音URL
   * @property {string} voice_status 卡池角色语音状态
   * @description 如下时间示例：2023-03-21 17:59:59
   * @property {string} start_time 卡池开始时间
   * @property {string} end_time 卡池结束时间
   * @return Data
   */
  export interface Data {
    id: string;
    title: string;
    activity_url: string;
    content_before_act: string;
    pool: MiniItem[];
    voice_icon: string;
    voice_url: string;
    voice_status: string;
    start_time: string;
    end_time: string;
  }

  /**
   * @description 基本信息
   * @since Alpha v0.2.1
   * @interface MiniItem
   * @property {string} icon 图标
   * @property {string} url 链接
   * @return MiniItem
   */
  export interface MiniItem {
    icon: string;
    url: string;
  }

  /**
   * @description 用于渲染的卡池数据
   * @since Alpha v0.2.1
   * @interface RenderCard
   * @property {string} title 卡池标题
   * @property {string} subtitle 卡池副标题
   * @property {string} cover 卡池封面
   * @property {number} postId 卡池对应帖子ID
   * @property {MiniItem[]} characters 卡池包含的角色
   * @property {MiniItem} voice 卡池角色语音
   * @property {string} time.start 卡池开始时间
   * @property {string} time.startStamp 卡池开始时间戳
   * @property {string} time.end 卡池结束时间
   * @property {string} time.endStamp 卡池结束时间戳
   * @return RenderCard
   */
  export interface RenderCard {
    title: string;
    subtitle: string;
    cover: string;
    postId: number;
    characters: MiniItem[];
    voice: MiniItem;
    time: {
      start: string;
      startStamp: number;
      end: string;
      endStamp: number;
    };
  }
}
