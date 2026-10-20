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
}
