/**
 * @file types/Game/Combat.d.ts
 * @description 幻想真境剧诗类型定义
 * @since Beta v0.6.3
 */

/**
 * @description 幻想真境剧诗相关类型
 * @since Beta v0.6.3
 * @namespace TGApp.Game.Combat
 * @memberOf TGApp.Game
 */
declare namespace TGApp.Game.Combat {
  /**
   * @description 幻想真境剧诗数据返回类型
   * @interface Response
   * @since Beta v0.6.3
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data
   * @return Response
   */
  interface Response extends TGApp.BBS.Response.BaseWithData {
    data: FullData;
  }

  /**
   * @description 返回完整数据类型
   * @interface FullData
   * @since Beta v0.6.3
   * @property {boolean} is_unlock 是否解锁
   * @property {Record<string,string>} links 相关链接
   * @property {Array<Combat>} data 挑战数据
   * @return FullData
   */
  interface FullData {
    is_unlock: boolean;
    links: Record<string, string>;
    data: Array<Combat>;
  }

  /**
   * @description 角色数据
   * @interface Avatar
   * @since Beta v0.6.3
   * @property {number} avatar_id 角色id
   * @property {number} avatar_type 角色类型 // 0-自己角色，1-试用角色，2-助演角色
   * @property {string} name 角色名称
   * @property {string} element 角色元素 // todo Dendro
   * @property {string} image 角色图像
   * @property {number} level 角色等级
   * @property {number} rarity 角色稀有度
   * @return Avatar
   */
  interface Avatar {
    avatar_id: number;
    avatar_type: number;
    name: string;
    element: string;
    image: string;
    level: number;
    rarity: number;
  }

  /**
   * @description 简要角色
   * @interface AvatarMini
   * @since Beta v0.6.3
   * @property {number} avatar_id 角色id
   * @property {number} avatar_icon 角色图标
   * @property {string} value 值
   * @property {number} rarity 角色稀有度
   * @return AvatarMini
   */
  interface AvatarMini {
    avatar_id: number;
    avatar_icon: string;
    value: string;
    rarity: number;
  }

  /**
   * @description Buff
   * @interface Buff
   * @since Beta v0.6.3
   * @property {string} name 名称
   * @property {string} icon 图标
   * @property {number} level 等级
   * @property {Array<BuffEffect>} level_effect 不同等级下的助益
   * @return Buff
   */
  interface Buff {
    name: string;
    icon: string;
    level: number;
    level_effect: Array<BuffEffect>;
  }

  /**
   * @description Buff助益
   * @interface BuffEffect
   * @since Beta v0.6.3
   * @property {string} icon 图标
   * @property {string} name 名称
   * @property {string} desc 描述
   * @return BuffEffect
   */
  interface BuffEffect {
    icon: string;
    name: string;
    desc: string;
  }

  /**
   * @description 卡片
   * @interface Card
   * @since Beta v0.6.3
   * @property {string} icon 图标
   * @property {string} name 名称
   * @property {string} desc 描述 // todo 带 <color>
   * @property {boolean} is_enhanced 是否加强
   * @property {number} id ID
   * @return Card
   */
  interface Card {
    icon: string;
    name: string;
    desc: string;
    is_enhanced: boolean;
    id: number;
  }

  /**
   * @description 时间
   * @interface DateTime
   * @since Beta v0.6.3
   * @property {number} year 年份
   * @property {number} month 月份
   * @property {number} day 日期
   * @property {number} hour 小时
   * @property {number} minute 分钟
   * @property {number} second 秒
   * @return DateTime
   */
  interface DateTime {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  }

  /**
   * @description 状态
   * @interface Stat
   * @since Beta v0.6.3
   * @property {number} difficulty_id 难度等级
   * @property {number} max_round_id 最多层数
   * @property {number} heraldry 纹章数
   * @property {Array<0|1>} get_medal_round_list 星章获取状况
   * @property {number} medal_num 星章获取数
   * @property {number} coin_num 硬币数
   * @property {number} avatar_bonus_num 角色声援数
   * @property {number} rent_cnt 出借次数
   * @return Stat
   */
  interface Stat {
    difficulty_id: number;
    max_round_id: number;
    heraldry: number;
    get_medal_round_list: Array<0 | 1>;
    medal_num: number;
    coin_num: number;
    avatar_bonus_num: number;
    rent_cnt: number;
  }

