/**
 * @file types/Game/Challenge.d.ts
 * @description 幽境危战相关类型定义文件
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Challenge {
  /**
   * @description 幽境危战赋光之人列表返回响应
   * @since Beta v0.8.0
   * @interface PopularityResp
   * @extends TGApp.BBS.Response.BaseWithData<PopularityRes>
   */
  type PopularityResp = TGApp.BBS.Response.BaseWithData<PopularityRes>;

  /**
   * @description 幽境危战赋光之人列表数据
   * @since Beta v0.8.0
   * @interface PopularityRes
   * @property {Array<PopularityItem>} avatar_list - 赋光之人列表
   */
  type PopularityRes = { avatar_list: Array<PopularityItem> };

  /**
   * @description 幽境危战赋光之人列表项
   * @since Beta v0.8.0
   * @interface PopularityItem
   * @property {number} avatar_id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {string} image - 角色头像图片 URL
   * @property {number} rarity - 角色稀有度
   */
  type PopularityItem = {
    avatar_id: number;
    name: string;
    element: string;
    image: string;
    rarity: number;
  };

  /**
   * @description 挑战数据返回响应（详细）
   * @since Beta v0.8.0
   * @interface ChallengeResp
   * @extends TGApp.BBS.Response.BaseWithData<ChallengeRes>
   */
  type ChallengeResp = TGApp.BBS.Response.BaseWithData<ChallengeRes>;

  /**
   * @description 挑战数据返回（详细）
   * @since Beta v0.8.0
   * @interface ChallengeRes
   * @property {Array<ChallengeItem>} data - 挑战数据列表
   * @property {boolean} is_unlock - 是否解锁挑战
   * @property {ChallengeLink} link - 挑战链接信息
   */
  type ChallengeRes = { data: Array<ChallengeItem>; is_unlock: boolean; link: ChallengeLink };

  /**
   * @description 挑战链接信息
   * @since Beta v0.8.0
   * @interface ChallengeLink
   * @property {string} lineup_link - 队伍配置链接
   * @property {string} play_link - 挑战链接
   */
  type ChallengeLink = { lineup_link: string; play_link: string };

  /**
   * @description 挑战数据项
   * @since Beta v0.8.0
   * @interface ChallengeItem
   * @property {ChallengeSchedule} schedule - 挑战周期信息
   * @property {Challenge} single - 单次挑战数据
   * @property {Challenge} mp - 多人挑战数据
   * @property {ChallengeBlings} blings - 赋予辉光数据
   */
  type ChallengeItem = {
    schedule: ChallengeSchedule;
    single: Challenge;
    mp: Challenge;
    blings: ChallengeBlings;
  };

  /**
   * @description 时间对象
   * @since Beta v0.8.0
   * @interface DateTime
   * @property {number} year - 年份
   * @property {number} month - 月份（1-12）
   * @property {number} day - 日（1-31）
   * @property {number} hour - 小时（0-23）
   * @property {number} minute - 分钟（0-59）
   * @property {number} second - 秒（0-59）
   */
  type DateTime = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };

  /**
   * @description 挑战周期信息
   * @since Beta v0.8.0
   * @interface ChallengeSchedule
   * @property {string} schedule_id - 挑战周期 ID
   * @property {string} start_time - 挑战开始时间(秒级时间戳)
   * @property {string} end_time - 挑战结束时间(秒级时间戳)
   * @property {DateTime} start_date_time - 挑战开始时间（DateTime 对象）
   * @property {DateTime} end_date_time - 挑战结束时间（DateTime 对象）
   * @property {boolean} is_valid - 是否有效
   * @property {string} name - 挑战名称
   */
  type ChallengeSchedule = {
    schedule_id: string;
    start_time: string;
    end_time: string;
    start_date_time: DateTime;
    end_date_time: DateTime;
    is_valid: boolean;
    name: string;
  };

  /**
   * @description 单次挑战数据
   * @since Beta v0.8.0
   * @interface Challenge
   * @property {ChallengeBest} best - 最佳挑战数据
   * @property {Array<ChallengeList>} challenge - 挑战列表
   * @property {boolean} has_data - 是否有数据
   */
  type Challenge = { best: ChallengeBest; challenge: Array<ChallengeList>; has_data: boolean };

  /**
   * @description 单次挑战最佳数据
   * @since Beta v0.8.0
   * @interface ChallengeBest
   * @property {number} difficulty - 挑战难度
   * @property {number} second - 挑战用时（秒）
   * @property {string} icon - 挑战图标名称
   */
  type ChallengeBest = { difficulty: number; second: number; icon: string };

  /**
   * @description 单次挑战数据项
   * @since Beta v0.8.0
   * @interface ChallengeList
   * @property {string} name - 怪物名称
   * @property {number} seconds - 挑战用时（秒）
   * @property {Array<ChallengeTeam>} teams - 挑战队伍列表
   * @property {Array<ChallengeAvatar>} best_avatar - 最佳角色列表
   * @property {ChallengeMonster} monster - 挑战怪物数据
   */
  type ChallengeList = {
    name: string;
    seconds: number;
    teams: Array<ChallengeTeam>;
    best_avatar: Array<ChallengeAvatar>;
    monster: ChallengeMonster;
  };

  /**
   * @description 单次挑战队伍数据
   * @since Beta v0.8.0
   * @interface ChallengeTeam
   * @property {number} avatar_id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {string} image - 角色头像图片 URL
   * @property {number} level - 角色等级
   * @property {number} rarity - 角色稀有度
   * @property {number} rank - 角色命座
   */
  type ChallengeTeam = {
    avatar_id: number;
    name: string;
    element: string;
    image: string;
    level: number;
    rarity: number;
    rank: number;
  };

  /**
   * @description 单次挑战最佳角色数据
   * @since Beta v0.8.0
   * @interface ChallengeAvatar
   * @property {number} avatar_id - 角色 ID
   * @property {string} side_icon - 角色侧边图标 URL
   * @property {string} dps - 角色 DPS 数据
   * @property {string} type - 1-最强一击，2-最高总伤害
   */
  type ChallengeAvatar = { avatar_id: number; side_icon: string; dps: string; type: string };

  /**
   * @description 单次挑战怪物数据
   * @since Beta v0.8.0
   * @interface ChallengeMonster
   * @property {string} name - 怪物名称
   * @property {number} level - 怪物等级
   * @property {string} icon - 怪物图标 URL
   * @property {Array<string>} desc - 怪物描述列表
   * @property {Array<MonsterTag>} tags - 怪物标签列表
   * @property {string} monster_id - 怪物 ID
   */
  type ChallengeMonster = {
    name: string;
    level: number;
    icon: string;
    desc: Array<string>;
    tags: Array<MonsterTag>;
    monster_id: string;
  };

  /**
   * @description 怪物标签
   * @since Beta v0.8.0
   * @interface MonsterTag
   * @property {string} type - 标签类型
   * @property {string} desc - 标签描述
   */
  type MonsterTag = { type: string; desc: string };

  /**
   * @description 赋予辉光数据
   * @since Beta v0.8.0
   * @interface ChallengeBlings
   */
  type ChallengeBlings = Array<ChallengeBling>;

  /**
   * @description 赋予辉光数据项
   * @since Beta v0.8.0
   * @interface ChallengeBling
   * @property {number} avatar_id - 角色 ID
   * @property {string} name - 角色名称
   * @property {string} element - 角色元素
   * @property {string} image - 角色头像图片 URL
   * @property {string} side_icon - 角色侧边图标 URL
   * @property {number} rarity - 角色稀有度
   * @property {boolean} is_plus - 是否上榜
   */
  type ChallengeBling = {
    avatar_id: number;
    name: string;
    element: string;
    image: string;
    side_icon: string;
    rarity: number;
    is_plus: boolean;
  };
}
