/**
 * 米社表情包类型
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.Emoji {
  /**
   * 获取表情包列表返回响应
   * @since Beta v0.7.2
   */
  type Resp = TGApp.BBS.Response.BaseWithData<Res>;

  /**
   * 表情包列表数据
   * @since Beta v0.7.2
   */
  type Res = {
    /** 表情包列表 */
    list: Array<Series>;
    /** 最近使用的表情包 */
    recently_emoticon: unknown;
  };

  /**
   * 表情包系列
   * @since Beta v0.7.2
   */
  type Series = {
    /** 表情包系列 ID */
    id: number;
    /** 表情包系列名称 */
    name: string;
    /** 表情包系列图标 */
    icon: string;
    /** 表情包系列排序 */
    sort_order: number;
    /** 表情包系列数量 */
    num: number;
    /** 表情包系列状态 */
    status: string;
    /** 表情包系列列表 */
    list: Array<Item>;
    /** 表情包系列更新时间 */
    updated_at: number;
    /** 表情包系列是否可用 */
    is_available: boolean;
  };

  /**
   * 表情包
   * @since Beta v0.7.2
   */
  type Item = {
    /** 表情包 ID */
    id: number;
    /** 表情包名称 */
    name: string;
    /** 表情包图标 */
    icon: string;
    /** 表情包排序 */
    sort_order: number;
    /** 表情包静态图标 */
    static_icon: string;
    /** 表情包更新时间 */
    updated_at: number;
    /** 表情包是否可用 */
    is_available: boolean;
    /** 表情包状态 */
    status: string;
    /** 表情包关键词 */
    keywords: Array<unknown>;
  };
}
