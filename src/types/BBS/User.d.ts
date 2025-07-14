/**
 * @file types/BBS/User.d.ts
 * @description 用户类型定义文件
 * @since Beta v0.7.9
 */

declare namespace TGApp.BBS.User {
  /**
   * @description 用户信息返回
   * @since Beta v0.7.2
   * @interface InfoResp
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {InfoRes} data 用户信息
   * @return InfoResp
   */
  type InfoResp = TGApp.BBS.Response.BaseWithData<InfoRes>;

  /**
   * @description 主页用户信息
   * @since Beta v0.7.2
   * @interface InfoRes 用户信息
   * @property {Info} user_info 用户信息
   * @property {unknown} follow_relation 关注关系
   * @property {unknown[]} auth_relations 认证关系
   * @property {boolean} is_in_blacklist 是否在黑名单中
   * @property {boolean} is_has_collection 是否有收藏
   * @property {boolean} is_creator 是否是创作者
   * @property custom_service 客服信息
   * @property {boolean} custom_service.is_customer_service_staff 是否是客服
   * @property {number} custom_service.game_id 游戏 ID
   * @property  audit_info 审核信息
   * @property {boolean} audit_info.is_nickname_in_audit 是否在昵称审核中
   * @property {string} audit_info.nickname 审核中的昵称
   * @property {boolean} audit_info.is_introduce_in_audit 是否在简介审核中
   * @property {string} audit_info.introduce 审核中的简介
   * @property {number} audit_info.nickname_status 昵称审核状态
   * @return InfoRes
   */
  type InfoRes = {
    user_info: Info;
    follow_relation: unknown;
    auth_relations: Array<unknown>;
    is_in_blacklist: boolean;
    is_has_collection: boolean;
    is_creator: boolean;
    custom_service: {
      is_customer_service_staff: boolean;
      game_id: number;
    };
    audit_info: {
      is_nickname_in_audit: boolean;
      nickname: string;
      is_introduce_in_audit: boolean;
      introduce: string;
      nickname_status: number;
    };
  };

  /**
   * @description 主页用户信息-二级
   * @since Beta v0.7.9
   * @interface Info
   * @property {string} uid 用户 ID
   * @property {string} nickname 用户昵称
   * @property {string} introduce 用户简介
   * @property {string} avatar 用户头像编号
   * @property {number} gender 用户性别
   * @property {Certification} certification 用户认证信息
   * @property {LevelExp[]} level_exps 用户等级经验
   * @property {Achieve} achieve 用户档案
   * @property {Community} community_info 用户社区信息
   * @property {string} avatar_url 用户头像链接
   * @property {Certification[]} certifications 用户认证信息
   * @property {LevelExp} level_exp 用户等级经验
   * @property {string} pendant 用户挂件 URL，可能为 ""
   * @property {boolean} is_logoff 是否注销
   * @property {string} ip_region 用户 IP 地区
   * @property {string | null} showText 显示文本，可能为 null
   * @property {AvatarExt} avatar_ext 用户头像扩展信息
   */
  type Info = {
    uid: string;
    nickname: string;
    introduce: string;
    avatar: string;
    gender: number;
    certification: Certification;
    level_exps: Array<LevelExp>;
    achieve: Achieve;
    community_info: Community;
    avatar_url: string;
    certifications: Array<Certification>;
    level_exp: LevelExp;
    pendant: string;
    is_logoff: boolean;
    ip_region: string;
    showText: string | null; // 显示文本，可能为 null
    avatar_ext: AvatarExt;
  };

  /**
   * @description 用户认证信息
   * @since Alpha v0.2.1
   * @interface Certification
   * @property {number} type 认证类型
   * @property {string} label 认证标签
   * @return Certification
   */
  type Certification = { type: number; label: string };

  /**
   * @description 用户等级经验
   * @since Beta v0.7.2
   * @interface LevelExp
   * @property {number} level 用户等级
   * @property {number} exp 用户经验
   * @property {number} game_id 游戏 ID
   * @return LevelExp
   */
  type LevelExp = { level: number; exp: number; game_id?: number };

  /**
   * @description 用户操作
   * @since Beta v0.7.2
   * @interface SelfOperation
   * @property {number} attitude 操作类型
   * @property {boolean} is_collected 是否收藏
   * @property {number} upvote_type 互动类型
   * @returns {SelfOperation}
   */
  type SelfOperation = { attitude: number; is_collected: boolean; upvote_type: number };

  /**
   * @description 用户头像类型
   * @since Beta v0.7.9
   * @const AvatarExtType
   * @enum {number}
   * @property {number} CUSTOM - 自定义头像(0)
   * @property {number} GIF - 可选动态头像(3)
   */
  const AvatarExtType = <const>{
    CUSTOM: 0,
    GIF: 3,
  };

  /**
   * @description 用户头像类型枚举
   * @since Beta v0.7.9
   * @enum {number}
   * @type AvatarExtTypeEnum
   */
  type AvatarExtTypeEnum = (typeof AvatarExtType)[keyof typeof AvatarExtType];

