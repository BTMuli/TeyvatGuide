/**
 * @file plugins Mys interface position.ts
 * @description Mys 插件热点追踪接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */

import { type MysObcResponse, type MysObc } from "./base";

/**
 * @description 获取热点追踪信息的返回类型
 * @since Alpha v0.1.1
 * @interface PositionResponse
 * @extends MysObcResponse
 * @property {PositionObc[]} data.list obc 列表
 * @returns {PositionResponse}
 */
export interface PositionResponse extends MysObcResponse {
  data: {
    list: PositionObc[];
  };
}

/**
 * @description 热点追踪层级结构
 * @since Alpha v0.1.1
 * @interface PositionObc
 * @extends MysObc
 * @property {PositionData[]} list 列表
 * @returns {PositionObc}
 */
export interface PositionObc extends MysObc {
  list: PositionData[];
}

/**
 * @description 热点追踪信息
 * @since Alpha v0.1.1
 * @interface PositionData
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
 * @returns {PositionData}
 */
export interface PositionData {
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
 * @since Alpha v0.1.1
 * @interface PositionCard
 * @property {string} title 标题
 * @property {number} post_id 帖子ID
 * @property {string} icon 图标
 * @property {string} abstract 摘要
 * @property time 时间
 * @property {string} time.start 开始时间
 * @property {number} time.start_stamp 开始时间戳
 * @property {string} time.end 结束时间
 * @property {number} time.end_stamp 结束时间戳
 * @returns {PositionCard}
 */
export interface PositionCard {
  title: string;
  post_id: number;
  icon: string;
  abstract: string;
  time: {
    start: string;
    start_stamp: number;
    end: string;
    end_stamp: number;
  };
}
