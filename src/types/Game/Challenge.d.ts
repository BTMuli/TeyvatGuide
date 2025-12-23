/**
 * 幽境危战
 * @since Beta v0.8.0
 */

declare namespace TGApp.Game.Challenge {
  /**
   * 赋光之人列表返回响应
   * @since Beta v0.8.0
   */
  type PopularityResp = TGApp.BBS.Response.BaseWithData<PopularityRes>;

  /**
   * 赋光之人列表数据
   * @since Beta v0.8.0
   */
  type PopularityRes = {
    /** 赋光之人列表 */
    avatar_list: Array<PopularityItem>;
  };

  /**
   * 赋光之人
   * @since Beta v0.8.0
   */
  type PopularityItem = {
    /** 角色ID */
    avatar_id: number;
    /** 角色名称 */
    name: string;
    /**
     * 角色元素
     * @remarks Anemo,Cryo,Electro等
     */
    element: string;
    /** 角色图标 */
    image: string;
    /** 角色星级 */
    rarity: number;
  };

  /**
   * 挑战数据返回响应（详细）
   * @since Beta v0.8.0
   */
  type ChallengeResp = TGApp.BBS.Response.BaseWithData<ChallengeRes>;

  /**
   * 挑战数据（详细）
   * @since Beta v0.8.0
   */
  type ChallengeRes = {
    /** 挑战数据 */
    data: Array<ChallengeItem>;
    /** 是否解锁 */
    is_unlock: boolean;
    /** 外部链接 */
    link: ChallengeLink;
  };

  /**
   * 外部链接
   * @since Beta v0.8.0
   */
  type ChallengeLink = {
    /** 未知URL */
    lineup_link: string;
    /** 活动攻略链接 */
    play_link: string;
  };

  /**
   * 挑战数据
   * @since Beta v0.8.0
   */
  type ChallengeItem = {
    /** 周期数据 */
    schedule: ChallengeSchedule;
    /** 单人挑战 */
    single: Challenge;
    /** 联机挑战 */
    mp: Challenge;
    /** 赋光信息 */
    blings: ChallengeBlings;
  };

  /**
   * 挑战周期信息
   * @since Beta v0.8.0
   */
  type ChallengeSchedule = {
    /** 周期ID */
    schedule_id: string;
    /** 开始时间戳（秒级） */
    start_time: string;
    /** 结束时间戳（秒级） */
    end_time: string;
    /** 开始时间 */
    start_date_time: TGApp.Game.Base.DateTime;
    /** 结束时间 */
    end_date_time: TGApp.Game.Base.DateTime;
    /** 是否有效 */
    is_valid: boolean;
    /** 名称 */
    name: string;
  };

  /**
   * 挑战数据
   * @since Beta v0.8.0
   */
  type Challenge = {
    /** 最佳数据 */
    best: ChallengeBest;
    /** 挑战列表 */
    challenge: Array<ChallengeData>;
    /** 是否有数据 */
    has_data: boolean;
  };

  /**
   * 最佳数据
   * @since Beta v0.8.0
   */
  type ChallengeBest = {
    /** 难度 */
    difficulty: number;
    /** 耗时（秒） */
    second: number;
    /** 图标 */
    icon: string;
  };

  /**
   * 挑战数据
   * @since Beta v0.8.0
   */
  type ChallengeData = {
    /** 怪物名称 */
    name: string;
    /** 耗时（秒） */
    second: number;
    /** 上场队伍 */
    teams: Array<ChallengeTeam>;
    /** 最佳角色 */
    best_avatar: Array<ChallengeAvatar>;
    /** 怪物信息 */
    monster: ChallengeMonster;
  };

  /**
   * 队伍数据
   * @since Beta v0.8.0
   */
  type ChallengeTeam = {
    /** 角色ID */
    avatar_id: number;
    /** 角色名称 */
    name: string;
    /**
     * 角色元素
     * @remarks Cryo 等
     */
    element: string;
    /** 角色图标 */
    image: string;
    /** 角色等级 */
    level: number;
    /** 角色星级 */
    rarity: number;
    /** 角色命座 */
    rank: number;
  };

  /**
   * 最佳角色数据
   * @since Beta v0.8.0
   */
  type ChallengeAvatar = {
    /** 角色ID */
    avatar_id: number;
    /** 侧边图标 */
    side_icon: string;
    /**输出 */
    dps: string;
    /**
     * 数据类型
     * @remarks 1-最强一击，2-最高总伤
     */
    type: number;
  };

  /**
   * 怪物数据
   * @since Beta v0.8.0
   */
  type ChallengeMonster = {
    /** 名称 */
    name: string;
    /** 等级 */
    level: number;
    /** 图标 */
    icon: string;
    /** 描述 */
    desc: Array<string>;
    /**
     * 标签
     * @remarks 一般为空
     */
    tags: Array<MonsterTag>;
    /** 怪物ID */
    monster_id: number;
  };

  /**
   * 怪物标签
   * @since Beta v0.8.0
   */
  type MonsterTag = {
    /** 标签类型 */
    type: string;
    /** 标签描述 */
    desc: string;
  };

  /**
   * 赋予辉光数据
   * @since Beta v0.8.0
   */
  type ChallengeBlings = Array<ChallengeBling>;

  /**
   * 赋予辉光数据项
   * @since Beta v0.8.0
   */
  type ChallengeBling = {
    /** 角色ID */
    avatar_id: number;
    /** 角色名称 */
    name: string;
    /**
     * 角色元素
     * @remarks Cyro 等
     */
    element: string;
    /** 角色图标 */
    image: string;
    /** 侧边栏图标 */
    side_icon: string;
    /** 星级 */
    rarity: number;
    /** 是否上榜 */
    is_plus: boolean;
  };
}