  /**
   * @description 敌人
   * @interface Enemy
   * @since Beta v0.6.3
   * @property {string} name 名称
   * @property {string} icon 图标
   * @property {number} level 等级
   * @return Enemy
   */
  interface Enemy {
    name: string;
    icon: string;
    level: number;
  }

  /**
   * @description 单期挑战数据
   * @interface Combat
   * @since Beta v0.6.3
   * @property {Detail} detail 挑战详情
   * @property {Stat} stat 挑战状态
   * @property {Schedule} schedule 挑战期数
   * @property {boolean} has_data 是否有数据
   * @property {boolean} has_detail_data 是否有详细数据
   * @return Combat
   */
  interface Combat {
    detail: Detail;
    stat: Stat;
    schedule: Schedule;
    has_data: boolean;
    has_detail_data: boolean;
  }

  /**
   * @description 挑战详情
   * @interface Detail
   * @since Beta v0.6.3
   * @property {Array<RoundData>} rounds_data 轮次数据
   * @property {Stat} detail_stat 详细状态
   * @property {string} lineup_link 未知链接
   * @property {Array<Avatar>} backup_avatars 后备角色
   * @property {FightStatisic} fight_statisic buff加成
   * @return Detail
   */
  interface Detail {
    rounds_data: Array<RoundData>;
    detail_stat: Stat;
    lineup_link: string;
    backup_avatars: Array<Avatar>;
    fight_statisic: FightStatisic;
  }

  /**
   * @description 轮次数据
   * @since Beta v0.6.3
   * @interface RoundData
   * @property {Array<Avatar>} avatars 角色
   * @property {Array<Card>} choice_cards 选中卡片
   * @property {Array<Buff>} buffs 获得 助益
   * @property {boolean} is_get_medal 是否获得星章
   * @property {number} round_id 轮次ID
   * @property {string} finish_time 完成时间（秒级时间戳）
   * @property {DateTime} finish_date_time 完成时间
   * @property {Array<Enemy>} enemies 敌人
   * @property {SplendourBuff} splendour_buff 总体Buff
   * @return RoundData
   */
  interface RoundData {
    avatars: Array<Avatar>;
    choice_cards: Array<Card>;
    buffs: Array<Buff>;
    is_get_medal: boolean;
    round_id: number;
    finish_time: string;
    finish_date_time: DateTime;
    enemies: Array<Enemy>;
    splendour_buff: SplendourBuff;
  }

  /**
   * @description 总体buff
   * @interface SplendourBuff
   * @since Beta v0.6.3
   * @property {object} summary 概况
   * @property {number} summary.total_level 总等级
   * @property {string} summary.desc 描述
   * @property {Array<Buff>} buffs 助益
   * @return SplendourBuff
   */
  interface SplendourBuff {
    summary: {
      total_level: number;
      desc: string;
    };
    buffs: Array<Buff>;
  }

  /**
   * @description 战斗数据
   * @interface FightStatisic
   * @since Beta v0.6.3
   * @property {AvatarMini} max_defeat_avatar 击败最多敌人
   * @property {AvatarMini} max_damage_avatar 最高伤害输出
   * @property {AvatarMini} max_take_damage_avatar 最高承受伤害
   * @property {AvatarMini} total_coin_consumed 消耗幻剧之花
   * @property {Array<AvatarMini>} shortest_avatar_list 最快完成演出队伍
   * @property {number} total_use_time 总时间
   * @property {boolean} is_show_battle_stats 是否展示
   * @return FightStatisic
   */
  interface FightStatisic {
    max_defeat_avatar: AvatarMini;
    max_damage_avatar: AvatarMini;
    max_take_damage_avatar: AvatarMini;
    total_coin_consumed: AvatarMini;
    shortest_avatar_list: Array<AvatarMini>;
    total_use_time: number;
    is_show_battle_stats: boolean;
  }

  /**
   * @description 期数
   * @interface Schedule
   * @since Beta v0.6.3
   * @property {string} start_time 开始时间（秒级时间戳）
   * @property {string} end_time 结束时间（秒级时间戳）
   * @property {number} schedule_type 类型 // 1-本期。2-上期
   * @property {number} schedule_id ID
   * @property {DateTime} start_date_time 开始时间
   * @property {DateTime} end_date_time 结束时间
   * @return Schedule
   */
  interface Schedule {
    start_time: string;
    end_time: string;
    schedule_type: number;
    schedule_id: number;
    start_date_time: DateTime;
    end_date_time: DateTime;
  }
}
