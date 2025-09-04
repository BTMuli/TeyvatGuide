/**
 * @file types/Game/Combat.d.ts
 * @description 幻想真境剧诗类型定义
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Combat {
  /**
   * @description 幻想真境剧诗数据返回类型
   * @interface Response
   * @since Beta v0.6.3
   * @extends TGApp.BBS.Response.BaseWithData
   * @property {FullData} data
   */
  type Response = TGApp.BBS.Response.BaseWithData<FullData>;

  /**
   * @description 返回完整数据类型
   * @interface FullData
   * @since Beta v0.6.3
   * @property {boolean} is_unlock 是否解锁
   * @property {Record<string,string>} links 相关链接
   * @property {Array<Combat>} data 挑战数据
   */
  type FullData = { is_unlock: boolean; links: Record<string, string>; data: Array<Combat> };

  /**
   * @description 角色数据
   * @interface Avatar
   * @since Beta v0.6.3
   * @property {number} avatar_id 角色id
   * @property {number} avatar_type 角色类型 // 0-自己角色，1-试用角色，2-助演角色
   * @property {string} name 角色名称
   * @property {string} element 角色元素
   * @property {string} image 角色图像
   * @property {number} level 角色等级
   * @property {number} rarity 角色稀有度
   */
  type Avatar = {
    avatar_id: number;
    avatar_type: number;
    name: string;
    element: string;
    image: string;
    level: number;
    rarity: number;
  };

  /**
   * @description 简要角色
   * @interface AvatarMini
   * @since Beta v0.6.3
   * @property {number} avatar_id 角色id
   * @property {number} avatar_icon 角色图标
   * @property {string} value 值
   * @property {number} rarity 角色稀有度
   */
  type AvatarMini = { avatar_id: number; avatar_icon: string; value: string; rarity?: number };

  /**
   * @description Buff
   * @interface Buff
   * @since Beta v0.6.3
   * @property {string} name 名称
   * @property {string} icon 图标
   * @property {number} level 等级
   * @property {Array<BuffEffect>} level_effect 不同等级下的助益
   */
  type Buff = { name: string; icon: string; level: number; level_effect: Array<BuffEffect> };

  /**
   * @description Buff助益
   * @interface BuffEffect
   * @since Beta v0.6.3
   * @property {string} icon 图标
   * @property {string} name 名称
   * @property {string} desc 描述
   * @return BuffEffect
   */
  type BuffEffect = { icon: string; name: string; desc: string };

  /**
   * @description 卡片
   * @interface Card
   * @since Beta v0.6.3
   * @property {string} icon 图标
   * @property {string} name 名称
   * @property {string} desc 描述
   * @property {boolean} is_enhanced 是否加强
   * @property {number} id ID
   */
  type Card = { icon: string; name: string; desc: string; is_enhanced: boolean; id: number };

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
   */
  type Stat = {
    difficulty_id: number;
    max_round_id: number;
    heraldry: number;
    get_medal_round_list: Array<0 | 1>;
    medal_num: number;
    coin_num: number;
    avatar_bonus_num: number;
    rent_cnt: number;
  };

  /**
   * @description 敌人
   * @interface Enemy
   * @since Beta v0.6.3
   * @property {string} name 名称
   * @property {string} icon 图标
   * @property {number} level 等级
   */
  type Enemy = { name: string; icon: string; level: number };

  /**
   * @description 单期挑战数据
   * @interface Combat
   * @since Beta v0.6.3
   * @property {Detail} detail 挑战详情
   * @property {Stat} stat 挑战状态
   * @property {Schedule} schedule 挑战期数
   * @property {boolean} has_data 是否有数据
   * @property {boolean} has_detail_data 是否有详细数据
   */
  type Combat = {
    detail: Detail;
    stat: Stat;
    schedule: Schedule;
    has_data: boolean;
    has_detail_data: boolean;
  };

  /**
   * @description 挑战详情
   * @interface Detail
   * @since Beta v0.6.3
   * @property {Array<RoundData>} rounds_data 轮次数据
   * @property {Stat} detail_stat 详细状态
   * @property {string} lineup_link 未知链接
   * @property {Array<Avatar>} backup_avatars 后备角色
   * @property {FightStatisic} fight_statisic buff加成
   */
  type Detail = {
    rounds_data: Array<RoundData>;
    detail_stat: Stat;
    lineup_link: string;
    backup_avatars: Array<Avatar>;
    fight_statisic: FightStatisic;
  };

  /**
   * @description 轮次数据
   * @since Beta v0.8.0
   * @interface RoundData
   * @property {Array<Avatar>} avatars 角色
   * @property {Array<Card>} choice_cards 选中卡片
   * @property {Array<Buff>} buffs 获得 助益
   * @property {boolean} is_get_medal 是否获得星章
   * @property {number} round_id 轮次ID
   * @property {string} finish_time 完成时间（秒级时间戳）
   * @property {TGApp.Game.Base.DateTime} finish_date_time 完成时间
   * @property {Array<Enemy>} enemies 敌人
   * @property {SplendourBuff} splendour_buff 总体Buff
   */
  type RoundData = {
    avatars: Array<Avatar>;
    choice_cards: Array<Card>;
    buffs: Array<Buff>;
    is_get_medal: boolean;
    round_id: number;
    finish_time: string;
    finish_date_time: TGApp.Game.Base.DateTime;
    enemies: Array<Enemy>;
    splendour_buff: SplendourBuff;
  };

  /**
   * @description 总体buff
   * @interface SplendourBuff
   * @since Beta v0.8.0
   * @property {SplendourBuffSummary} summary 概况
   * @property {Array<Buff>} buffs 助益
   */
  type SplendourBuff = { summary: SplendourBuffSummary; buffs: Array<Buff> };

  /**
   * @description 总体buff概况
   * @interface SplendourBuffSummary
   * @since Beta v0.8.0
   * @property {number} total_level 总等级
   * @property {string} desc 描述
   */
  type SplendourBuffSummary = { total_level: number; desc: string };

  /**
   * @description 战斗数据
   * @interface FightStatisic
   * @since Beta v0.6.5
   * @property {AvatarMini} max_defeat_avatar 击败最多敌人
   * @property {AvatarMini} max_damage_avatar 最高伤害输出
   * @property {AvatarMini} max_take_damage_avatar 最高承受伤害
   * @property {AvatarMini} total_coin_consumed 消耗幻剧之花
   * @property {Array<AvatarMini>} shortest_avatar_list 最快完成演出队伍
   * @property {number} total_use_time 总时间
   * @property {boolean} is_show_battle_stats 是否展示
   */
  type FightStatisic = {
    max_defeat_avatar: AvatarMini | null;
    max_damage_avatar: AvatarMini | null;
    max_take_damage_avatar: AvatarMini | null;
    total_coin_consumed: AvatarMini | null;
    shortest_avatar_list: Array<AvatarMini>;
    total_use_time: number;
    is_show_battle_stats: boolean;
  };

  /**
   * @description 期数
   * @interface Schedule
   * @since Beta v0.8.0
   * @property {string} start_time 开始时间（秒级时间戳）
   * @property {string} end_time 结束时间（秒级时间戳）
   * @property {number} schedule_type 类型 // 1-本期。2-上期
   * @property {number} schedule_id ID
   * @property {TGApp.Game.Base.DateTime} start_date_time 开始时间
   * @property {TGApp.Game.Base.DateTime} end_date_time 结束时间
   */
  type Schedule = {
    start_time: string;
    end_time: string;
    schedule_type: number;
    schedule_id: number;
    start_date_time: TGApp.Game.Base.DateTime;
    end_date_time: TGApp.Game.Base.DateTime;
  };
}
