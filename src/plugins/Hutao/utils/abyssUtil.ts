/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 */

/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param data - 本地数据
 * @returns 上传用的数据
 */
export function transAbyssLocal(
  data: TGApp.Sqlite.Abyss.TableTrans,
): TGApp.Plugins.Hutao.Abyss.RecordUpload {
  return {
    Uid: data.uid,
    Identity: "TeyvatGuide",
    SpiralAbyss: transAbyssData(data),
    Avatars: [],
    ReservedUserName: "",
  };
}

/**
 * 转换深渊数据
 * @since Beta v0.6.3
 * @param data - 本地数据
 * @returns 上传用的数据
 */
function transAbyssData(data: TGApp.Sqlite.Abyss.TableTrans): TGApp.Plugins.Hutao.Abyss.RecordData {
  return {
    ScheduleId: data.id,
    TotalBattleTimes: data.totalBattleTimes,
    TotalWinTimes: data.totalWinTimes,
    Defeat: {
      AvatarId: data.defeatRank[0].id,
      Value: data.defeatRank[0].value,
    },
    EnergySkill: {
      AvatarId: data.energySkillRank[0].id,
      Value: data.energySkillRank[0].value,
    },
    NormalSkill: {
      AvatarId: data.normalSkillRank[0].id,
      Value: data.normalSkillRank[0].value,
    },
    Damage: {
      AvatarId: data.damageRank[0].id,
      Value: data.damageRank[0].value,
    },
    TakeDamage: {
      AvatarId: data.takeDamageRank[0].id,
      Value: data.takeDamageRank[0].value,
    },
    Floors: data.floors.map((floor: TGApp.Sqlite.Abyss.Floor) => transFloor(floor)),
  };
}

/**
 * 转换层数数据
 * @since Alpha v0.2.1
 * @param data - 本地数据
 * @returns 上传用的数据
 */
function transFloor(data: TGApp.Sqlite.Abyss.Floor): TGApp.Plugins.Hutao.Abyss.Floor {
  return {
    Index: data.id,
    Star: data.winStar,
    Levels: data.levels.map((level) => transLevel(level)),
  };
}

/**
 * 转换层-关卡数据
 * @since Alpha v0.2.1
 * @param data - 本地数据
 * @returns 上传用的数据
 */
function transLevel(data: TGApp.Sqlite.Abyss.Level): TGApp.Plugins.Hutao.Abyss.Level {
  const battles: Array<{ Index: number; Avatars: Array<number> }> = [];
  battles.push({
    Index: 1,
    Avatars: data.upBattle!.characters.map((character) => character.id),
  });
  battles.push({
    Index: 2,
    Avatars: data.downBattle!.characters.map((character) => character.id),
  });
  return {
    Index: data.id,
    Star: data.winStar,
    Battles: battles,
  };
}

/**
 * 转换角色数据
 * @since Beta v0.5.5
 * @param avatars - 角色数据
 * @returns 上传用的数据
 */
export function transAbyssAvatars(
  avatars: Array<TGApp.Sqlite.Character.TableTrans>,
): Array<TGApp.Plugins.Hutao.Abyss.Avatar> {
  return avatars.map((avatar) => {
    return {
      AvatarId: avatar.avatar.id,
      WeaponId: avatar.weapon.id,
      ReliquarySetIds: avatar.relics.map((relic) => relic.set.id),
      ActivedConstellationNumber: avatar.avatar.actived_constellation_num,
    };
  });
}
