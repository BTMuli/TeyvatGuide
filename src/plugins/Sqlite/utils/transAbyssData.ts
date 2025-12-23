/**
 * 深境螺旋数据转换
 * @since Beta v0.9.0
 */

import { timestampToDate } from "@utils/toolFunc.js";

/**
 * 转换角色数据
 * @since Alpha v0.2.0
 * @param data - 接口获取角色数据
 * @returns 转换后的角色数据
 */
export function transCharacterData(data: Array<TGApp.Game.Abyss.CharacterData>): string {
  const res: Array<TGApp.Sqlite.Abyss.CharacterData> = data.map((item) => ({
    id: item.avatar_id,
    value: item.value,
    star: item.rarity,
  }));
  return JSON.stringify(res);
}

/**
 * 转换楼层数据
 * @since Beta v0.9.0
 * @param data - 接口获取楼层数据
 * @returns 转换后的楼层数据
 */
export function transFloorData(data: Array<TGApp.Game.Abyss.Floor>): string {
  const floor: Array<TGApp.Sqlite.Abyss.Floor> = data.map((item) => ({
    id: item.index,
    winStar: item.star,
    maxStar: item.max_star,
    isUnlock: item.is_unlock ? 1 : 0,
    levels: item.levels.map(transLevelData),
    buff: item.ley_line_disorder,
  }));
  return JSON.stringify(floor);
}

/**
 * 转换关卡数据
 * @since Beta v0.9.0
 * @param data - 接口获取关卡数据
 * @returns 转换后的关卡数据
 */
function transLevelData(data: TGApp.Game.Abyss.Level): TGApp.Sqlite.Abyss.Level {
  const res: TGApp.Sqlite.Abyss.Level = {
    id: data.index,
    winStar: data.star,
    maxStar: data.max_star,
  };
  for (const battle of data.battles) {
    if (battle.index === 1) res.upBattle = transBattleData(battle, data.top_half_floor_monster);
    else res.downBattle = transBattleData(battle, data.bottom_half_floor_monster);
  }
  return res;
}

/**
 * 转换战斗数据
 * @since Beta v0.9.0
 * @param data - 接口获取战斗数据
 * @param monsters - 对应战斗怪物数据
 * @returns 转换后的深渊数据
 */
function transBattleData(
  data: TGApp.Game.Abyss.Battle,
  monsters: Array<TGApp.Sqlite.Abyss.MonsterInfo>,
): TGApp.Sqlite.Abyss.Battle {
  return {
    time: timestampToDate(Number(data.timestamp) * 1000),
    characters: data.avatars.map((item) => ({
      id: item.id,
      level: item.level,
      star: item.rarity,
    })),
    monsters: monsters,
  };
}
