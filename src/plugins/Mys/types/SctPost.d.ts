/**
 * @file plugins/Mys/types/SctPost.d.ts
 * @description Mys 插件 结构化帖子类型声明文件
 * @since Beta v0.4.5
 */

/**
 * @description 结构化帖子类型命名空间
 * @since Beta v0.4.5
 * @namespace TGApp.Plugins.Mys.SctPost
 * @memberof TGApp.Plugins.Mys
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
  interface Base {
    insert: any;
    attributes?: any;
    children?: Base[];
  }

  /**
   * @description 帖子结构化数据-空类型
   * @since Beta v0.3.4
   * @interface Empty
   * @property {never} insert - 帖子内容
   * @property {never} attributes - 帖子属性
   * @return Empty
   */
  interface Empty {
    insert: never;
    attributes?: never;
  }

  /**
   * @description 帖子结构化数据-其他类型
   * @since Beta v0.3.4
   * @property {string} describe - 描述
   * @property {string[]} imgs - 图片链接
   * @return Other
   */
  interface Other {
    describe: string;
    imgs: string[];

    [key: string]: unknown;
  }
}
