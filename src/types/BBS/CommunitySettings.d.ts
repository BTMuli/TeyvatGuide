/**
 * 米游社个人中心设置类型定义文件
 * @since Beta v0.12.6
 */

declare namespace TGApp.BBS.CommunitySettings {
  /**
   * 隐私隐藏字段
   * @since Beta v0.12.6
   */
  type PrivacyInvisible = {
    /** 是否隐藏发帖 */
    post?: boolean;
    /** 是否隐藏收藏 */
    collect?: boolean;
    /** 是否隐藏水印 */
    watermark?: boolean;
    /** 是否隐藏回复 */
    reply?: boolean;
    /** 是否隐藏发帖和即时 */
    post_and_instant?: boolean;
    /** 官方未来可能增加的隐私字段 */
    [key: string]: unknown;
  };

  /**
   * 获取隐私设置接口返回的数据
   * @since Beta v0.12.6
   */
  type PrivacyInfo = {
    /** 隐私隐藏字段 */
    privacy_invisible?: PrivacyInvisible;
    /** 官方未来可能增加的隐私字段 */
    [key: string]: unknown;
  };

  /**
   * 获取隐私设置响应
   * @since Beta v0.12.6
   */
  type PrivacyInfoResp = TGApp.BBS.Response.BaseWithData<PrivacyInfo>;

  /**
   * 隐私设置界面展示值
   * @since Beta v0.12.6
   */
  type PrivacyDraft = {
    /** 是否在个人中心展示帖子 */
    showPosts: boolean;
    /** 是否在个人中心展示评论 */
    showReplies: boolean;
    /** 是否在个人中心展示收藏 */
    showCollections: boolean;
    /** 是否为上传图片添加水印 */
    addWatermark: boolean;
    /** 是否允许访问个人主页 */
    showUserCenter: boolean;
  };

  /**
   * 隐私设置写入参数
   * @since Beta v0.12.6
   */
  type PrivacyUpdate = {
    /** 是否隐藏发帖和即时 */
    privacy_invisible_post_and_instant: boolean;
    /** 是否隐藏收藏 */
    privacy_invisible_collect: boolean;
    /** 是否隐藏水印 */
    privacy_invisible_watermark: boolean;
    /** 是否在个人中心展示评论 */
    privacy_visible_reply: boolean;
    /** 个人主页访问权限，1 为允许，2 为禁止 */
    privacy_user_center_view: 1 | 2;
  };

  /**
   * 隐私设置写入响应
   * @since Beta v0.12.6
   */
  type PrivacyUpdateResp = TGApp.BBS.Response.BaseWithData<unknown>;

  /**
   * 资料编辑参数
   * @since Beta v0.12.6
   */
  type ProfileUpdate = {
    /** 用户昵称 */
    nickname?: string;
    /** 用户简介 */
    introduce?: string;
    /** 用户性别 */
    gender?: number;
    /** 用户头像编号 */
    avatar?: string;
    /** 用户头像链接 */
    avatar_url?: string;
    /** 用户头像资源 ID */
    avatar_assets_id?: string;
  };

  /**
   * 资料编辑响应
   * @since Beta v0.12.6
   */
  type ProfileUpdateResp = TGApp.BBS.Response.BaseWithData<unknown>;

  /**
   * 自定义头像费用检查接口数据
   * @since Beta v0.12.6
   */
  type CustomAvatarCheckInfo = {
    /** 当前米游币余额 */
    current_myb: number;
    /** 非首次自定义头像更换费用 */
    edit_custom_avatar_cost_myb: number;
    /** 是否首次编辑自定义头像 */
    is_first_edit_custom_avatar: boolean;
    /** 是否为初始化用户 */
    is_user_init: boolean;
  };

  /**
   * 自定义头像费用检查响应
   * @since Beta v0.12.6
   */
  type CustomAvatarCheckResp = TGApp.BBS.Response.BaseWithData<CustomAvatarCheckInfo>;

  /**
   * 自定义头像费用策略
   * @since Beta v0.12.6
   */
  type CustomAvatarPolicy = {
    /** 本次实际扣除米游币 */
    cost: number;
    /** 非首次更换时的原始费用 */
    rawCost: number;
    /** 当前米游币余额 */
    balance: number;
  };

  /**
   * 米游社可选头像
   * @since Beta v0.12.6
   */
  type Avatar = {
    /** 头像 ID */
    id: number;
    /** 头像名称 */
    name: string;
    /** 头像链接 */
    icon: string;
    /** 排序 */
    sort_order: number;
    /** 状态 */
    status: string;
  };

  /**
   * 米游社可选头像分组
   * @since Beta v0.12.6
   */
  type AvatarGroup = {
    /** 分组 ID，官方当前均为 0 */
    id: number;
    /** 分组名称 */
    name: string;
    /** 头像数量 */
    num: number;
    /** 排序 */
    sort_order: number;
    /** 分组图标 */
    icon: string;
    /** 状态 */
    status: string;
    /** 头像列表 */
    list: Array<Avatar>;
  };

