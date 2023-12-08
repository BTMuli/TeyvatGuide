/**
 * @file plugins/Mys/types/SctPost.d.ts
 * @description Mys 插件 结构化帖子类型声明文件
 * @since Beta v0.3.7
 */

/**
 * @description 结构化帖子类型命名空间
 * @since Beta v0.3.7
 * @namespace TGApp.Plugins.Mys.SctPost
 * @memberof TGApp.Plugins.Mys
 */
declare namespace TGApp.Plugins.Mys.SctPost {
  /**
   * @description 帖子结构化数据-基础类型
   * @since Beta v0.3.4
   * @interface Base
   * @property {unknown} insert - 帖子内容
   * @property {unknown} attributes - 帖子属性
   * @return Base
   */
  interface Base {
    insert: any;
    attributes?: any;
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

  /**
   * @description 帖子结构化数据-视频类型-站外视频
   * @since Beta v0.3.4
   * @interface Video
   * @extends Base
   * @property {string} insert.video - 视频链接
   * @return Video
   */
  interface Video extends Base {
    insert: {
      video: string;
    };
  }
}
