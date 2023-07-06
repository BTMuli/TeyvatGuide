/**
 * @file plugins Hutao utils transLocal.ts
 * @description 将本地数据转为上传用的数据
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.1
 */

/**
 * @description 将本地数据转为上传用的数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.SingleTable} data 本地数据
 * @returns {TGApp.Plugins.Hutao.Abyss.RecordUpload} 上传用的数据
 */
export function transLocal(
  data: TGApp.Sqlite.Abyss.SingleTable,
): TGApp.Plugins.Hutao.Abyss.RecordUpload {
  return {
    Uid: data.uid,
    Identity: "Tauri.Genshin",
    SpiralAbyss: transAbyss(data),
    Avatars: [],
    ReservedUserName: "",
  };
}

/**
 * @description 转换深渊数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.SingleTable} data 本地数据
 * @returns {TGApp.Plugins.Hutao.Abyss.RecordData} 上传用的数据
 */
function transAbyss(data: TGApp.Sqlite.Abyss.SingleTable): TGApp.Plugins.Hutao.Abyss.RecordData {
  const damage: TGApp.Sqlite.Abyss.Character = JSON.parse(data.damageRank)[0];
  const takeDamage: TGApp.Sqlite.Abyss.Character = JSON.parse(data.takeDamageRank)[0];
  return {
    ScheduleId: data.id,
    TotalBattleTimes: data.totalBattleTimes,
    TotalWinTimes: data.totalWinTimes,
    Damage: {
      AvatarId: damage.id,
      Value: damage.value,
    },
    TakeDamage: {
      AvatarId: takeDamage.id,
      Value: takeDamage.value,
    },
    Floors: JSON.parse(data.floors).map((floor: TGApp.Sqlite.Abyss.Floor) => transFloor(floor)),
  };
}

/**
 * @description 转换层数数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.Floor} data 本地数据
 * @returns {TGApp.Plugins.Hutao.Abyss.Floor} 上传用的数据
 */
function transFloor(data: TGApp.Sqlite.Abyss.Floor): TGApp.Plugins.Hutao.Abyss.Floor {
  return {
    Index: data.id,
    Star: data.winStar,
    Levels: data.levels.map((level) => transLevel(level)),
  };
}

/**
 * @description 转换层-关卡数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.Level} data 本地数据
 * @returns {TGApp.Plugins.Hutao.Abyss.Level} 上传用的数据
 */
function transLevel(data: TGApp.Sqlite.Abyss.Level): TGApp.Plugins.Hutao.Abyss.Level {
  const battles: Array<{ Index: number; Avatars: number[] }> = [];
  battles.push({
    Index: 1,
    Avatars: data.upBattle.characters.map((character) => character.id),
  });
  battles.push({
    Index: 2,
    Avatars: data.downBattle.characters.map((character) => character.id),
  });
  return {
    Index: data.id,
    Star: data.winStar,
    Battles: battles,
  };
}

/**
 * @description 转换角色数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Character.UserRole[]} avatars 角色数据
 * @returns {TGApp.Plugins.Hutao.Abyss.Avatar[]} 上传用的数据
 */
export function transAvatars(
  avatars: TGApp.Sqlite.Character.UserRole[],
): TGApp.Plugins.Hutao.Abyss.Avatar[] {
  return avatars.map((avatar) => {
    const weapon: TGApp.Sqlite.Character.RoleWeapon = JSON.parse(avatar.weapon);
    let relics: number[];
    if (avatar.reliquary === "") {
      relics = [];
    } else {
      const relicSet: TGApp.Sqlite.Character.RoleReliquary[] = JSON.parse(avatar.reliquary);
      relics = relicSet.map((relic) => relic.set.id);
    }
    return {
      AvatarId: avatar.cid,
      WeaponId: weapon.id,
      ReliquarySetIds: relics,
      ActivedConstellationNumber: avatar.activeConstellation,
    };
  });
}
