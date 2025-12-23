/**
 * 用户类型定义文件
 * @since Beta v0.7.9
 */
declare namespace TGApp.BBS.User {
  /**
   * 用户信息返回响应
   * @since Beta v0.7.2
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * 用户信息返回
   * @since Beta v0.7.2
   */
  type InfoRes = {
    /** 用户信息 */
    user_info: Info;
    /** 关注关系 */
    follow_relation: unknown;
    /** 认证关系 */
    auth_relations: Array<unknown>;
    /** 是否在黑名单中 */
    is_in_blacklist: boolean;
    /** 是否有收藏 */
    is_has_collection: boolean;
    /** 是否是创作者 */
    is_creator: boolean;
    /** 客服信息 */
    custom_service: {
      /** 是否是客服 */
      is_customer_service_staff: boolean;
      /** 分区 ID */
      game_id: number;
    };
    /** 编辑信息 */
    audit_info: {
      /** 是否在编辑昵称 */
      is_nickname_in_audit: boolean;
      /** 昵称 */
      nickname: string;
      /** 是否在编辑简介 */
      is_introduce_in_audit: boolean;
      /** 简介 */
      introduce: string;
      /** 昵称状态 */
      nickname_status: number;
    };
  };

  /**
   * 主页用户信息-二级
   * @since Beta v0.7.9
   */
  type Info = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户简介 */
    introduce: string;
    /** 用户头像编号 */
    avatar: string;
    /** 用户性别 */
    gender: number;
    /** 用户认证信息 */
    certification: Certification;
    /** 用户等级经验 */
    level_exps: Array<LevelExp>;
    /** 用户档案 */
    achieve: Achieve;
    /** 用户社区信息 */
    community_info: Community;
    /** 用户头像链接 */
    avatar_url: string;
    /** 用户认证信息 */
    certifications: Array<Certification>;
    /** 用户等级经验 */
    level_exp: LevelExp;
    /** 用户挂件 URL，可能为 "" */
    pendant: string;
    /** 是否注销 */
    is_logoff: boolean;
    /** 用户 IP 地区 */
    ip_region: string;
    /** 显示文本，可能为 null */
    showText: string | null;
    /** 用户头像扩展信息 */
    avatar_ext: AvatarExt;
  };

  /**
   * 用户认证信息
   * @since Alpha v0.2.1
   */
  type Certification = {
    /** 认证类型 */
    type: number;
    /** 认证标签 */
    label: string;
  };

  /**
   * 用户等级经验
   * @since Beta v0.7.2
   */
  type LevelExp = {
    /** 用户等级 */
    level: number;
    /** 用户经验 */
    exp: number;
    /** 游戏 ID */
    game_id?: number;
  };

  /**
   * 用户操作
   * @since Beta v0.7.2
   */
  type SelfOperation = {
    /** 操作类型 */
    attitude: number;
    /** 是否收藏 */
    is_collected: boolean;
    /** 互动类型 */
    upvote_type: number;
  };

  /**
   * 用户头像类型
   * @since Beta v0.7.9
   */
  const AvatarExtType = <const>{
    /** 自定义头像 */
    CUSTOM: 0,
    /** 可选动态头像 */
    GIF: 3,
  };

  /**
   * 用户头像类型枚举
   * @since Beta v0.7.9
   */
  type AvatarExtTypeEnum = (typeof AvatarExtType)[keyof typeof AvatarExtType];

  /**
   * 用户头像扩展信息
   * @since Beta v0.7.9
   */
  type AvatarExt = {
    /** 头像类型 */
    avatar_type: AvatarExtTypeEnum;
    /** 头像资源 ID */
    avatar_assets_id: string;
    /** 资源 */
    resources: Array<AvatarExtRes>;
    /** 高清资源 */
    hd_resources: Array<AvatarExtRes>;
  };

  /**
   * 用户头像拓展资源类型
   * @since Beta v0.7.9
   */
  const AvatarExtResType = <const>{
    /** WEBP 格式 */
    WEBP: 1,
    /** APNG 格式 */
    APNG: 2,
    /** GIF 格式 */
    GIF: 3,
    /** PNG 格式 */
    PNG: 4,
  };

  /**
   * 用户头像拓展资源类型枚举
   * @since Beta v0.7.9
   */
  type AvatarExtResTypeEnum = (typeof AvatarExtResType)[keyof typeof AvatarExtResType];

  /**
   * 用户头像拓展资源
   * @since Beta v0.7.9
   */
  type AvatarExtRes = {
    /** 资源格式 */
    format: AvatarExtResTypeEnum;
    /** 资源链接 */
    url: string;
  };

  /**
   * 用户档案
   * @since Beta v0.7.9
   */
  type Achieve = {
    /** 获赞数 */
    like_num: string;
    /** 发帖数 */
    post_num: string;
    /** 回帖数 */
    replypost_num: string;
    /** 关注数 */
    follow_cnt: string;
    /** 被关注数 */
    followed_cnt: string;
    /** 话题数 */
    topic_cnt: string;
    /** 新粉丝数 */
    new_follower_num: string;
    /** 精华帖数 */
    good_post_num: string;
    /** 收藏数 */
    follow_collection_cnt: string;
  };

  /**
   * 用户社区信息
   * @since Beta v0.7.2
   */
  type Community = {
    /** 是否实名 */
    is_realname: boolean;
    /** 是否同意协议 */
    agree_status: boolean;
    /** 禁言结束时间 */
    silent_end_time: number;
    /** 封禁结束时间 */
    forbid_end_time: number;
    /** 信息更新时间 */
    info_upd_time: number;
    /** 用户隐私设置 */
    privacy_invisible: {
      /** 是否隐藏发帖 */
      post: boolean;
      /** 是否隐藏收藏 */
      collect: boolean;
      /** 是否隐藏水印 */
      watermark: boolean;
      /** 是否隐藏回复 */
      reply: boolean;
      /** 是否隐藏发帖和即时 */
      post_and_instant: boolean;
    };
    /** 用户通知设置 */
    notify_disable: {
      /** 是否禁用回复通知 */
      reply: boolean;
      /** 是否禁用点赞通知 */
      upvote: boolean;
      /** 是否禁用关注通知 */
      follow: boolean;
      /** 是否禁用系统通知 */
      system: boolean;
      /** 是否禁用聊天通知 */
      chat: boolean;
    };
    /** 是否初始化 */
    has_initialized: boolean;
    /** 用户功能状态 */
    user_func_status: {
      /** 是否启用历史记录 */
      enable_history_view: boolean;
      /** 是否启用推荐 */
      enable_recommend: boolean;
      /** 是否启用提及 */
      enable_mention: boolean;
      /** 是否启用用户中心 */
      user_center_view: number;
    };
    /** 论坛禁言信息 */
    forum_silent_info: Array<unknown>;
    /** 上次登录 IP */
    last_login_ip: string;
    /** 上次登录时间 */
    last_login_time: number;
    /** 创建时间 */
    created_at: number;
  };
}
