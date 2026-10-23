/**
 * 米游社回复编辑器类型定义。
 * @since Beta v0.13.0
 */

declare namespace TGApp.BBS.ReplyEditor {
  /**
   * 回复编辑器内部的官方表情值
   * @since Beta v0.13.0
   */
  type Emoticon = {
    /** 图片地址 */
    src: string;
    /** 表情名称 */
    name: string;
  };

  /**
   * 回复编辑器可插入的值
   * @since Beta v0.13.0
   */
  type Insert = string | { emoticon: Emoticon };

  /**
   * 回复编辑器可序列化的操作
   * @since Beta v0.13.0
   */
  type Operation = {
    insert: Insert;
  };
}
