/**
 * @file plugins Mys interface utils.ts
 * @description Mys 插件工具接口
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

// 杂项 API

/**
 * @description 观测枢 content API
 * @since Alpha
 * @param {string} content_id 内容 ID
 * @return {string} API
 */
export const OBC_CONTENT_API =
	"https://bbs.mihoyo.com/ys/obc/content/{content_id}/detail?bbs_presentation_style=no_header";

// 杂项接口

/**
 * @description 图片数据
 * @since Alpha
 * @interface ImageData
 * @property {string} url 图片 URL
 * @property {number} height 图片高度
 * @property {string} width 图片宽度
 * @property {string} format 图片格式 // jpg
 * @property {string} size 图片大小 // 281428
 * @property crop 图片裁剪信息，可能为 null
 * @property {number} crop.x 裁剪 X 轴
 * @property {number} crop.y 裁剪 Y 轴
 * @property {number} crop.w 裁剪宽度
 * @property {number} crop.h 裁剪高度
 * @property {string} crop.url 裁剪图片 URL
 * @property {boolean} is_user_set_cover 是否为封面
 * @property {string} image_id 图片 ID
 * @property {string} entity_type 图片类型 // IMG_ENTITY_POST, IMG_ENTITY_UNKOWN
 * @property {string} entity_id 图片 ID
 * @property {boolean} is_deleted 是否已删除
 * @return {ImageData}
 */
export interface ImageData {
	url: string;
	height: number;
	width: number;
	format: string;
	size: string;
	crop: {
		x: number;
		y: number;
		w: number;
		h: number;
		url: string;
	} | null;
	is_user_set_cover: boolean;
	image_id: string;
	entity_type: string;
	entity_id: string;
	is_deleted: boolean;
}

/**
 * @description help_sys 信息
 * @since Alpha
 * @todo 用处未知
 * @interface HelpSys
 * @property {unknown} top_up 置顶, 可能为 null // TODO: 未知
 * @property {unknown[]} top_n 置顶, 可能为空
 * @property {number} answer_num 回答数
 * @return {HelpSys}
 */
export interface HelpSys {
	top_up: unknown | null;
	top_n: unknown[];
	answer_num: number;
}
