/**
 * @file types BBS Announcement.d.ts
 * @description 从 BBS 获取到的游戏内公告类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.5
 */

declare namespace TGApp.BBS.Announcement {
  /**
   * @description 公告列表返回响应类型
   * @interface ListResponse
   * @since Alpha v0.1.5
   * @extends TGApp.BBS.Response.Base
   * @property {ListData} data - 公告列表数据
   * @return ListResponse
   */
  export interface ListResponse extends TGApp.BBS.Response.Base {
    data: ListData;
  }

  /**
   * @description 公告内容返回响应类型
   * @interface ContentResponse
   * @since Alpha v0.1.5
   * @extends TGApp.BBS.Response.Base
   * @property {ContentData} data - 公告内容数据
   * @return ContentResponse
   */
  export interface ContentResponse extends TGApp.BBS.Response.Base {
    data: ContentData;
  }

  /**
   * @description 公告列表数据
   * @interface ListData
   * @since Alpha v0.1.5
   * @property {ListItem[]} list - 公告列表
   * @property {number} total - 公告总数
   * @property {ListType[]} type_list - 公告类型列表
   * @property {boolean} alert - 是否有紧急公告
   * @property {number} time_zone - 时区
   * @property {string} t - 时间戳，单位为秒
   * @property {unknown[]} pic_list - 图片列表 todo: 未知类型
   * @property {number} pic_total - 图片总数
   * @property {unknown[]} pic_type_list - 图片类型列表 todo: 未知类型
   * @property {boolean} pic_alert - 是否有紧急图片
   * @property {number} pic_alert_id - 紧急图片 ID
   * @property {unknown} static_sign - 静态签名 todo: 未知类型
   * @return ListData
   */
  export interface ListData {
    list: ListItem[];
    total: number;
    type_list: ListType[];
    alert: boolean;
    time_zone: number;
    t: string;
    pic_list: unknown[];
    pic_total: number;
    pic_type_list: unknown[];
    pic_alert: boolean;
    pic_alert_id: number;
    static_sign: unknown;
  }

  /**
   * @description 公告内容数据
   * @interface ContentData
   * @since Alpha v0.1.5
   * @property {ContentItem[]} list - 公告内容列表
   * @property {number} total - 公告内容总数
   * @property {unknown[]} pic_list - 图片列表 todo: 未知类型
   * @property {number} pic_total - 图片总数
   * @return ContentData
   */
  export interface ContentData {
    list: ContentItem[];
    total: number;
    pic_list: unknown[];
    pic_total: number;
  }

  /**
   * @description 公告列表项
   * @interface ListItem
   * @since Alpha v0.1.5
   * @property {AnnoSingle[]} list - 公告列表
   * @property {number} type_id - 公告类型 ID
   * @property {string} type_label - 公告类型标签
   * @return ListItem
   */
  export interface ListItem {
    list: AnnoSingle[];
    type_id: number;
    type_label: string;
  }

  /**
   * @description 单个公告内容
   * @interface AnnoSingle
   * @since Alpha v0.1.5
   * @property {number} ann_id 公告 ID
   * @property {string} title 公告标题
   * @property {string} subtitle 公告副标题
   * @property {string} banner 公告图片
   * @property {unknown} content 公告内容
   * @property {string} type_label 公告类型标签
   * @property {string} tag_label 公告标签
   * @property {string} tag_icon 公告标签图标
   * @property {number} login_alert 是否登录提示
   * @property {string} lang 公告语言
   * @property {string} start_time 公告开始时间 // "2023-03-01 07:00:00"
   * @property {string} end_time 公告结束时间 // "2023-04-12 06:00:00"
   * @property {number} type 公告类型
   * @property {number} remind 公告提醒
   * @property {number} alert 公告紧急
   * @property {string} tag_start_time 公告标签开始时间 // "2000-01-02 15:04:05"
   * @property {string} tag_end_time 公告标签结束时间 // "2030-01-02 15:04:05"
   * @property {number} remind_ver 公告提醒版本
   * @property {boolean} has_content 是否有内容
   * @property {boolean} extra_remind 是否有额外提醒
   * @return AnnoSingle
   */
  export interface AnnoSingle {
    ann_id: number;
    title: string;
    subtitle: string;
    banner: string;
    content: unknown;
    type_label: string;
    tag_label: string;
    tag_icon: string;
    login_alert: number;
    lang: string;
    start_time: string;
    end_time: string;
    type: number;
    remind: number;
    alert: number;
    tag_start_time: string;
    tag_end_time: string;
    remind_ver: number;
    has_content: boolean;
    extra_remind: boolean;
  }

  /**
   * @description 公告类型列表项
   * @interface ListType
   * @since Alpha v0.1.5
   * @property {number} id 公告类型 ID
   * @property {string} name 公告类型名称
   * @property {string} mi18n_name 公告类型国际化名称
   * @return ListType
   */
  export interface ListType {
    id: number;
    name: string;
    mi18n_name: string;
  }

  /**
   * @description 公告内容列表项
   * @interface ContentItem
   * @since Alpha v0.1.5
   * @property {number} ann_id 公告 ID
   * @property {string} title 公告标题
   * @property {string} subtitle 公告副标题
   * @property {string} banner 公告图片
   * @property {string} content 公告内容，为 html
   * @property {string} lang 公告语言
   * @return ContentItem
   */
  export interface ContentItem {
    ann_id: number;
    title: string;
    subtitle: string;
    banner: string;
    content: string;
    lang: string;
  }
}
