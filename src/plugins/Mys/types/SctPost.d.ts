/**
 * @file plugins/Mys/types/SctPost.d.ts
 * @description Mys 插件 结构化帖子类型声明文件
 * @since Beta v0.6.7
 */

declare namespace TGApp.Plugins.Mys.SctPost {
  /**
   * @description 帖子结构化数据-基础类型
   * @since Beta v0.4.5
   * @interface Base
   * @property {unknown} insert - 帖子内容
   * @property {unknown} attributes - 帖子属性
   * @property {Base[]} children - 子帖子
   * @return Base
   */
  type Base = { insert: any; attributes?: any; children?: Base[] };

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
   * @property {string[]} imgs - 图片链接
   * @property {string[]} link_card_ids - 关联卡片ID
   * @return Other
   */
  type Other = { describe: string; imgs: string[]; link_card_ids?: string[] } & {
    [key: string]: unknown;
  };
}