  /**
   * 可选头像列表响应
   * @since Beta v0.12.6
   */
  type AvatarSetResp = TGApp.BBS.Response.BaseWithData<{ list: Array<AvatarGroup> }>;

  /**
   * 动态头像资源
   * @since Beta v0.12.6
   */
  type AvatarAssetItem = {
    /** 资源 ID */
    assets_id: string;
    /** 资源类型 */
    assets_type: number;
    /** 资源名称 */
    name: string;
    /** 资源描述 */
    desc: string;
    /** 剩余有效时间，单位秒 */
    remain_time: number;
    /** 过期时间 */
    expired_time: number;
    /** 是否正在使用 */
    is_used: boolean;
    /** 排序 */
    sort_order: number;
    /** 头像资源 */
    resource?: {
      /** 标准头像资源 */
      avatar_resources?: Array<TGApp.BBS.User.AvatarExtRes>;
      /** 高清头像资源 */
      avatar_hd_resources?: Array<TGApp.BBS.User.AvatarExtRes>;
    };
  };

  /**
   * 当前账户拥有的动态头像列表
   * @since Beta v0.12.6
   */
  type AvatarAssetList = {
    /** 已拥有的资源列表 */
    assets_list?: Array<AvatarAssetItem>;
  };

  /**
   * 动态头像列表响应
   * @since Beta v0.12.6
   */
  type AvatarAssetResp = TGApp.BBS.Response.BaseWithData<AvatarAssetList>;

  /**
   * 动态头像选择项
   * @since Beta v0.12.6
   */
  type DynamicAvatar = {
    /** 动态头像资源 ID */
    id: string;
    /** 动态头像名称 */
    name: string;
    /** 动态头像预览链接 */
    url: string;
  };

  /**
   * 自定义头像裁切位置
   * @since Beta v0.12.6
   */
  type AvatarCrop = {
    /** 水平位置，0 为最左，1 为最右 */
    x: number;
    /** 垂直位置，0 为最上，1 为最下 */
    y: number;
  };

  /**
   * 自定义头像确认结果
   * @since Beta v0.12.6
   */
  type CustomAvatarSelection = {
    /** 裁切后的静态头像文件 */
    file: File;
    /** 用于再次调整裁切的原始文件 */
    sourceFile: File;
    /** 裁切位置 */
    crop: AvatarCrop;
  };

  /**
   * 用户头像框
   * @since Beta v0.12.6
   */
  type Pendant = {
    /** 头像框 ID */
    id: number;
    /** 头像框图片链接 */
    url: string;
    /** 头像框名称 */
    name: string;
    /** 头像框描述 */
    description?: string;
    /** 绘制者 */
    author?: string;
    /** 剩余有效时间，单位秒 */
    remain_time?: number;
    /** 是否已拥有 */
    owned: boolean;
    /** 是否限时 */
    expired_time?: number;
    /** 是否正在使用 */
    is_used: boolean;
    /** 获取方法 */
    obtainMethod?: string;
  };

  /**
   * 评论装扮
   * @since Beta v0.12.6
   * @remarks 官方以字符串返回 19 位资源 ID，不能转换为 Number，否则会丢失精度
   */
  type CommentDecoration = {
    /** 评论装扮资源 ID */
    id: string;
    /** 评论装扮图片链接 */
    url: string;
    /** 评论装扮名称 */
    name: string;
    /** 评论装扮描述，通常包含获取方法 */
    description?: string;
    /** 绘制者 */
    author?: string;
    /** 剩余有效时间，单位秒 */
    remain_time?: number;
    /** 是否已拥有 */
    owned: boolean;
    /** 是否限时 */
    expired_time?: number;
    /** 是否正在使用 */
    is_used: boolean;
    /** 评论气泡背景色，不带 # */
    bg_color?: string;
    /** 获取方法 */
    obtainMethod?: string;
  };

  /**
   * 用户头像框列表响应
   * @since Beta v0.12.6
   */
  type PendantListResp = TGApp.BBS.Response.BaseWithData<{ list: Array<Pendant> }>;

  /**
   * 头像框设置参数
   * @since Beta v0.12.6
   */
  type PendantUpdate = {
    /** 头像框 ID，0 表示不使用头像框 */
    pendant_id: number;
  };

  /**
   * 头像框设置响应
   * @since Beta v0.12.6
   */
  type PendantUpdateResp = TGApp.BBS.Response.BaseWithData<unknown>;

  /**
   * 评论装扮列表响应
   * @since Beta v0.12.6
   */
  type CommentDecorationListResp = TGApp.BBS.Response.BaseWithData<{
    list: Array<CommentDecoration>;
  }>;

  /**
   * 评论装扮设置响应
   * @since Beta v0.12.6
   */
  type CommentDecorationUpdateResp = TGApp.BBS.Response.BaseWithData<unknown>;
}
