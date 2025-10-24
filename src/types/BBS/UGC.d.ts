/**
 * @file types/BBS/UGC.d.ts
 * @description 千星奇域类型定义文件
 * @since Beta v0.8.4
 */

declare namespace TGApp.BBS.UGC {
  /**
   * @description UGC 游戏角色信息
   * @since Beta v0.8.4
   * @interface Character
   * @property {string} region 游戏区服
   * @property {string} game_uid 游戏 UID
   * @property {string} nickname 游戏昵称
   * @property {string} user_label 用户标签
   * @property {string} region_name 区服名称
   */
  type Character = {
    region: string;
    game_uid: string;
    nickname: string;
    user_label: string;
    region_name: string;
  };

  /**
   * @description 关卡信息
   * @since Beta v0.8.4
   * @interface Level
   * @property {string} level_id 关卡 ID
   * @property {string} region 区域
   * @property {string} level_name 关卡名称
   * @property {Cover} cover 关卡封面
   * @property {string} desc 关卡描述
   * @property {number} limit_play_num_min 最小游玩人数
   * @property {number} limit_play_num_max 最大游玩人数
   * @property {string} play_type 游玩类型
   * @property {string} good_rate 好评率
   * @property {string} hot_score 热度分数
   * @property {string} creator_uid 创建者 UID
   * @property {InteractInfo} interact_info 交互信息
   * @property {LevelAttachment} level_attachment 关卡附件
   * @property {UserPlayInfo} user_play_info 用户游玩信息
   * @property {Extra} extra 额外信息
   * @property {boolean} level_info_has_released 关卡信息是否已发布
   * @property {string} level_source_type 关卡来源类型
   * @property {string} data_box 数据盒
   * @property {string} show_limit_play_num_str 显示的游玩人数限制字符串
   * @property {string} level_intro 关卡介绍
   */
  type Level = {
    level_id: string;
    region: string;
    level_name: string;
    cover: Cover;
    desc: string;
    limit_play_num_min: number;
    limit_play_num_max: number;
    play_type: string;
    good_rate: string;
    hot_score: string;
    creator_uid: string;
    interact_info: InteractInfo;
    level_attachment: LevelAttachment | null;
    user_play_info: UserPlayInfo;
    extra: Extra;
    level_info_has_released: boolean;
    level_source_type: string;
    data_box: string;
    show_limit_play_num_str: string;
    level_intro: string;
  };

  /**
   * @description 关卡封面
   * @since Beta v0.8.4
   * @interface Cover
   * @property {string} url 封面链接
   */
  type Cover = { url: string };

  /**
   * @description 用户交互信息
   * @since Beta v0.8.4
   * @interface InteractInfo
   * @property {boolean} has_fav 是否已收藏
   */
  type InteractInfo = { has_fav: boolean };

  /**
   * @description 关卡附件
   * @since Beta v0.8.4
   * @interface LevelAttachment
   * @property {string} type 信息类型
   * @property {string} content 信息内容
   */
  type LevelAttachment = { type: string; content: string };

  /**
   * @description 游玩信息
   * @since Beta v0.8.4
   * @interface UserPlayInfo
   * @property {boolean} has_played 是否已游玩
   * @property {string} played_time 游玩时间
   * @property {number} played_count 游玩次数
   */
  type UserPlayInfo = { has_played: boolean; played_time: string; played_count: number };

  /**
   * @description 额外信息
   * @since Beta v0.8.4
   * @interface Extra
   * @property {Array<PlayLink>} play_link 游玩链接
   * @property {boolean} friends_played 好友游玩过
   * @property {Array<unknown>} friends_played_list 好友游玩列表 // TODO: 类型待确定
   * @property {string} first_online_time 首次上线时间
   */
  type Extra = {
    play_link: Array<PlayLink>;
    friends_played: boolean;
    friends_played_list: Array<Character>;
    first_online_time: string;
  };

  /**
   * @description 游玩链接
   * @since Beta v0.8.4
   * @interface PlayLink
   * @property {string} link_content 链接内容
   * @property {string} link_type 链接类型
   */
  type PlayLink = { link_content: string; link_type: string };
}
