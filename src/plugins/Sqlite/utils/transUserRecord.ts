/**
 * @file plugins/Sqlite/utils/transUserRecord.ts
 * @description Sqlite 数据转换 用户战绩数据转换模块
 * @since Beta v0.8.1
 */

import { getZhElement } from "@utils/toolFunc.js";

/**
 * @description 将通过 api 获取到的用户战绩数据转换为渲染用的数据
 * @since Beta v0.6.0
 * @param {number} uid - 用户UID
 * @param {TGApp.Game.Record.FullData} data 用户战绩数据
 * @returns {TGApp.Sqlite.Record.RenderData} 转换后的用户战绩数据
 */
export function transUserRecord(
  uid: number,
  data: TGApp.Game.Record.FullData,
): TGApp.Sqlite.Record.RenderData {
  return {
    uid: uid,
    role: transRole(data.role),
    avatars: data.avatars.map(transAvatar).sort((a, b) => b.star - a.star || b.id - a.id),
    stats: transStat(data.stats),
    worldExplore: transWorld(data.world_explorations),
    homes: data.homes.map(transHome),
    updated: "",
  };
}

/**
 * @description 将角色信息转换为数据库中的数据
 * @since Beta v0.6.0
 * @param {TGApp.Game.Record.Role} data 角色信息
 * @returns {TGApp.Sqlite.Record.Role} 转换后的角色信息
 */
function transRole(data: TGApp.Game.Record.Role): TGApp.Sqlite.Record.Role {
  return {
    nickname: data.nickname,
    region: data.region,
    level: data.level,
    avatar: data.game_head_icon,
  };
}

/**
 * @description 将角色列表转换为数据库中的数据
 * @since Beta v0.6.0
 * @param {TGApp.Game.Record.Avatar} data 角色列表
 * @returns {TGApp.Sqlite.Record.Avatar} 转换后的角色列表
 */
function transAvatar(data: TGApp.Game.Record.Avatar): TGApp.Sqlite.Record.Avatar {
  return {
    id: data.id,
    name: data.name,
    element: getZhElement(data.element),
    fetter: data.fetter,
    level: data.level,
    star: data.rarity === 105 ? 5 : data.rarity,
    constellation: data.actived_constellation_num,
    isShow: data.is_chosen ? 1 : 0,
  };
}

/**
 * @description 获取幽境危战难度描述
 * @since Beta v0.8.0
 * @param {number} difficulty 幽境危战难度
 * @return {string} 幽境危战难度描述
 */
export function getHardChallengeDesc(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return "普通";
    case 2:
      return "进阶";
    case 3:
      return "困难";
    case 4:
      return "险恶";
    case 5:
      return "无畏";
    case 6:
      return "绝境";
    default:
      return `难度${difficulty}`;
  }
}

/**
 * @description 将统计信息转换为数据库中的数据
 * @since Beta v0.8.1
 * @param {TGApp.Game.Record.Stats} data 统计信息
 * @return {TGApp.Sqlite.Record.Stats} 转换后的统计信息
 */
function transStat(data: TGApp.Game.Record.Stats): TGApp.Sqlite.Record.Stats {
  return {
    activeDays: data.active_day_number,
    achievementNumber: data.achievement_number,
    avatarNumber: data.avatar_number,
    avatarFetter: data.full_fetter_avatar_num,
    wayPoints: data.way_point_number,
    domainNumber: data.domain_number,
    anemoCulus: data.anemoculus_number,
    geoCulus: data.geoculus_number,
    electroCulus: data.electroculus_number,
    dendroCulus: data.dendroculus_number,
    hydroCulus: data.hydroculus_number,
    pyroCulus: data.pyroculus_number,
    moonCulus: data.moonoculus_number,
    sprialAbyss: data.spiral_abyss,
    combatRole: data.role_combat.is_unlock ? `第 ${data.role_combat.max_round_id} 幕` : "未解锁",
    hardChallenge: data.hard_challenge.is_unlock
      ? `${data.hard_challenge.name}-${getHardChallengeDesc(data.hard_challenge.difficulty)}`
      : "未解锁",
    luxuriousChest: data.luxurious_chest_number,
    preciousChest: data.precious_chest_number,
    exquisiteChest: data.exquisite_chest_number,
    commonChest: data.common_chest_number,
    magicChest: data.magic_chest_number,
  };
}

/**
 * @description 将探索信息转换为数据库中的数据
 * @since Beta v0.8.1
 * @param {Array<TGApp.Game.Record.WorldExplore>} data 城市探索信息
 * @returns {Array<TGApp.Sqlite.Record.WorldExplore>} 转换后的城市探索信息
 */
function transWorld(
  data: Array<TGApp.Game.Record.WorldExplore>,
): Array<TGApp.Sqlite.Record.WorldExplore> {
  const areaParent = data.filter((i) => i.parent_id === 0);
  const areaChild = data.filter((i) => i.parent_id !== 0);
  const worlds: TGApp.Sqlite.Record.WorldExplore[] = [];
  // 先处理父级城市
  for (const area of areaParent) {
    const world: TGApp.Sqlite.Record.WorldExplore = {
      id: area.id,
      name: area.name,
      iconLight: area.icon,
      icon: area.icon,
      bg: area.background_image,
      cover: area.cover,
      exploration: area.exploration_percentage,
      area_exploration_list: area.area_exploration_list,
      children: [],
    };
    if (area.type === "Reputation") world.reputation = area.level;
    if (area.offerings !== undefined && area.offerings.length > 0) world.offerings = area.offerings;
    // 对纳塔的特殊处理
    if (area.name === "纳塔") {
      world.icon =
        "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-15.fd274778.png";
      world.iconLight = world.icon;
      world.bg =
        "https://fastcdn.mihoyo.com/static-resource-v2/2024/08/19/8856eafed39be791276a21a6d522426b_6903333123294722705.png";
      // 对远古圣山的特殊处理
    } else if (area.name === "远古圣山") {
      world.icon =
        "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-16.1c751ac9.png";
      world.iconLight = world.icon;
      world.bg =
        "https://fastcdn.mihoyo.com/static-resource-v2/2025/03/17/8ee1648101a8b292ffb37eb49559032e_6583057448168798147.png";
      // 对挪德卡莱的特殊处理
    } else if (area.name === "挪德卡莱") {
      world.icon =
        "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-17.dadac5bf.png";
      world.iconLight = world.icon;
      world.bg =
        "https://fastcdn.mihoyo.com/static-resource-v2/2025/08/22/ace66cea9c5074b70310ecbbb712cd94_2619077306700596372.png";
    }
    const children = areaChild.filter((i) => i.parent_id === area.id);
    for (const child of children) {
      world.children.push({
        id: child.id,
        name: child.name,
        exploration: child.exploration_percentage,
      });
    }
    worlds.push(world);
  }
  return worlds;
}

/**
 * @description 将住宅信息转换为数据库中的数据
 * @since Beta v0.6.0
 * @param {TGApp.Game.Record.Home} data 住宅信息
 * @returns {TGApp.Sqlite.Record.Home} 转换后的住宅信息
 */
function transHome(data: TGApp.Game.Record.Home): TGApp.Sqlite.Record.Home {
  return {
    comfortIcon: data.comfort_level_icon,
    comfortName: data.comfort_level_name,
    name: data.name,
    level: data.level,
    comfort: data.comfort_num,
    furniture: data.item_num,
    visit: data.visit_num,
    bg: data.icon,
  };
}
