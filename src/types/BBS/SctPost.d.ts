/**
 * @file types/BBS/SctPost.d.ts
 * @description 结构化帖子类型声明文件
 * @since Beta v0.7.2
 */

declare namespace TGApp.BBS.SctPost {
  /**
   * @description 帖子结构化数据-基础类型
   * @since Beta v0.6.7
   * @interface Base
   * @property {string | Record<string, unknown>} insert - 帖子内容
   * @property {Record<string, unknown>} attributes - 帖子属性
   * @property {Array<Base>} children - 子帖子
   * @return Base
   */
  type Base = {
    insert: string | Record<string, unknown>;
    attributes?: Record<string, unknown>;
    children?: Array<Base>;
  };

  /**
   * @description 帖子结构化数据-空类型
   * @since Beta v0.3.4
   * @interface Empty
   * @property {never} insert - 帖子内容
   * @property {never} attributes - 帖子属性
   * @return Empty
   */
  type Empty = { insert: never; attributes?: never };

  /**
   * @description 帖子结构化数据-其他类型
   * @since Beta v0.6.7
   * @property {string} describe - 描述
   * @property {Array<string>} imgs - 图片链接
   * @property {Array<string>} link_card_ids - 关联卡片ID
   * @return Other
   */
  type Other = { describe: string; imgs: Array<string>; link_card_ids?: Array<string> } & {
    [key: string]: unknown;
  };
}