  /**
   * @description 用户头像扩展信息
   * @since Beta v0.7.9
   * @interface AvatarExt
   * @property {AvatarExtTypeEnum} avatar_type 头像类型
   * @property {string} avatar_assets_id 头像资源 ID
   * @property {Array<AvatarExtRes>} resources 资源
   * @property {Array<AvatarExtRes>} hd_resources 高清资源
   * @return AvatarExt
   */
  type AvatarExt = {
    avatar_type: AvatarExtTypeEnum;
    avatar_assets_id: string;
    resources: Array<AvatarExtRes>;
    hd_resources: Array<AvatarExtRes>;
  };

  /**
   * @description 用户头像拓展资源类型
   * @since Beta v0.7.9
   * @const AvatarExtResType
   * @property {number} WEBP - WEBP 格式
   * @property {number} APNG - APNG 格式
   * @property {number} GIF - GIF 格式
   * @property {number} PNG - PNG 格式
   */
  const AvatarExtResType = <const>{
    WEBP: 1,
    APNG: 2,
    GIF: 3,
    PNG: 4,
  };

  /**
   * @description 用户头像拓展资源类型枚举
   * @since Beta v0.7.9
   * @enum {number}
   * @type AvatarExtResTypeEnum
   */
  type AvatarExtResTypeEnum = (typeof AvatarExtResType)[keyof typeof AvatarExtResType];

  /**
   * @description 用户头像拓展资源
   * @since Beta v0.7.9
   * @interface AvatarExtRes
   * @property {AvatarExtResTypeEnum} format 资源格式
   * @property {string} url 资源链接
   */
  type AvatarExtRes = { format: AvatarExtResTypeEnum; url: string };

  /**
   * @description 用户档案
   * @since Beta v0.7.9
   * @interface Achieve
   * @property {string} like_num 获赞数
   * @property {string} post_num 发帖数
   * @property {string} replypost_num 回帖数
   * @property {string} follow_cnt 关注数
   * @property {string} followed_cnt 被关注数
   * @property {string} topic_cnt 话题数
   * @property {string} new_follower_num 新粉丝数
   * @property {string} good_post_num 精华帖数
   * @property {string} follow_collection_cnt 收藏数
   * @return Achieve
   */
  type Achieve = {
    like_num: string;
    post_num: string;
    replypost_num: string;
    follow_cnt: string;
    followed_cnt: string;
    topic_cnt: string;
    new_follower_num: string;
    good_post_num: string;
    follow_collection_cnt: string;
  };

  /**
   * @description 用户社区信息
   * @since Beta v0.7.2
   * @interface Community
   * @property {boolean} is_realname 是否实名
   * @property {boolean} agree_status 是否同意协议
   * @property {number} silent_end_time 禁言结束时间
   * @property {number} forbid_end_time 封禁结束时间
   * @property {number} info_upd_time 信息更新时间
   * @property privacy_invisible 用户隐私设置
   * @property {boolean} privacy_invisible.post 是否隐藏发帖
   * @property {boolean} privacy_invisible.collect 是否隐藏收藏
   * @property {boolean} privacy_invisible.watermark 是否隐藏水印
   * @property {boolean} privacy_invisible.reply 是否隐藏回复
   * @property {boolean} privacy_invisible.post_and_instant 是否隐藏发帖和即时
   * @property notify_disable 用户通知设置
   * @property {boolean} notify_disable.reply 是否禁用回复通知
   * @property {boolean} notify_disable.upvote 是否禁用点赞通知
   * @property {boolean} notify_disable.follow 是否禁用关注通知
   * @property {boolean} notify_disable.system 是否禁用系统通知
   * @property {boolean} notify_disable.chat 是否禁用聊天通知
   * @property {boolean} has_initialized 是否初始化
   * @property user_func_status 用户功能状态
   * @property {boolean} user_func_status.enable_history_view 是否启用历史记录
   * @property {boolean} user_func_status.enable_recommend 是否启用推荐
   * @property {boolean} user_func_status.enable_mention 是否启用提及
   * @property {number} user_func_status.user_center_view 是否启用用户中心\
   * @property {unknown[]} forum_silent_info 论坛禁言信息
   * @property {string} last_login_ip 上次登录 IP
   * @property {number} last_login_time 上次登录时间
   * @property {number} created_at 创建时间
   * @return Community
   */
  type Community = {
    is_realname: boolean;
    agree_status: boolean;
    silent_end_time: number;
    forbid_end_time: number;
    info_upd_time: number;
    privacy_invisible: {
      post: boolean;
      collect: boolean;
      watermark: boolean;
      reply: boolean;
      post_and_instant: boolean;
    };
    notify_disable: {
      reply: boolean;
      upvote: boolean;
      follow: boolean;
      system: boolean;
      chat: boolean;
    };
    has_initialized: boolean;
    user_func_status: {
      enable_history_view: boolean;
      enable_recommend: boolean;
      enable_mention: boolean;
      user_center_view: number;
    };
    forum_silent_info: unknown[];
    last_login_ip: string;
    last_login_time: number;
    created_at: number;
  };
}
