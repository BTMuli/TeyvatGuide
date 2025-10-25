/**
 * @file types/BBS/SctPost.d.ts
 * @description 结构化帖子类型声明文件
 * @since Beta v0.8.4
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
   * @description 帖子结构化数据-viewType为2
   * @since Beta v0.8.4
   * @property {string} describe - 描述
   * @property {Array<string>} imgs - 图片链接
   * @property {Array<string>} link_card_ids - 关联卡片ID
   * @return Pic
   */
  type Pic = { describe: string; imgs: Array<string>; link_card_ids?: Array<string> } & {
    [key: string]: unknown;
  };

  /**
   * @description 帖子结构化数据-viewType为7
   * @since Beta v0.8.4
   * @description 下面详细结构参见相关组件
   * @todo 为简便起见，所有字段可能为null,但是目前没遇到text&level为null的情况
   * @property {Array<Base>} text - 文字内容
   * @property {Array<UgcImage>} images - 图片内容
   * @property {Array<UgcVod>} vods - 视频内容
   * @property {Array<UgcLevel>} levels - 等级内容
   */
  type Ugc = {
    text: Array<Base> | null;
    images: Array<UgcImage> | null;
    vods: Array<UgcVod> | null;
    levels: Array<UgcLevel> | null;
  };

  /**
   * @description Ugc结构下的图片内容
   * @since Beta v0.8.4
   * @interface UgcImage
   * @property {number} image_id - 图片ID
   * @property {string} image_url - 图片链接
   * @property {TGApp.BBS.Post.Image} image - 图片信息
   */
  type UgcImage = { image_id: number; image_url: string; image: TGApp.BBS.Post.Image };

  /**
   * @description Ugc结构下的视频内容
   * @since Beta v0.8.4
   * @interface UgcVod
   * @property {string} vod_id - 视频ID
   * @property {TGApp.BBS.Post.Vod} vod - 视频信息
   */
  type UgcVod = { vod_id: string; vod: TGApp.BBS.Post.Vod };

  /**
   * @description Ugc结构下的关卡内容
   * @since Beta v0.8.4
   * @interface UgcLevel
   * @property {string} level_id - 关卡ID
   * @property {string} region - 关卡服务器
   * @property {TGApp.BBS.UGC.Level} level - 关卡信息
   */
  type UgcLevel = { level_id: string; region: string; level: TGApp.BBS.UGC.Level };
}
