/**
 * 米游社富文本帖子编辑类型
 * @since Beta v0.12.6
 */
declare namespace TGApp.BBS.PostEdit {
  /**
   * 可编辑的富文本属性
   * @since Beta v0.12.6
   */
  type Attributes = {
    bold?: boolean;
    italic?: boolean;
    header?: 1 | 2;
    align?: "left" | "center" | "right";
    color?: string;
    link?: string;
  };

  /**
   * 富文本帖子节点
   * @since Beta v0.12.6
   */
  type Node = {
    insert: string | { image: string } | { mention: TGApp.BBS.ReplyAsset.Mention };
    attributes?: Attributes;
  };

  /**
   * 校验后的帖子节点、纯文字及图片
   * @since Beta v0.12.6
   */
  type DraftDocument = {
    nodes: Array<Node>;
    text: string;
    images: Array<string>;
  };

  /**
   * 图片帖的正文封装。
   * @since Beta v0.12.6
   */
  type PictureContent = {
    /** 图片 URL 列表 */
    imgs: Array<string>;
    /** 图片介绍纯文本 */
    describe: string;
    /** 关联卡片 ID；当前编辑器仅接受空列表。 */
    link_card_ids?: Array<string>;
  };

  /**
   * 从同一份 Quill 文档导出的帖子正文
   * @since Beta v0.12.6
   */
  type Document = DraftDocument & { html: string };

  /**
   * 图文帖发布设置
   * @since Beta v0.12.6
   */
  type Settings = {
    gid: number;
    forumId: number;
    subject: string;
    nodes: Array<TGApp.BBS.SctPost.Base>;
    /** 米游社帖子类型，缺省按普通图文帖处理。 */
    viewType?: 1 | 2;
    /** 图片帖独立图片 URL 列表。 */
    imageUrls?: Array<string>;
    topicIds: Array<number>;
    cateId: number;
    isOriginal: number;
    republishAuthorization: number;
    cover: string;
    /** 评论图片权限标记，米游社使用 0/1 表示。 */
    blockReplyImg?: number;
    /** 米游社 AI 内容选择标记。 */
    userAiContentChoice?: string;
  };

  /**
   * 帖子写接口响应，保留服务端业务错误。
   * @since Beta v0.12.6
   */
  type MutationResponse = {
    retcode: number;
    message: string;
    data: { post_id?: string | number } | null;
  };

  /**
   * 帖子发布检查响应。
   * @since Beta v0.12.6
   */
  type ReleaseConfigResponse = {
    retcode: number;
    message: string;
    data: unknown;
  };
}
