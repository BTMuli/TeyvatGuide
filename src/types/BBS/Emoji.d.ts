/**
 * @file types/BBS/Emoji.d.ts
 * @description 表情包类型声明文件
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Emoji {
  /**
   * @description 获取表情包列表返回
   * @since Beta v0.7.2
   * @interface Resp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {Series[]} data.list 表情包列表
   * @property {unknown} data.recently_emoticon 最近使用的表情包
   * @return Resp
   */
  type Resp = TGApp.BBS.Response.BaseWithData<Res>;

  /**
   * @description 获取表情包列表返回
   * @since Beta v0.7.2
   * @interface Res
   * @property {Array<Series>} list 表情包列表
   * @property {unknown} recently_emoticon 最近使用的表情包
   * @return Res;
   */
  type Res = { list: Array<Series>; recently_emoticon: unknown };

  /**
   * @description 表情包系列
   * @since Beta v0.7.2
   * @interface Series
   * @property {number} id 表情包系列 ID
   * @property {string} name 表情包系列名称
   * @property {string} icon 表情包系列图标
   * @property {number} sort_order 表情包系列排序
   * @property {number} num 表情包系列数量
   * @property {string} status 表情包系列状态
   * @property {Item[]} list 表情包系列列表
   * @property {number} updated_at 表情包系列更新时间
   * @property {boolean} is_available 表情包系列是否可用
   * @return Series
   */
  type Series = {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    num: number;
    status: string;
    list: Array<Item>;
    updated_at: number;
    is_available: boolean;
  };

  /**
   * @description 表情包
   * @since Beta v0.7.2
   * @interface Item
   * @property {number} id 表情包 ID
   * @property {string} name 表情包名称
   * @property {string} icon 表情包图标
   * @property {number} sort_order 表情包排序
   * @property {string} static_icon 表情包静态图标
   * @property {number} updated_at 表情包更新时间
   * @property {boolean} is_available 表情包是否可用
   * @property {string} status 表情包状态
   * @property {unknown[]} keywords 表情包关键词
   * @return Item
   */
  type Item = {
    id: number;
    name: string;
    icon: string;
    sort_order: number;
    static_icon: string;
    updated_at: number;
    is_available: boolean;
    status: string;
    keywords: Array<unknown>;
  };
}
