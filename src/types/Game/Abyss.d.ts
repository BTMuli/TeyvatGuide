/**
 * @file types Game Abyss.d.ts
 * @description 游戏深渊相关类型定义文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

declare namespace TGApp.Game.Abyss {
  /**
   * @description 深渊数据返回类型
   * @interface Response
   * @since Alpha v0.2.0
   * @extends TGApp.BBS.Response.Base
   * @property {FullData} data - 深渊数据
   * @return Response
   */
  export interface Response extends TGApp.BBS.Response.Base {
    data: FullData;
  }

  /**
   * @description 深渊数据类型
   * @interface FullData
   * @since Alpha v0.2.0
   * @property {number} schedule_id - 深渊周期 ID
   * @property {string} start_time - 深渊开始时间，单位：秒
   * @property {string} end_time - 深渊结束时间，单位：秒
   * @property {number} total_battle_times - 总战斗次数
   * @property {number} total_win_times - 总胜利次数
   * @property {string} max_floor - 最深抵达 // 12-3
   * @property {Character[]} reveal_rank - 出站次数 // 最多的 4 个角色
   * @property {Character[]} defeat_rank - 最多击破数
   * @property {Character[]} damage_rank - 最强一击
   * @property {Character[]} take_damage_rank - 承受最多伤害
   * @property {Character[]} normal_skill_rank - 元素战技释放数
   * @property {Character[]} energy_skill_rank - 元素爆发次数
   * @property {Floor[]} floors - 深渊各层数据
   * @property {number} total_star - 总星数
   * @property {boolean} is_unlock - 是否解锁
   * @return FullData
   */
  export interface FullData {
    schedule_id: number;
    start_time: string;
    end_time: string;
    total_battle_times: number;
    total_win_times: number;
    max_floor: string;
    reveal_rank: CharacterData[];
    defeat_rank: CharacterData[];
    damage_rank: CharacterData[];
    take_damage_rank: CharacterData[];
    normal_skill_rank: CharacterData[];
    energy_skill_rank: CharacterData[];
    floors: Floor[];
    total_star: number;
    is_unlock: boolean;
  }

  /**
   * @description 深渊角色数据类型
   * @interface CharacterData
   * @since Alpha v0.2.0
   * @property {number} avatar_id - 角色 ID
   * @property {string} avatar_icon - 角色图标
   * @property {number} value - 值
   * @property {number} rarity - 角色星级
   * @return CharacterData
   */
  export interface CharacterData {
    avatar_id: number;
    avatar_icon: string;
    value: number;
    rarity: number;
  }

  /**
   * @description 深渊层数据类型
   * @interface Floor
   * @since Alpha v0.2.0
   * @property {number} index - 层索引
   * @property {string} icon - 层图标
   * @property {boolean} is_unlock - 是否解锁
   * @property {number} settle_time
   * @property {number} star - 获得星数
   * @property {number} max_star - 最大星数
   * @property {Level[]} levels - 层内关卡数据
   * @return Floor
   */
  export interface Floor {
    index: number;
    icon: string;
    is_unlock: boolean;
    settle_time: number;
    star: number;
    max_star: number;
    levels: Level[];
  }

  /**
   * @description 深渊关卡数据类型
   * @interface Level
   * @since Alpha v0.2.0
   * @property {number} index - 关卡索引
   * @property {number} star - 获得星数
   * @property {number} max_star - 最大星数
   * @property {Battle[]} battles - 关卡内战斗数据
   * @return Level
   */
  export interface Level {
    index: number;
    star: number;
    max_star: number;
    battles: Battle[];
  }

  /**
   * @description 深渊战斗数据类型
   * @interface Battle
   * @since Alpha v0.2.0
   * @property {number} index - 战斗索引 // 1为上半场，2为下半场
   * @property {string} timestamp - 战斗时间戳
   * @property {CharacterInfo[]} avatars - 角色信息
   * @return Battle
   */
  export interface Battle {
    index: number;
    timestamp: string;
    avatars: CharacterInfo[];
  }

  /**
   * @description 深渊角色信息类型
   * @interface CharacterInfo
   * @since Alpha v0.2.0
   * @property {number} id - 角色 ID
   * @property {string} icon - 角色图标
   * @property {number} level - 角色等级
   * @property {number} rarity - 角色星级
   * @return CharacterInfo
   */
  export interface CharacterInfo {
    id: number;
    icon: string;
    level: number;
    rarity: number;
  }
}
