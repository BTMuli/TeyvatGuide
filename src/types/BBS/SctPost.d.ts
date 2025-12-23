/**
 * 结构化帖子类型声明文件
 * @since Beta v0.8.4
 */
declare namespace TGApp.BBS.SctPost {
  /**
   * 帖子结构化数据 - 基础类型
   * @since Beta v0.6.7
   */
  type Base = {
    /** 帖子内容 */
    insert: string | Record<string, unknown>;
    /** 帖子属性 */
    attributes?: Record<string, unknown>;
    /** 子帖子 */
    children?: Array<Base>;
  };

  /**
   * 帖子结构化数据 - 空类型
   * @since Beta v0.3.4
   */
  type Empty = {
    /** 帖子内容 */
    insert: never;
    /** 帖子属性 */
    attributes?: never;
  };

  /**
   * 帖子结构化数据 - viewType 为 2
   * @since Beta v0.8.4
   */
  type Pic = {
    /** 描述 */
    describe: string;
    /** 图片链接 */
    imgs: Array<string>;
    /** 关联卡片 ID */
    link_card_ids?: Array<string>;
  } & {
    [key: string]: unknown;
  };

  /**
   * 帖子结构化数据 - viewType 为 7
   * @since Beta v0.8.4
   * @remarks 下面详细结构参见相关组件。为简便起见，所有字段可能为 null，但目前未遇到 text 和 level 为 null 的情况。
   */
  type Ugc = {
    /** 文字内容 */
    text: Array<Base> | null;
    /** 图片内容 */
    images: Array<UgcImage> | null;
    /** 视频内容 */
    vods: Array<UgcVod> | null;
    /** 等级内容 */
    levels: Array<UgcLevel> | null;
  };

  /**
   * Ugc 结构下的图片内容
   * @since Beta v0.8.4
   */
  type UgcImage = {
    /** 图片 ID */
    image_id: number;
    /** 图片链接 */
    image_url: string;
    /** 图片信息 */
    image: TGApp.BBS.Post.Image;
  };

  /**
   * Ugc 结构下的视频内容
   * @since Beta v0.8.4
   */
  type UgcVod = {
    /** 视频 ID */
    vod_id: string;
    /** 视频信息 */
    vod: TGApp.BBS.Post.Vod;
  };

  /**
   * Ugc 结构下的关卡内容
   * @since Beta v0.8.4
   */
  type UgcLevel = {
    /** 关卡 ID */
    level_id: string;
    /** 关卡服务器 */
    region: string;
    /** 关卡信息 */
    level: TGApp.BBS.UGC.Level;
  };
}
