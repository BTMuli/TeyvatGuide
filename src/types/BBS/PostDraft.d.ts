/**
 * 米游社普通图文草稿类型定义文件。
 * @since Beta v0.13.1
 */

declare namespace TGApp.BBS.PostDraft {
  /**
   * 草稿支持的帖子类型。
   * @since Beta v0.13.1
   */
  type ViewType = 1 | 2;

  /**
   * 草稿列表项。
   * @since Beta v0.13.1
   */
  type Item = {
    /** 草稿 ID */
    id: string;
    /** 标题 */
    subject: string;
    /** 帖子类型 */
    viewType: ViewType;
    /** 社区 ID；接口未返回时为 0 */
    gid: number;
    /** 最近编辑时间，Unix 秒；接口未返回时为 0 */
    updatedAt: number;
    /** 封面地址 */
    cover?: string;
    /** 列表摘要 */
    content?: string;
    /** 服务端版本号 */
    version?: number;
  };

  /**
   * 草稿详情归一化后的平铺保存字段。
   * @since Beta v0.13.1
   */
  type Raw = Record<string, unknown>;

  /**
   * 可编辑草稿详情。
   * @since Beta v0.13.1
   */
  type Detail = {
    /** 草稿 ID */
    id: string;
    /** 编辑器设置 */
    settings: TGApp.BBS.PostEdit.Settings;
    /** 最近编辑时间，Unix 秒；接口未返回时为 0 */
    updatedAt: number;
    /** 服务端版本号 */
    version?: number;
    /** 平铺保存字段快照，保留未在编辑器展示的发布设置。 */
    raw?: Raw;
    /** 草稿所属米社 UID；接口未返回时省略 */
    ownerUid?: string;
  };

  /**
   * 草稿列表返回数据。
   * @since Beta v0.13.1
   */
  type ListData = {
    /** 草稿列表 */
    list: Array<Item>;
    /** 是否已经是最后一页 */
    is_last: boolean;
    /** 下一页偏移量；米游社不同客户端可能返回数字或数字字符串，内部统一为字符串 */
    next_offset: string;
  };

  /**
   * 草稿列表返回响应。
   * @since Beta v0.13.1
   */
  type ListResp = {
    retcode: number;
    message: string;
    data: ListData | null;
  };

  /**
   * 草稿详情返回响应。
   * @since Beta v0.13.1
   */
  type DetailResp = {
    retcode: number;
    message: string;
    data: Detail | null;
  };

  /**
   * 草稿保存返回数据。
   * @since Beta v0.13.1
   */
  type SaveData = {
    /** 服务端草稿 ID */
    draft_id: string;
    /** 部分版本接口会同时返回详情 */
    draft?: Detail;
  };

  /**
   * 草稿保存返回响应。
   * @since Beta v0.13.1
   */
  type SaveResp = {
    retcode: number;
    message: string;
    data: SaveData | null;
  };

  /** 草稿删除响应，只消费业务状态，不依赖成功数据字段。 @since Beta v0.13.1 */
  type DeleteResp = {
    retcode: number;
    message: string;
    data?: unknown;
  };

  /**
   * 草稿接口的原始响应类型；仅供请求边界校验使用。
   * @since Beta v0.13.1
   */
  namespace Api {
    /** 原始草稿字段。 @since Beta v0.13.1 */
    type DraftRecord = Record<string, unknown>;

    /** 原始草稿列表项。 @since Beta v0.13.1 */
    type ListItem = DraftRecord & {
      draft_id: string | number;
      subject: string;
      view_type?: number;
      game_id?: number;
      version?: number;
      updated_at?: number;
      cover?: string | null;
      content?: string | null;
    };

    /** 原始草稿列表数据。 @since Beta v0.13.1 */
    type ListData = {
      list: Array<ListItem>;
      is_last: boolean;
      next_offset: number | string;
    };

    /** 原始草稿列表响应。 @since Beta v0.13.1 */
    type ListResp = {
      retcode: number;
      message: string;
      data: ListData | null;
    };

    /** 原始草稿详情数据。 @since Beta v0.13.1 */
    type DetailData = {
      draft_id: string | number;
      version?: number;
      draft: DraftRecord;
      lottery?: unknown;
    };

    /** 原始草稿详情响应。 @since Beta v0.13.1 */
    type DetailResp = {
      retcode: number;
      message: string;
      data: DetailData | null;
    };

    /** 原始草稿保存数据。 @since Beta v0.13.1 */
    type SaveData = {
      draft_id: string | number;
      draft?: DraftRecord;
      version?: number;
    };

    /** 原始草稿保存响应。 @since Beta v0.13.1 */
    type SaveResp = {
      retcode: number;
      message: string;
      data: SaveData | null;
    };
  }
}
