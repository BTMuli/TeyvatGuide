/**
 * @file plugins/Mys/types/Emoji.d.ts
 * @description Mys 表情包类型声明文件
 * @since Beta v0.3.0
 */

/**
 * @description Mys 表情包类型
 * @since Beta v0.3.0
 * @namespace TGApp.Plugins.Mys.Emoji
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.Emoji {
  /**
   * @description 获取表情包列表返回
   * @since Beta v0.3.0
   * @interface Response
   * @extends TGApp.BBS.Response.Base
   * @property {Series[]} data.list 表情包列表
   * @property {unknown} data.recently_emoticon 最近使用的表情包
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.Base {
    retcode: 0;
    data: {
      list: Series[];
      recently_emoticon: unknown;
    };
  }

  /**
   * @description 表情包系列
   * @since Beta v0.3.0
   * @interface Series
   * @property {number} id 表情包系列 ID
   * @property {string} name 表情包系列名称
   * @property {string} icon 表情包系列图标
   * @property {number} sort_order 表情包系列排序
   * @property {number} num 表情包系列数量
   * @property {string} status 表情包系列状态
   * @property {EmojiItem[]} list 表情包系列列表
   * @property {number} updated_at 表情包系列更新时间
   * @property {boolean} is_available 表情包系列是否可用
   * @return Series
   */
  interface Series {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    num: number;
    status: string;
    list: EmojiItem[];
    updated_at: number;
    is_available: boolean;
  }

  /**
   * @description 表情包
   * @since Beta v0.3.0
   * @interface EmojiItem
   * @property {number} id 表情包 ID
   * @property {string} name 表情包名称
   * @property {string} icon 表情包图标
   * @property {number} sort_order 表情包排序
   * @property {string} static_icon 表情包静态图标
   * @property {number} updated_at 表情包更新时间
   * @property {boolean} is_available 表情包是否可用
   * @property {string} status 表情包状态
   * @property {unknown[]} keywords 表情包关键词
   * @return EmojiItem
   */
  interface EmojiItem {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    static_icon: string;
    updated_at: number;
    is_available: boolean;
    status: string;
    keywords: unknown[];
  }
}
