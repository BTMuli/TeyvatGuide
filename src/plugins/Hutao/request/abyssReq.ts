/**
 * 深渊相关请求
 * @since Beta v0.10.1
 */
import TGHttps from "@utils/TGHttps.js";

const AbyssUrl: Readonly<string> = `https://homa.gentle.house/Statistics/`;

/**
 * 获取深渊概览数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 深渊概览响应
 */
async function getOverview(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.OverviewResp> {
  const url = `${AbyssUrl}Overview`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.OverviewResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色搭配数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 角色搭配响应
 */
async function getAvatarCollect(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarCollectResp> {
  const url = `${AbyssUrl}Avatar/AvatarCollocation`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.AvatarCollectResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色持有率数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 角色持有率响应
 */
async function getAvatarHoldRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarHoldResp> {
  const url = `${AbyssUrl}Avatar/HoldingRate`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.AvatarHoldResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色上场率数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 角色上场率响应
 */
async function getAvatarUpRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUpResp> {
  const url = `${AbyssUrl}Avatar/AttendanceRate`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.AvatarUpResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取角色使用率
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 角色使用率响应
 */
async function getAvatarUseRate(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.AvatarUseResp> {
  const url = `${AbyssUrl}Avatar/UtilizationRate`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.AvatarUseResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 获取队伍搭配数据
 * @since Beta v0.10.1
 * @param isLast - 是否获取上期数据
 * @returns 队伍搭配响应
 */
async function getTeamCollect(
  isLast: boolean = false,
): Promise<TGApp.Plugins.Hutao.Abyss.TeamCombineResp> {
  const url = `${AbyssUrl}Team/Combination`;
  const resp = await TGHttps.get<TGApp.Plugins.Hutao.Abyss.TeamCombineResp>(url, {
    query: { Last: isLast },
  });
  return resp.data;
}

/**
 * 上传用户数据
 * @since Beta v0.10.1
 * @param data - 用户数据
 * @returns 上传结果
 */
async function uploadData(
  data: TGApp.Plugins.Hutao.Abyss.RecordUpload,
): Promise<TGApp.Plugins.Hutao.Abyss.UploadResp> {
  const url = "https://homa.gentle.house/Record/Upload";
  const resp = await TGHttps.post<TGApp.Plugins.Hutao.Abyss.UploadResp>(url, {
    body: data,
    query: { returningRank: false },
    headers: { "Content-Type": "application/json" },
  });
  return resp.data;
}

/**
 * 将本地数据转为上传用的数据
 * @since Beta v0.6.3
 * @param data - 本地数据
 * @returns 上传用的数据
 */
function transData(data: TGApp.Sqlite.Abyss.TableTrans): TGApp.Plugins.Hutao.Abyss.RecordUpload {
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
function transAvatars(
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

const AbyssReq = {
  avatar: {
    collect: getAvatarCollect,
    hold: getAvatarHoldRate,
    up: getAvatarUpRate,
    use: getAvatarUseRate,
  },
  overview: getOverview,
  team: getTeamCollect,
  upload: uploadData,
  utils: {
    transData,
    transAvatars,
  },
};

export default AbyssReq;
