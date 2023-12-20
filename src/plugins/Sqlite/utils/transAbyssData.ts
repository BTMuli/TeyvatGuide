/**
 * @file plugins/Sqlite/utils/transCharacter.ts
 * @description Sqlite 数据转换
 * @since Beta v0.3.9
 */

import { timeToSecond } from "./transTime";

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Abyss.CharacterData[]} data 深渊数据
 * @returns {string} 转换后的深渊数据
 */
export function transCharacterData(data: TGApp.Game.Abyss.CharacterData[]): string {
  const res: TGApp.Sqlite.Abyss.Character[] = data.map((item) => {
    return {
      id: item.avatar_id,
      value: item.value,
      star: item.rarity,
    };
  });
  return JSON.stringify(res);
}

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Beta v0.3.9
 * @param {TGApp.Game.Abyss.Floor} data 深渊数据
 * @returns {string} 转换后的深渊数据
 */
export function transFloorData(data: TGApp.Game.Abyss.Floor[]): string {
  const floor: TGApp.Sqlite.Abyss.Floor[] = data.map((item) => {
    return {
      id: item.index,
      winStar: item.star,
      maxStar: item.max_star,
      isUnlock: item.is_unlock ? 1 : 0,
      levels: item.levels.map((level) => transLevelData(level)),
    };
  });
  return JSON.stringify(floor);
}

/**
 * @description 将通过 api 获取到的深渊数据转换为数据库中的数据
 * @since Beta v0.3.9
 * @param {TGApp.Game.Abyss.Level} data 深渊数据
 * @returns {TGApp.Sqlite.Abyss.Level} 转换后的深渊数据
 */
function transLevelData(data: TGApp.Game.Abyss.Level): TGApp.Sqlite.Abyss.Level {
  const res: TGApp.Sqlite.Abyss.Level = {
    id: data.index,
    winStar: data.star,
    maxStar: data.max_star,
  };
  for (const battle of data.battles) {
    if (battle.index === 1) {
      res.upBattle = transBattleData(battle);
    } else {
      res.downBattle = transBattleData(battle);
    }
  }
  return res;
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
