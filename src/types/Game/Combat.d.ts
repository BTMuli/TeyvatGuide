/**
 * 幻想真境剧诗类型定义
 * @since Beta v0.9.6
 */

declare namespace TGApp.Game.Combat {
  /**
   * 幻想真境剧诗数据返回响应
   * @since Beta v0.9.6
   */
  type CombatResp = TGApp.BBS.Response.BaseWithData<CombatRes>;

  /**
   * 绘想游迹数据返回响应
   * @since Beta v0.9.6
   */
  type CharResp = TGApp.BBS.Response.BaseWithData<CharRes>;

  /**
   * 幻想真境剧诗数据返回
   * @since Beta v0.9.6
   */
  type CombatRes = {
    /** 是否解锁 */
    is_unlock: boolean;
    /** 相关链接 */
    links: Record<string, string>;
    /** 挑战数据 */
    data: Array<Combat>;
    /** 月谕圣牌 */
    tarot_card_state: TarotState;
  };

  /**
   * 绘想游迹数据返回
   * @since Beta v0.9.6
   */
  type CharRes = {
    /** 绘想游迹列表 */
    list: Array<CharMaster>;
    /** 是否解锁 */
    is_unlock: boolean;
  };

  /**
   * 角色数据
   * @since Beta v0.6.3
   */
  type Avatar = {
    /** 角色ID */
    avatar_id: number;
    /**
     * 角色类型
     * @TODO 枚举类
     * @remarks
     * - 0: 自己角色
     * - 1: 试用角色
     * - 2: 助演角色
     */
    avatar_type: number;
    /** 角色名称 */
    name: string;
    /** 角色元素 */
    element: string;
    /** 角色图像 */
    image: string;
    /** 角色等级 */
    level: number;
    /** 角色星级 */
    rarity: number;
  };

  /**
   * 角色简要信息
   * @since Beta v0.6.3
   */
  type AvatarMini = {
    /** 角色 ID */
    avatar_id: number;
    /** 角色图标 */
    avatar_icon: string;
    /** 值 */
    value: string;
    /** 角色稀有度 */
    rarity?: number;
  };

  /**
   * Buff
   * @since Beta v0.6.3
   */
  type Buff = {
    /** 名称 */
    name: string;
    /** 图标 */
    icon: string;
    /** 等级 */
    level: number;
    /** 增益 */
    level_effect: Array<BuffEffect>;
  };

  /**
   * Buff增益
   * @since Beta v0.6.3
   */
  type BuffEffect = {
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /**
     * 描述
     * @remarks html 文本
     */
    desc: string;
  };

  /**
   * 卡片
   * @since Beta v0.6.3
   */
  type Card = {
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /** 描述 */
    desc: string;
    /** 是否加强 */
    is_enhanced: boolean;
    /** ID */
    id: number;
  };

  /**
   * 状态
   * @since Beta v0.8.3
   */
  type Stat = {
    /** 难度等级 */
    difficulty_id: number;
    /** 最大层数 */
    max_round_id: number;
    /** 纹章数 */
    heraldry: number;
    /** 星章获取情况 */
    get_medal_round_list: Array<0 | 1>;
    /** 星章获取数 */
    medal_num: number;
    /** 硬币数 */
    coin_num: number;
    /** 角色声援数 */
    avatar_bonus_num: number;
    /** 出借次数 */
    rent_cnt: number;
    /** 月谕圣牌完成数 */
    tarot_finished_cnt: number;
  };

  /**
   * 敌人
   * @since Beta v0.6.3
   */
  type Enemy = {
    /** 名称 */
    name: string;
    /** 图标 */
    icon: string;
    /** 等级 */
    level: number;
  };

  /**
   * 单期挑战数据
   * @since Beta v0.6.3
   */
  type Combat = {
    /** 挑战详情 */
    detail: Detail;
    /** 挑战概况 */
    stat: Stat;
    /** 挑战排期 */
    schedule: Schedule;
    /** 是否有数据 */
    has_data: boolean;
    /** 是否有详细数据 */
    has_detail_data: boolean;
  };

  /**
   * 挑战详情
   * @since Beta v0.6.3
   */
  type Detail = {
    /** 轮次数据 */
    rounds_data: Array<RoundData>;
    /** 详细状态 */
    detail_stat: Stat;
    /** 未知链接 */
    lineup_link: string;
    /** 后备角色 */
    backup_avatars: Array<Avatar>;
    /** buff加成 */
    fight_statisic: FightStatisic;
  };

