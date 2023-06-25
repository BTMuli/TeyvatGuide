/**
 * @file plugins Sqlite utils transCharacter.ts
 * @description Sqlite 数据转换
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

import { timeToSecond } from "./transTime";

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Abyss.CharacterData[]} data 深渊数据
 * @returns {string} 转换后的深渊数据
 */
export function transCharacterData(data: TGApp.Game.Abyss.CharacterData[]): string {
  const res = data.map((item) => {
    return {
      id: item.avatar_id,
      value: item.value,
      star: item.rarity,
    };
  }) as TGApp.Sqlite.Abyss.Character[];
  return JSON.stringify(res);
}

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Abyss.Floor} data 深渊数据
 * @returns {string} 转换后的深渊数据
 */
export function transFloorData(data: TGApp.Game.Abyss.Floor[]): string {
  const floor = data.map((item) => {
    return {
      id: item.index,
      winStar: item.star,
      maxStar: item.max_star,
      isUnlock: item.is_unlock ? 1 : 0,
      levels: item.levels.map((level) => {
        return {
          id: level.index,
          winStar: level.star,
          maxStar: level.max_star,
          upBattle: transBattleData(
            level.battles.find((l) => l.index === 1) as TGApp.Game.Abyss.Battle,
          ),
          downBattle: transBattleData(
            level.battles.find((l) => l.index === 2) as TGApp.Game.Abyss.Battle,
          ),
        };
      }),
    };
  }) as TGApp.Sqlite.Abyss.Floor[];
  return JSON.stringify(floor);
}

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Abyss.Battle} data 深渊数据
 * @returns {TGApp.Sqlite.Abyss.Battle} 转换后的深渊数据
 */
function transBattleData(data: TGApp.Game.Abyss.Battle): TGApp.Sqlite.Abyss.Battle {
  return {
    time: timeToSecond(data.timestamp),
    characters: data.avatars.map((item) => {
      return {
        id: item.id,
        level: item.level,
        star: item.rarity,
      };
    }),
  };
}
