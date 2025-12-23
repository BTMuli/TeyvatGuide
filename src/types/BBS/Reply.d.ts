/**
 * 回复数据类型定义文件
 * @since Beta v0.7.2
 */
declare namespace TGApp.BBS.Reply {
  /**
   * 帖子回复数据类型
   * @since Beta v0.7.1
   */
  type MainResp = TGApp.BBS.Response.BaseWithData<MainRes>;

  /**
   * 子回复数据类型
   * @since Beta v0.7.1
   */
  type SubResp = TGApp.BBS.Response.BaseWithData<SubRes>;

  /**
   * 回复数据类型
   * @since Beta v0.7.1
   */
  type MainRes = {
    /** 回复列表 */
    list: Array<ReplyFull>;
    /** 最后 ID */
    last_id: string;
    /** 是否最后 */
    is_last: boolean;
    /** 帖子拥有者 ID */
    post_owner_id: string;
    /** 置顶回复 ID */
    pin_reply_id: string;
    /** 折叠回复数 */
    fold_reply_num: number;
  };

  /**
   * 子回复数据类型
   * @since Beta v0.7.1
   */
  type SubRes = {
    /** 回复列表 */
    list: Array<ReplyFull>;
    /** 最后 ID */
    last_id: string;
    /** 是否最后 */
    is_last: boolean;
    /** 是否有上一页 */
    has_previous: boolean;
    /** 帖子拥有者 ID */
    post_owner_id: string;
  };

  /**
   * 回复数据类型
   * @since Beta v0.7.2
   */
  type ReplyFull = {
    /** 回复数据 */
    reply: Reply;
    /** 用户数据 */
    user: User;
    /** 点赞数据 */
    stat: Stat;
    /** 自身操作数据 */
    self_operation: TGApp.BBS.User.SelfOperation;
    /** 主楼状态数据 */
    master_status: MasterStatus;
    /** 图片数据 */
    images: Array<TGApp.BBS.Post.Image>;
    /** 子回复数据 */
    sub_replies: Array<ReplyFull>;
    /** 是否楼主 */
    is_lz: boolean;
    /** 子回复数量 */
    sub_reply_count: number;
    /** 回复用户数据 */
    r_user: User | null;
    /** 未知数据 */
    r_reply: unknown;
    /** 未知数据 */
    r_post: unknown;
    /** 未知数据 */
    user_game_info: unknown;
  };

  /**
   * 回复数据类型
   * @since Beta v0.7.1
   */
  type Reply = {
    /** 游戏 ID */
    game_id: number;
    /** 帖子 ID */
    post_id: string;
    /** 回复 ID */
    reply_id: string;
    /** 用户 ID */
    uid: string;
    /** 回复用户 ID */
    r_uid: string;
    /** 回复内容 */
    content: string;
    /** 板块 ID */
    f_forum_id: number;
    /** 主楼 ID */
    f_reply_id: string;
    /** 楼层 ID */
    floor_id: number;
    /** 是否删除，0 未删除 1 已删除 */
    is_deleted: number;
    /** 删除来源 */
    delete_src: number;
    /** 创建时间，秒级时间戳 */
    created_at: number;
    /** 更新时间，秒级时间戳 */
    updated_at: number;
    /** 删除时间，秒级时间戳 */
    deleted_at: number;
    /** 结构化内容 */
    struct_content: string;
    /** 结构化内容行 */
    structured_content_rows: Array<unknown>;
    /** 是否置顶 */
    is_top: boolean;
    /** 是否有屏蔽词 */
    has_block_word: boolean;
    /** 公开状态 */
    overt_status: number;
    /** 是否显示缺失 */
    is_showing_missing: boolean;
    /** 选中评论时间 */
    selected_comment_time: number;
    /** 是否导师 */
    is_mentor: boolean;
    /** 查看状态 */
    view_status: number;
  };

  /**
   * 帖子回复中的用户信息
   * @since Beta v0.7.2
   */
  type User = {
    /** 用户 ID */
    uid: string;
    /** 用户昵称 */
    nickname: string;
    /** 用户简介 */
    introduce: string;
    /** 用户头像 */
    avatar: string;
    /** 用户性别 */
    gender: number;
    /** 用户认证信息 */
    certification: TGApp.BBS.User.Certification;
    /** 用户等级经验 */
    level_exp: TGApp.BBS.User.LevelExp;
    /** 用户头像链接 */
    avatar_url: string;
    /** 用户挂件 URL，可能为 "" */
    pendant: string;
    /** 用户 IP 地区 */
    ip_region: string;
    /** 是否关注 */
    is_following: boolean;
    /** 是否被关注 */
    is_followed: boolean;
    /** 用户头像扩展信息 */
    avatar_ext: TGApp.BBS.User.AvatarExt;
    /** 是否是铁粉 */
    is_super_fan: boolean;
    /** 回复气泡，可能为 null */
    reply_bubble: Bubble | null;
  };

  /**
   * 回复气泡数据类型
   * @since Beta v0.7.1
   */
  type Bubble = {
    /** 资源 ID */
    assets_id: string;
    /** 背景颜色 */
    bg_color: string;
    /** 链接 */
    url: string;
    /** 名称 */
    name: string;
  };

  /**
   * 点赞数据类型
   * @since Beta v0.7.1
   */
  type Stat = {
    /** 回复数 */
    reply_num: number;
    /** 点赞数 */
    like_num: number;
    /** 子回复数 */
    sub_num: number;
    /** 踩数 */
    dislike_num: number;
  };

  /**
   * 主楼状态数据类型
   * @since Beta v0.5.5
   */
  type MasterStatus = {
    /** 是否官方 */
    is_official_master: boolean;
    /** 是否用户 */
    is_user_master: boolean;
  };
}
