/**
 * 原神战绩数据转换
 * @since Beta v0.10.0
 */

import gameEnum from "@enum/game.js";
import { getZhElement } from "@utils/toolFunc.js";

/**
 * 地区特殊资源配置项
 * @since Beta v0.10.0
 */
type StaticArea = {
  /** 地区名称 */
  name: string;
  /** 图标 */
  iconLight: string;
  /** 背景 */
  bg: string;
};

/**
 * 地区特殊资源配置列表
 * @since Beta v0.10.0
 */
const STATIC_AREA: Readonly<Record<number, StaticArea>> = {
  15: {
    name: "纳塔",
    iconLight:
      "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-15.fd274778.png",
    bg: "https://fastcdn.mihoyo.com/static-resource-v2/2024/08/19/8856eafed39be791276a21a6d522426b_6903333123294722705.png",
  },
  16: {
    name: "远古圣山",
    iconLight:
      "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-16.1c751ac9.png",
    bg: "https://fastcdn.mihoyo.com/static-resource-v2/2025/03/17/8ee1648101a8b292ffb37eb49559032e_6583057448168798147.png",
  },
  17: {
    name: "挪德卡莱",
    iconLight:
      "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-17.dadac5bf.png",
    bg: "https://fastcdn.mihoyo.com/static-resource-v2/2025/08/22/ace66cea9c5074b70310ecbbb712cd94_2619077306700596372.png",
  },
  18: {
    name: "风息山",
    iconLight:
      "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-1.20b81b5f.png",
    bg: "https://fastcdn.mihoyo.com/static-resource-v2/2026/04/01/cf1d89b8701d81aee20a56675293d8bf_4405529076047143557.png",
  },
  19: {
    name: "空之神殿",
    iconLight:
      "https://webstatic.mihoyo.com/app/community-game-records/images/world-logo-19.a9df3078.png",
    bg: "https://fastcdn.mihoyo.com/static-resource-v2/2026/04/01/e2f71f00220851c475f3babe694b134e_7279058850569905239.png",
  },
};

/**
 * 转换战绩口数据
 * @since Beta v0.9.1
 * @param uid - 用户UID
 * @param data - 用户战绩数据
 * @returns 转换后的用户战绩数据
 */
export function transUserRecord(
  uid: number,
  data: TGApp.Game.Record.FullData,
): TGApp.Sqlite.Record.TableTrans {
  return {
    uid: uid,
    role: transRole(data.role),
    avatars: data.avatars.map(transAvatar),
    stats: transStat(data.stats),
    worldExplore: transWorld(data.world_explorations),
    homes: data.homes.map(transHome),
    updated: "",
  };
}

/**
 * 转换用户信息
 * @since Beta v0.6.0
 * @param data - 用户信息
 * @returns 转换后的用户信息
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
 * 转换角色数据
 * @since Beta v0.9.1
 * @param data - 角色数据
 * @returns 转换后的角色数据
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
 * 转换统计信息
 * @since Beta v0.9.9
 * @param data - 统计信息
 * @returns 转换后的统计信息
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
      ? `${data.hard_challenge.name}-${gameEnum.challenge.diffDesc(data.hard_challenge.difficulty)}`
      : "未解锁",
    luxuriousChest: data.luxurious_chest_number,
    preciousChest: data.precious_chest_number,
    exquisiteChest: data.exquisite_chest_number,
    commonChest: data.common_chest_number,
    magicChest: data.magic_chest_number,
  };
}

/**
 * 转换探索信息
 * @since Beta v0.10.0
 * @param data - 城市探索信息
 * @returns 转换后的城市探索信息
 */
function transWorld(
  data: Array<TGApp.Game.Record.WorldExplore>,
): Array<TGApp.Sqlite.Record.WorldExplore> {
  const areaParent = data.filter((i) => i.parent_id === 0);
  const areaChild = data.filter((i) => i.parent_id !== 0);
  const worlds: Array<TGApp.Sqlite.Record.WorldExplore> = [];
  // 先处理父级城市
  for (const area of areaParent) {
    const world: TGApp.Sqlite.Record.WorldExplore = {
      id: area.id,
      name: area.name,
      iconLight: area.icon,
      bg: area.background_image,
      cover: area.cover,
      exploration: area.exploration_percentage,
      area_exploration_list: area.area_exploration_list,
      children: [],
    };
    if (area.type === "Reputation") world.reputation = area.level;
    if (area.offerings !== undefined && area.offerings.length > 0) world.offerings = area.offerings;
    if (area.id in STATIC_AREA && STATIC_AREA[area.id].name === area.name) {
      world.iconLight = STATIC_AREA[area.id].iconLight;
      world.bg = STATIC_AREA[area.id].bg;
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
 * 转换尘歌壶数据
 * @since Beta v0.6.0
 * @param data - 尘歌壶信息
 * @returns 转换后的尘歌壶信息
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
