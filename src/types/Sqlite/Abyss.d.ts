/**
 * @file types Sqlite Abyss.d.ts
 * @description 数据库深境螺旋相关类型定义文件
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Sqlite.Abyss {
  /**
   * @description 数据库-深境螺旋表
   * @since Alpha v0.2.0
   * @interface SingleTable
   * @property {string} uid - 用户 UID
   * @property {number} id - 深境螺旋 ID
   * @property {string} startTime - 开始时间
   * @property {string} endTime - 结束时间
   * @property {number} totalBattleTimes - 总战斗次数
   * @property {number} totalWinTimes - 总胜利次数
   * @property {string} maxFloor - 最深抵达
   * @property {number} totalStar - 总星数
   * @property {boolean} isUnlock - 是否解锁
   * @description 后面的几个数据在数据库中是存储的 JSON 字符串，需要在使用时进行 JSON.parse
   * @property {Character[]} revealRank - 出战次数
   * @property {Character[]} defeatRank - 最多击破数
   * @property {Character[]} damageRank - 最强一击
   * @property {Character[]} takeDamageRank - 承受最多伤害
   * @property {Character[]} normalSkillRank - 元素战技释放数
   * @property {Character[]} energySkillRank - 元素爆发次数
   * @property {Floor[]} floors - 深境螺旋各层数据
   * @property {string} updated - 更新时间
   * @return SingleTable
   */
  export interface SingleTable {
    uid: string;
    id: number;
    startTime: string;
    endTime: string;
    totalBattleTimes: number;
    totalWinTimes: number;
    maxFloor: string;
    totalStar: number;
    isUnlock: 0 | 1;
    revealRank: string; // Character[]
    defeatRank: string; // Character[]
    damageRank: string; // Character[]
    takeDamageRank: string; // Character[]
    normalSkillRank: string; // Character[]
    energySkillRank: string; // Character[]
    floors: string; // Floor[]
    updated: string;
  }

  /**
   * @description 数据库-深境螺旋表-角色数据
   * @since Alpha v0.2.0
   * @interface Character
   * @property {number} id - 角色 ID
   * @property {number} value - 值
   * @property {number} star - 星级
   * @return Character
   */
  export interface Character {
    id: number;
    value: number;
    star: number;
  }

  /**
   * @description 数据库-深境螺旋表-层数据
   * @since Alpha v0.2.0
   * @interface Floor
   * @property {number} id - 层 ID
   * @property {number} winStar - 获得星数
   * @property {number} maxStar - 最大星级
   * @property {boolean} isUnlock - 是否解锁
   * @property {Level[]} levels - 关卡数据
   * @return Floor
   */
  export interface Floor {
    id: number;
    winStar: number;
    maxStar: number;
    isUnlock: 0 | 1;
    levels: Level[];
  }

  /**
   * @description 数据库-深境螺旋表-关卡数据
   * @since Alpha v0.2.0
   * @interface Level
   * @property {number} id - 关卡 ID
   * @property {number} winStar - 获得星数
   * @property {number} maxStar - 最大星级
   * @property {Battle} upBattle - 上半场数据
   * @property {Battle} downBattle - 下半场数据
   * @return Level
   */
  export interface Level {
    id: number;
    winStar: number;
    maxStar: number;
    upBattle: Battle;
    downBattle: Battle;
  }

  /**
   * @description 数据库-深境螺旋表-战斗数据
   * @since Alpha v0.2.0
   * @interface Battle
   * @property {string} time - 时间
   * @property {CharacterInfo[]} characters - 角色数据
   * @return Battle
   */
  export interface Battle {
    time: string;
    characters: CharacterInfo[];
  }

  /**
   * @description 数据库-深境螺旋表-角色数据
   * @since Alpha v0.2.0
   * @interface CharacterInfo
   * @property {number} id - 角色 ID
   * @property {number} star - 星级
   * @property {number} level - 等级
   * @return CharacterInfo
   */
  export interface CharacterInfo {
    id: number;
    level: number;
    star: number;
  }
}