  /**
   * 轮次数据
   * @since Beta v0.8.3
   */
  type RoundData = {
    /** 角色 */
    avatars: Array<Avatar>;
    /** 选中卡片 */
    choice_cards: Array<Card>;
    /** 获得助益 */
    buffs: Array<Buff>;
    /** 是否获得星章 */
    is_get_medal: boolean;
    /** 轮次ID */
    round_id: number;
    /** 完成时间（秒级时间戳） */
    finish_time: string;
    /** 完成时间 */
    finish_date_time: TGApp.Game.Base.DateTime;
    /** 敌人 */
    enemies: Array<Enemy>;
    /** 总体Buff */
    splendour_buff: SplendourBuff;
    /** 是否为塔罗牌 */
    is_tarot: boolean;
    /** 塔罗牌序号 */
    tarot_serial_no: number;
  };

  /**
   * 总体buff
   * @since Beta v0.8.0
   */
  type SplendourBuff = {
    /** 概况 */
    summary: SplendourBuffSummary;
    /** 助益 */
    buffs: Array<Buff>;
  };

  /**
   * 总体buff概况
   * @since Beta v0.8.0
   */
  type SplendourBuffSummary = {
    /** 总等级 */
    total_level: number;
    /** 描述 */
    desc: string;
  };

  /**
   * 战斗数据
   * @since Beta v0.6.5
   */
  type FightStatisic = {
    /** 击败最多敌人 */
    max_defeat_avatar: AvatarMini | null;
    /** 最高伤害输出 */
    max_damage_avatar: AvatarMini | null;
    /** 最高承受伤害 */
    max_take_damage_avatar: AvatarMini | null;
    /** 消耗幻剧之花 */
    total_coin_consumed: AvatarMini | null;
    /** 最快完成演出队伍 */
    shortest_avatar_list: Array<AvatarMini>;
    /** 总时间 */
    total_use_time: number;
    /** 是否展示 */
    is_show_battle_stats: boolean;
  };

  /**
   * 期数
   * @since Beta v0.8.0
   */
  type Schedule = {
    /** 开始时间（秒级时间戳） */
    start_time: string;
    /** 结束时间（秒级时间戳） */
    end_time: string;
    /** 类型，1-本期，2-上期 */
    schedule_type: number;
    /** ID */
    schedule_id: number;
    /** 开始时间 */
    start_date_time: TGApp.Game.Base.DateTime;
    /** 结束时间 */
    end_date_time: TGApp.Game.Base.DateTime;
  };

  /**
   * 塔罗牌状态
   * @since Beta v0.8.3
   */
  type TarotState = {
    /** 总数 */
    total_num: number;
    /** 当前数 */
    curr_num: number;
    /** 卡片列表 */
    list: Array<TarotCard>;
  };

  /**
   * 塔罗牌
   * @since Beta v0.9.6
   */
  type TarotCard = {
    /** 图标 */
    icon: string;
    /** 名称 */
    name: string;
    /** 是否解锁 */
    is_unlock: boolean;
    /** 解锁数 */
    unlock_num: number;
  };

  /**
   * 绘想游迹状态类型
   * @since Beta v0.9.6
   */
  const CharMasterStat = <const>{
    /** 未解锁 */
    LOCK: 1,
    /** 未挑战 */
    UNFINISH: 2,
    /** 已拥有 */
    DONE: 3,
  };

  /**
   * 绘想游迹状态枚举
   * @since Beta v0.9.6
   */
  type CharMasterStatEnum = (typeof CharMasterStat)[keyof typeof CharMasterStat];

  /**
   * 绘想游迹数据
   * @since Beta v0.9.6
   */
  type CharMaster = {
    /** 角色 ID */
    avatar_id: number;
    /** 角色名称 */
    name: string;
    /** 角色图标 */
    icon: string;
    /**
     * 状态
     * @example
     * 1 - 未解锁
     * 2 - 未挑战
     * 3 - 已拥有
     */
    status: CharMasterStatEnum;
    /** 是否有红点 */
    has_red_dot: boolean;
    /** 等级ID */
    level_id: number;
  };
}
