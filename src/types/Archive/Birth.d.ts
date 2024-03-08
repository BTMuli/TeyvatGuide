/**
 * @file types/Archive/Birth.d.ts
 * @description 存档-留影叙佳期-数据类型
 * @since Beta v0.4.4
 */

/**
 * @description 存档-留影叙佳期-命名空间
 * @since Beta v0.4.4
 * @namespace TGApp.Archive.Birth
 * @memberof TGApp.Archive
 */
declare namespace TGApp.Archive.Birth {
  /**
   * @description 日历数据
   * @since Beta v0.4.4
   * @interface CalendarData
   * @returns CalendarData
   */
  type CalendarData = Record<string, CalendarItem[]>;

  /**
   * @description 日历数据-条目
   * @since Beta v0.4.4
   * @interface CalendarItem
   * @property {number} role_id 角色ID
   * @property {string} name 角色名
   * @property {string} role_birthday 角色生日
   * @property {string} head_icon 头像
   * @property {boolean} is_subscribe 是否订阅
   * @returns CalendarItem
   */
  interface CalendarItem {
    role_id: number;
    name: string;
    role_birthday: string;
    head_icon: string;
    is_subscribe: boolean;
  }

  /**
   * @description 卡片数据条目
   * @since Beta v0.4.4
   * @interface DrawItem
   * @property {string} word_text - 留言
   * @property {number} year - 年份
   * @property {string} birthday - 生日 m/d
   * @property {number} role_id - 角色 id
   * @property {string} role_name - 角色名
   * @property {string[]} take_picture - 画片地址 [荧，空]
   * @property {string[]} unread_picture - 未读画片地址 [荧，空]
   * @property {string} gal_xml - 画片 xml
   * @property {string} gal_resource - 画片资源
   * @property {number} op_id - 操作 id
   * @returns DrawItem
   */
  interface DrawItem {
    word_text: string;
    year: number;
    birthday: string;
    role_id: number;
    role_name: string;
    take_picture: string[];
    unread_picture: string[];
    gal_xml: string;
    gal_resource: string;
    op_id: number;
  }

  /**
   * @description 角色数据条目
   * @since Beta v0.4.4
   * @interface RoleItem
   * @property {number} role_id - 角色 id
   * @property {string} name - 角色名
   * @property {string} belong - 所属
   * @property {string} divine_type - 神力类型
   * @property {boolean} is_god - 是否是神
   * @property {string} seat_life - 命座
   * @property {string} element - 元素
   * @property {string} text - 介绍
   * @property {string} role_birthday - 生日 m/d
   * @property {string} head_icon - 头像
   * @property {string} head_image - 头像
   * @property {string} introduce - 介绍
   * @property {boolean} is_subscribe - 是否订阅
   * @property {boolean} is_finish_task - 是否完成任务
   * @property {number} current_compensate_num - 当前补偿数量
   * @property {boolean} is_compensate_num - 是否补偿数量
   * @property {number} year_compensate_num - 年份补偿数量
   * @returns RoleItem
   */
  interface RoleItem {
    role_id: number;
    name: string;
    belong: string;
    divine_type: string;
    is_god: boolean;
    seat_life: string;
    element: string;
    text: string;
    role_birthday: string;
    head_icon: string;
    head_image: string;
    introduce: string;
    is_subscribe: boolean;
    is_finish_task: boolean;
    current_compensate_num: number;
    is_compensate_num: boolean;
    year_compensate_num: number;
  }
}
