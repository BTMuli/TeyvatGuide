/**
 * 千星奇域类型定义文件
 * @since Beta v0.8.4
 */
declare namespace TGApp.BBS.UGC {
  /**
   * UGC 游戏角色信息
   * @since Beta v0.8.4
   */
  type Character = {
    /** 游戏区服 */
    region: string;
    /** 游戏 UID */
    game_uid: string;
    /** 游戏昵称 */
    nickname: string;
    /** 用户标签 */
    user_label: string;
    /** 区服名称 */
    region_name: string;
  };

  /**
   * 关卡信息
   * @since Beta v0.8.4
   */
  type Level = {
    /** 关卡 ID */
    level_id: string;
    /** 区域 */
    region: string;
    /** 关卡名称 */
    level_name: string;
    /** 关卡封面 */
    cover: Cover;
    /** 关卡描述 */
    desc: string;
    /** 最小游玩人数 */
    limit_play_num_min: number;
    /** 最大游玩人数 */
    limit_play_num_max: number;
    /** 游玩类型 */
    play_type: string;
    /** 好评率 */
    good_rate: string;
    /** 热度分数 */
    hot_score: string;
    /** 创建者 UID */
    creator_uid: string;
    /** 交互信息 */
    interact_info: InteractInfo;
    /** 关卡附件 */
    level_attachment: LevelAttachment | null;
    /** 用户游玩信息 */
    user_play_info: UserPlayInfo;
    /** 额外信息 */
    extra: Extra;
    /** 关卡信息是否已发布 */
    level_info_has_released: boolean;
    /** 关卡来源类型 */
    level_source_type: string;
    /** 数据盒 */
    data_box: string;
    /** 显示的游玩人数限制字符串 */
    show_limit_play_num_str: string;
    /** 关卡介绍 */
    level_intro: string;
  };

  /**
   * 关卡封面
   * @since Beta v0.8.4
   */
  type Cover = {
    /** 封面链接 */
    url: string;
  };

  /**
   * 用户交互信息
   * @since Beta v0.8.4
   */
  type InteractInfo = {
    /** 是否已收藏 */
    has_fav: boolean;
  };

  /**
   * 关卡附件
   * @since Beta v0.8.4
   */
  type LevelAttachment = {
    /** 信息类型 */
    type: string;
    /** 信息内容 */
    content: string;
  };

  /**
   * 游玩信息
   * @since Beta v0.8.4
   */
  type UserPlayInfo = {
    /** 是否已游玩 */
    has_played: boolean;
    /** 游玩时间 */
    played_time: string;
    /** 游玩次数 */
    played_count: number;
  };

  /**
   * 额外信息
   * @since Beta v0.8.4
   */
  type Extra = {
    /** 游玩链接 */
    play_link: Array<PlayLink>;
    /** 好友游玩过 */
    friends_played: boolean;
    /** 好友游玩列表 */
    friends_played_list: Array<Character>;
    /** 首次上线时间 */
    first_online_time: string;
  };

  /**
   * 游玩链接
   * @since Beta v0.8.4
   */
  type PlayLink = {
    /** 链接内容 */
    link_content: string;
    /** 链接类型 */
    link_type: string;
  };
}
