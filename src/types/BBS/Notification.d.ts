/**
 * 米游社消息通知类型定义文件
 * @since Beta v0.13.0
 */

declare namespace TGApp.BBS.Notification {
  /**
   * 消息通知分类
   * @since Beta v0.13.0
   * @remarks reply 为回复我的，active_mention 为主动\@我，system 为系统通知，comment 为收到的赞
   */
  type Category = "reply" | "active_mention" | "system" | "comment";

  /**
   * 消息通知列表返回响应
   * @since Beta v0.13.0
   */
  type ListResp = TGApp.BBS.Community.BaseResp<ListRes>;

  /**
   * 消息通知列表返回数据
   * @since Beta v0.13.0
   */
  type ListRes = {
    /** 通知列表 */
    list: Array<Item>;
    /** 是否最后一页 */
    is_last: boolean;
    /** 下一页最后 ID，列表为空时为 "0" */
    last_id: string;
  };

  /**
   * 未读消息数返回响应
   * @since Beta v0.13.0
   */
  type UnreadResp = TGApp.BBS.Community.BaseResp<UnreadRes>;

  /**
   * 未读消息数返回数据
   * @since Beta v0.13.0
   */
  type UnreadRes = {
    /** 各分类未读数，带 _focus 后缀的为关注用户产生的未读数 */
    count: Partial<Record<string, number>>;
  };

  /**
   * 清除未读请求参数
   * @since Beta v0.13.0
   */
  type ClearUnreadParams = {
    /** 通知分类 */
    category: Category;
    /** 是否仅清除关注用户产生的未读 */
    only_focus: boolean;
  };

  /**
   * 清除未读返回响应
   * @since Beta v0.13.0
   */
  type ClearUnreadResp = TGApp.BBS.Response.Base;

  /**
   * 消息通知条目
   * @since Beta v0.13.0
   */
  type Item = {
    /** 通知 ID */
    notification_id: string;
    /** 通知类型，如 1 回复帖子、2 回复评论、21 赞帖子、22 赞评论、40 官方推送 */
    type: number;
    /** 接收者用户 ID */
    uid: string;
    /** 操作者用户 ID */
    op_uid: string;
    /** 操作者信息，系统通知可能为空 */
    op_user: OpUser | null;
    /** 通知文本内容 */
    content: string;
    /** 结构化通知内容 JSON 字符串，可能为空字符串 */
    structured_content: string;
    /** 系统通知标题 */
    site_title: string;
    /** 系统通知正文 */
    site_content: string;
    /** 系统通知图标 */
    site_icon: string;
    /** 通知主题 */
    subject: string;
    /** 创建时间（秒级时间戳） */
    created_at: string;
    /** 更新时间（秒级时间戳） */
    updated_at: string;
    /** 是否已读 */
    is_read: boolean;
    /** 通知内容是否已删除 */
    is_content_deleted: boolean;
    /** 通知内容是否缺失 */
    content_is_missing: boolean;
    /** 按钮文本 */
    button_text: string;
    /** 游戏 ID */
    game_id: string;
    /** 网页跳转路径，可能为站内路径或完整链接 */
    web_path: string;
    /** App 跳转路径 */
    app_path: string;
    /** 是否来自关注用户 */
    is_from_focus_user: boolean;
    /** 是否禁止网页跳转 */
    is_web_jump_disable: boolean;
    /** 被操作的原内容，系统通知为 null */
    origin: Origin | null;
    /** 扩展信息 */
    ext: Ext | null;
  };

  /**
   * 通知操作者信息
   * @since Beta v0.13.0
   */
  type OpUser = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户头像编号 */
    avatar: string;
    /** 用户头像链接 */
    avatar_url: string;
    /** 用户认证信息 */
    certification: TGApp.BBS.User.Certification | null;
    /** 用户性别 */
    gender: number;
    /** 用户简介 */
    introduce: string;
    /** 当前用户是否关注该用户 */
    is_follow: boolean;
    /** 当前用户是否被该用户关注 */
    is_followed: boolean;
    /** 用户等级经验，可能为 null */
    level_exp: TGApp.BBS.User.LevelExp | null;
  };

  /**
   * 通知关联的原内容
   * @since Beta v0.13.0
   */
  type Origin = {
    /** 原内容文本 */
    text: string;
    /** 原内容结构化 JSON 字符串 */
    structured_content: string;
    /** 原内容图片 */
    image: OriginImage | null;
    /** 原内容是否已删除 */
    is_deleted: boolean;
    /** 原内容是否缺失 */
    origin_is_missing: boolean;
  };

  /**
   * 原内容图片
   * @since Beta v0.13.0
   */
  type OriginImage = {
    /** 图片链接 */
    image_url: string;
    /** 图片宽度 */
    width: number;
    /** 图片高度 */
    height: number;
    /** 图片类型 */
    type: string;
  };

  /**
   * 通知扩展信息
   * @since Beta v0.13.0
   */
  type Ext = {
    /** 关联帖子 ID */
    post_id?: string;
    /** 关联评论 ID */
    reply_id?: string;
    /** 关联版块 ID */
    forum_id?: string;
    /** 点赞描述，如“赞了我的帖子” */
    upvote_content?: string;
    /** 系统通知封面 */
    image?: string;
    /** 扩展跳转路径 */
    web_path?: string;
    /** 官方未来可能增加的扩展字段 */
    [key: string]: unknown;
  };

  /**
   * 互动消息接收范围
   * @since Beta v0.13.0
   * @remarks All 为所有人，Follow 为仅关注人，Never 为不接受任何消息提醒
   */
  type SettingScope = "All" | "Follow" | "Never";

  /**
   * 系统通知接收选项
   * @since Beta v0.13.0
   * @remarks 官网将 OPTION_ONLY_IMPORTANT 视为开启
   */
  type SystemSetting = "OPTION_ALL" | "OPTION_ONLY_IMPORTANT" | "OPTION_CLOSED";

  /**
   * 消息设置
   * @since Beta v0.13.0
   */
  type Settings = {
    /** 回复我的 */
    reply: SettingScope;
    /** 提及我的 */
    mention: SettingScope;
    /** 主动\@我 */
    active_mention: SettingScope;
    /** 给我点赞 */
    upvote: SettingScope;
    /** 关注我的 */
    follow: SettingScope;
    /** 是否接收系统消息 */
    system: boolean;
    /** 是否接收私信 */
    chat: boolean;
    /** 回复与\@推送开关 */
    push_reply_and_mention: string;
    /** 关注推送开关 */
    push_follow: string;
    /** 点赞推送开关 */
    push_upvote: string;
    /** 系统通知 */
    push_system_v2: SystemSetting;
    /** 低频提醒时间戳 */
    low_freq_notify_at_ts: string;
    /** 官方未来可能增加的设置字段 */
    [key: string]: unknown;
  };

  /**
   * 消息设置返回响应
   * @since Beta v0.13.0
   */
  type SettingsResp = TGApp.BBS.Community.BaseResp<SettingsRes>;

  /**
   * 消息设置返回数据
   * @since Beta v0.13.0
   */
  type SettingsRes = {
    /** 消息设置 */
    settings: Settings;
  };

  /**
   * 更新消息设置请求参数
   * @since Beta v0.13.0
   */
  type SettingsUpdateParams = {
    /** 完整消息设置 */
    settings: Settings;
  };

  /**
   * 更新消息设置返回响应
   * @since Beta v0.13.0
   */
  type SettingsUpdateResp = TGApp.BBS.Response.Base;
}
