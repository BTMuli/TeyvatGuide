/**
 * 米游社自定义表情类型定义
 * @since Beta v0.13.0
 */
declare namespace TGApp.BBS.CustomEmoticon {
  /**
   * 收藏表情列表接口响应
   * @since Beta v0.13.0
   */
  type ListResp = Omit<TGApp.BBS.Response.Base, "data"> & {
    /** 列表数据；接口失败时为 null */
    data: ListRes | null;
  };

  /**
   * 收藏表情列表接口数据
   * @since Beta v0.13.0
   */
  type ListRes = {
    /** 原始收藏条目列表 */
    list: Array<ListItem>;
  };

  /**
   * 收藏表情列表接口的原始条目
   * @since Beta v0.13.0
   */
  type ListItem = {
    /** 表情 ID */
    id: string;
    /** 表情名称，可为空字符串 */
    name: string;
    /** 表情图片地址 */
    icon: string;
    /** 排序值 */
    sort_order: number;
    /** 静态缩略图地址，可为空字符串 */
    static_icon: string;
    /** 更新时间，接口返回字符串时间戳 */
    updated_at: string;
    /** 表情状态，STATUS_ONLINE 表示可用 */
    status: string;
    /** 表情类型，已确认的自定义类型为 EmoticonTypeCustom */
    type: string;
    /** 图片尺寸与文件信息 */
    img_ext: ImageExt;
  };

  /**
   * 收藏表情列表接口的图片信息
   * @since Beta v0.13.0
   */
  type ImageExt = Size & {
    /** 图片文件大小，单位为字节 */
    file_size: number;
  };

  /**
   * 自定义表情尺寸
   * @since Beta v0.13.0
   */
  type Size = {
    /** 图片宽度 */
    width: number;
    /** 图片高度 */
    height: number;
    /** 图片文件大小 */
    file_size?: number;
  };

  /**
   * 可安全发送的自定义表情数据
   * @since Beta v0.13.0
   */
  type Value = {
    /** 表情 ID */
    id: string;
    /** 表情图片地址 */
    url: string;
    /** 表情尺寸 */
    size: Size;
    /** 表情是否可用 */
    is_available?: boolean;
    /** 表情哈希值 */
    hash?: string;
  };

  /**
   * 收藏列表中的可用自定义表情
   * @since Beta v0.13.0
   */
  type Item = Value & {
    /** 表情是否可用 */
    is_available: boolean;
  };

  /**
   * 帖子或回复中的自定义表情节点内容
   * @since Beta v0.13.0
   */
  type Insert = {
    /** 自定义表情数据 */
    custom_emoticon: Value;
    /** 兼容米游社显示解析器的占位文本 */
    backup_text?: "[自定义表情]";
  };
}
