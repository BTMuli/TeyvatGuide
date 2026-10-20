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
  };

  /**
   * 资料编辑响应
   * @since Beta v0.12.6
   */
  type ProfileUpdateResp = TGApp.BBS.Response.BaseWithData<unknown>;
}
