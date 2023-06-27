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
 * @returns {TGApp.Plugins.Hutao.AbyssRecordUpload} 上传用的数据
 */
export function transLocal(
  data: TGApp.Sqlite.Abyss.SingleTable,
): TGApp.Plugins.Hutao.AbyssRecordUpload {
  return {
    uid: data.uid,
    identity: "Tauri.Genshin",
    spiralAbyss: transAbyss(data),
    avatars: [],
    reservedUserName: "",
  };
}

/**
 * @description 转换深渊数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.SingleTable} data 本地数据
 * @returns {TGApp.Plugins.Hutao.AbyssRecord} 上传用的数据
 */
function transAbyss(data: TGApp.Sqlite.Abyss.SingleTable): TGApp.Plugins.Hutao.AbyssRecord {
  const damage: TGApp.Sqlite.Abyss.Character = JSON.parse(data.damageRank)[0];
  const takeDamage: TGApp.Sqlite.Abyss.Character = JSON.parse(data.takeDamageRank)[0];
  return {
    scheduleId: data.id,
    totalBattleTimes: data.totalBattleTimes,
    totalWinTimes: data.totalWinTimes,
    damage: {
      avatarId: damage.id,
      value: damage.value,
    },
    takeDamage: {
      avatarId: takeDamage.id,
      value: takeDamage.value,
    },
    floors: JSON.parse(data.floors).map((floor: TGApp.Sqlite.Abyss.Floor) => transFloor(floor)),
  };
}

/**
 * @description 转换层数数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.Floor} data 本地数据
 * @returns {TGApp.Plugins.Hutao.AbyssFloor} 上传用的数据
 */
function transFloor(data: TGApp.Sqlite.Abyss.Floor): TGApp.Plugins.Hutao.AbyssFloor {
  return {
    index: data.id,
    star: data.winStar,
    levels: data.levels.map((level) => transLevel(level)),
  };
}

/**
 * @description 转换层-关卡数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Abyss.Level} data 本地数据
 * @returns {TGApp.Plugins.Hutao.AbyssLevel} 上传用的数据
 */
function transLevel(data: TGApp.Sqlite.Abyss.Level): TGApp.Plugins.Hutao.AbyssLevel {
  const battles: Array<{ index: number; avatars: number[] }> = [];
  battles.push({
    index: 1,
    avatars: data.upBattle.characters.map((character) => character.id),
  });
  battles.push({
    index: 2,
    avatars: data.downBattle.characters.map((character) => character.id),
  });
  return {
    index: data.id,
    star: data.winStar,
    battles,
  };
}

/**
 * @description 转换角色数据
 * @since Alpha v0.2.1
 * @param {TGApp.Sqlite.Character.UserRole[]} avatars 角色数据
 * @returns {TGApp.Plugins.Hutao.AbyssAvatar[]} 上传用的数据
 */
export function transAvatars(
  avatars: TGApp.Sqlite.Character.UserRole[],
): TGApp.Plugins.Hutao.AbyssAvatar[] {
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
      avatarId: avatar.cid,
      weaponId: weapon.id,
      reliquarySetIds: relics,
      activedConstellationNumber: avatar.activeConstellation,
    };
  });
}
