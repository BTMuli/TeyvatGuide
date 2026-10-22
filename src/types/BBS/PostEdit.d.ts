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
   * 富文本分割线样式
   * @since Beta v0.12.6
   */
  type Divider = "line_1" | "line_2" | "line_3" | "line_4";

  /**
   * 米游社帖子投票嵌入值。
   * @since Beta v0.12.6
   */
  type Vote = {
    /** 投票 ID */
    id: string;
    /** 投票发布者 UID */
    uid: string;
    /** APK 创建投票时附带的访问地址；读取 Delta 时可能不存在。 */
    url?: string;
  };

  /**
   * 米游社帖子折叠嵌入值。
   *
   * `title` 和 `content` 是 JSON 编码的 Quill Delta；`id` 与 `size` 为 APK
   * 折叠 Blot 的可选 DOM 数据属性，旧帖子可能不包含它们。
   * @since Beta v0.12.6
   */
  type Fold = {
    /** JSON 编码的折叠标题 Delta */
    title: string;
    /** JSON 编码的折叠正文 Delta */
    content: string;
    /** 折叠块的长度提示 */
    size?: number | string;
    /** 折叠块 ID */
    id?: string;
  };

  /** 旧帖子结构中用于折叠回退显示的兼容封装。 @since Beta v0.12.6 */
  type FoldInsert = {
    fold: Fold;
    backup_text?: string;
  };

  /**
   * 富文本帖子节点
   * @since Beta v0.12.6
   */
  type Node = {
    insert:
      | string
      | { image: string }
      | { mention: TGApp.BBS.ReplyAsset.Mention }
      | { divider: Divider }
      | { vote: Vote }
      | FoldInsert
      | TGApp.BBS.CustomEmoticon.Insert;
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
    /** 来源帖子合集 ID，仅用于编辑冲突校验，不作为可编辑字段。 */
    readonly sourceCollectionId?: string | null;
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
