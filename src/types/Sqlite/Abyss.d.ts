/**
 * 深境螺旋数据库
 * @since Beta v0.9.0
 */

declare namespace TGApp.Sqlite.Abyss {
  /**
   * 深境螺旋表
   * @since Beta v0.6.1
   */
  type TableRaw = {
    /** 用户UID */
    uid: string;
    /** 深渊ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 总战斗次数 */
    totalBattleTimes: number;
    /** 总胜利次数 */
    totalWinTimes: number;
    /** 最深抵达 */
    maxFloor: string;
    /** 总星数 */
    totalStar: number;
    /** 是否解锁
     * @remarks 0-未解锁，1-已解锁
     */
    isUnlock: 0 | 1;
    /**
     * 出战次数
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    revealRank: string;
    /**
     * 最多击败数
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    defeatRank: string;
    /**
     * 最强一击
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    damageRank: string;
    /**
     * 最多承伤
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    takeDamageRank: string;
    /**
     * 元素战技
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    normalSkillRank: string;
    /**
     * 元素爆发
     * @remarks 序列化，反序列化后是 Array<Character>
     */
    energySkillRank: string;
    /**
     * 楼层数据
     * @remarks 序列化，反序列化后是 Array<Floor>
     */
    floors: string;
    /** 跳过楼层 */
    skippedFloor: string | null;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 深境螺旋表-解析
   * @since Beta v0.6.1
   */
  type TableData = {
    /** 用户UID */
    uid: string;
    /** 深渊ID */
    id: number;
    /** 开始时间 */
    startTime: string;
    /** 结束时间 */
    endTime: string;
    /** 总战斗次数 */
    totalBattleTimes: number;
    /** 总胜利次数 */
    totalWinTimes: number;
    /** 最深抵达 */
    maxFloor: string;
    /** 总星数 */
    totalStar: number;
    /** 是否解锁
     * @remarks 0-未解锁，1-已解锁
     */
    isUnlock: 0 | 1;
    /** 出战次数 */
    revealRank: Array<CharacterData>;
    /** 最多击败数 */
    defeatRank: Array<CharacterData>;
    /** 最强一击 */
    damageRank: Array<CharacterData>;
    /** 最多承伤 */
    takeDamageRank: Array<CharacterData>;
    /** 元素战技 */
    normalSkillRank: Array<CharacterData>;
    /** 元素爆发 */
    energySkillRank: Array<CharacterData>;
    /** 楼层数据 */
    floors: Array<Floor>;
    /** 跳过楼层 */
    skippedFloor: string | null;
    /** 更新时间 */
    updated: string;
  };

  /**
   * 角色数据
   * @since Alpha v0.2.0
   */
  type CharacterData = {
    /** 角色ID */
    id: number;
    /** 值 */
    value: number;
    /** 星级 */
    star: number;
  };

  /**
   * 楼层数据
   * @since Beta v0.9.0
   */
  type Floor = {
    /** 楼层 */
    id: number;
    /**
     * 是否解锁
     * @remarks 0-未解锁，1-已解锁
     */
    isUnlock: 0 | 1;
    /** 获得星数 */
    winStar: number;
    /** 最大星数 */
    maxStar: number;
    /** 关卡数据 */
    levels: Array<Level>;
    /**
     * 地脉异常
     * @remarks v0.9.0新增，之前数据缺失
     */
    buff?: Array<string>;
  };

  /**
   * 关卡数据
   * @since Beta v0.3.9
   */
  type Level = {
    /** 关卡ID */
    id: number;
    /** 获得星数 */
    winStar: number;
    /** 最大星数 */
    maxStar: number;
    /** 上半场数据 */
    upBattle?: Battle;
    /** 下半场数据 */
    downBattle?: Battle;
  };

  /**
   * 战斗数据
   * @since Beta v0.9.0
   * @property {string} time - 时间
   * @property {CharacterInfo[]} characters - 角色数据
   * @return Battle
   */
  interface Battle {
    /** 结束时间 */
    time: string;
    /** 上场角色 */
    characters: Array<CharacterInfo>;
    /**
     * 怪物数据
     * @remarks v0.9.0 版本新增，之前数据缺失
     */
    monsters?: Array<MonsterInfo>;
  }

  /**
   * 角色信息
   * @since Alpha v0.2.0
   */
  type CharacterInfo = {
    /** 角色ID */
    id: number;
    /** 角色等级 */
    level: number;
    /** 角色星级 */
    star: number;
  };

  /**
   * 怪物信息
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
}
