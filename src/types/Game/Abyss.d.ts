/**
 * 深境螺旋相关类型
 * @since Beta v0.9.0
 */

declare namespace TGApp.Game.Abyss {
  /**
   * 深渊数据返回响应
   * @since Alpha v0.2.0
   */
  type Response = TGApp.BBS.Response.BaseWithData<FullData>;

  /**
   * 深渊数据
   * @since Beta v0.6.1
   */
  type FullData = {
    /** 周期ID */
    schedule_id: number;
    /** 开始时间戳（秒） */
    start_time: string;
    /** 结束时间戳（秒） */
    end_time: string;
    /** 战斗次数 */
    total_battle_times: number;
    /** 胜利次数 */
    total_win_times: number;
    /** 最大楼层 */
    max_floor: string;
    /** 出战次数 */
    reveal_rank: Array<CharacterData>;
    /** 最多击败 */
    defeat_rank: Array<CharacterData>;
    /** 最强一击 */
    damage_rank: Array<CharacterData>;
    /** 最多承伤 */
    take_damage_rank: Array<CharacterData>;
    /** 元素战技释放数 */
    normal_skill_rank: Array<CharacterData>;
    /** 元素爆发释放数 */
    energy_skill_rank: Array<CharacterData>;
    /** 楼层数据 */
    floors: Array<Floor>;
    /** 总星数 */
    total_star: number;
    /** 是否解锁 */
    is_unlock: boolean;
    /** 是否有跳过楼层 */
    is_just_skipped_floor: boolean;
    /** 跳过楼层 */
    skipped_floor: string;
  };

  /**
   * 角色数据
   * @since Alpha v0.2.0
   */
  type CharacterData = {
    /** 角色ID */
    avatar_id: number;
    /** 角色图标 */
    avatar_icon: string;
    /** 值 */
    value: number;
    /** 角色星级 */
    rarity: number;
  };

  /**
   * 楼层数据
   * @since Beta v0.9.0
   */
  type Floor = {
    /** 楼层 */
    index: number;
    /**
     * 图标
     * @remarks 一般为空字符串
     */
    icon: string;
    /** 是否解锁 */
    is_unlock: boolean;
    /** 结束时间戳（秒级）
     * @remarks 一般为 0
     */
    settle_time: string;
    /** 获得星数 */
    star: number;
    /** 最大星数 */
    max_star: number;
    /** 关卡数据 */
    levels: Array<Level>;
    /** 结束时间
     * @remarks 一般为 null
     */
    settle_date_time: TGApp.Game.Base.DateTime | null;
    /** 关卡Buff */
    ley_line_disorder: Array<string>;
  };

  /**
   * 关卡数据
   * @since Beta v0.9.0
   */
  type Level = {
    /** 关卡索引  */
    index: number;
    /** 获得星数 */
    star: number;
    /** 最大星数 */
    max_star: number;
    /** 战斗数据 */
    battles: Array<Battle>;
    /** 上半场怪物数据 */
    top_half_floor_monster: Array<MonsterInfo>;
    /** 下半场怪物数据 */
    bottom_half_floor_monster: Array<MonsterInfo>;
  };

  /**
   * 怪物数据
   * @since Beta v0.9.0
   */
  type MonsterInfo = {
    /** 名称 */
    name: string;
    /** 图标 */
    icon: string;
    /** 等级 */
    level: number;
  };

  /**
   * 战斗数据
   * @since Alpha v0.2.0
   */
  type Battle = {
    /**
     * 战斗索引
     * @remarks 1-上半场，2-下半场
     */
    index: number;
    /** 结束时间戳 */
    timestamp: string;
    /** 上场角色 */
    avatars: Array<CharacterInfo>;
    /** 结束时间 */
    settle_date_time: TGApp.Game.Base.DateTime;
  };

  /**
   * 角色信息
   * @since Alpha v0.2.0
   */
  type CharacterInfo = {
    /** 角色ID */
    id: number;
    /** 角色图标 */
    icon: string;
    /** 角色等级 */
    level: number;
    /** 角色星级 */
    rarity: number;
  };
}
