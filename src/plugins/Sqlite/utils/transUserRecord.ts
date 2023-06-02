/**
 * @file plugins Sqlite utils transUserRecord.ts
 * @description Sqlite 数据转换 用户战绩数据转换模块
 * @author BTMuli <bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

/**
 * @description 将通过 api 获取到的用户战绩数据转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.FullData} data 用户战绩数据
 * @returns {TGApp.Sqlite.Record.SingleTable} 转换后的用户战绩数据
 */
export function transUserRecord (data: TGApp.Game.Record.FullData): TGApp.Sqlite.Record.SingleTable {
  return {
    uid: "",
    role: transRole(data.role),
    avatars: transAvatar(data.avatars),
    stats: transStat(data.stats),
    worldExplore: transWorld(data.world_explorations),
    homes: transHome(data.homes),
    updated: "",
  };
}

/**
 * @description 将角色信息转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.Role} data 角色信息
 * @returns {string} 转换后的角色信息
 */
function transRole (data: TGApp.Game.Record.Role): string {
  const role: TGApp.Sqlite.Record.Role = {
    nickname: data.nickname,
    region: data.region,
    level: data.level,
  };
  return JSON.stringify(role);
}

/**
 * @description 将角色列表转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.Avatar[]} data 角色列表
 * @returns {string} 转换后的角色列表
 */
function transAvatar (data: TGApp.Game.Record.Avatar[]): string {
  const elementMap: Record<string, string> = {
    Anemo: "风",
    Geo: "岩",
    Electro: "雷",
    Hydro: "水",
    Pyro: "火",
    Cryo: "冰",
    Dendro: "草",
  };
  const avatars: TGApp.Sqlite.Record.Avatar[] = data.map(item => {
    return {
      id: item.id,
      name: item.name,
      element: elementMap[item.element],
      fetter: item.fetter,
      level: item.level,
      star: item.rarity === 105 ? 5 : item.rarity,
      constellation: item.actived_constellation_num,
      isShow: item.is_chosen ? 1 : 0,
    } as TGApp.Sqlite.Record.Avatar;
  }).sort((a, b) => {
    // 先按星级降序
    if (a.star !== b.star) {
      return b.star - a.star;
    }
    // 再按 id 降序
    return b.id - a.id;
  });
  return JSON.stringify(avatars);
}

/**
 * @description 将统计信息转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.Stats} data 统计信息
 * @return {string} 转换后的统计信息
 */
function transStat (data: TGApp.Game.Record.Stats): string {
  const stats: TGApp.Sqlite.Record.Stats = {
    activeDays: data.active_day_number,
    achievementNumber: data.achievement_number,
    avatarNumber: data.avatar_number,
    wayPoints: data.way_point_number,
    domainNumber: data.domain_number,
    anemoCulus: data.anemoculus_number,
    geoCulus: data.geoculus_number,
    electroCulus: data.electroculus_number,
    dendroCulus: data.dendroculus_number,
    sprialAbyss: data.spiral_abyss,
    luxuriousChest: data.luxurious_chest_number,
    preciousChest: data.precious_chest_number,
    exquisiteChest: data.exquisite_chest_number,
    commonChest: data.common_chest_number,
    magicChest: data.magic_chest_number,
  };
  return JSON.stringify(stats);
}

/**
 * @description 将探索信息转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.WorldExplore[]} data 城市探索信息
 * @returns {string} 转换后的城市探索信息
 */
function transWorld (data: TGApp.Game.Record.WorldExplore[]): string {
  const worlds: TGApp.Sqlite.Record.WorldExplore[] = data.map(item => {
    let offerings;
    if (item.Offerings !== undefined) {
      offerings = item.Offerings.map(offering => {
        return {
          name: offering.name,
          icon: offering.icon,
          level: offering.level,
        } as TGApp.Sqlite.Record.WorldOffering;
      });
    }
    return {
      level: item.level,
      exploration: item.exploration_percentage,
      iconLight: item.icon,
      iconDark: item.inner_icon,
      name: item.name,
      type: item.type,
      offerings,
      bg: item.background_image,
      cover: item.cover,
    } as TGApp.Sqlite.Record.WorldExplore;
  });
  return JSON.stringify(worlds);
}

/**
 * @description 将住宅信息转换为数据库中的数据
 * @since Alpha v0.2.0
 * @param {TGApp.Game.Record.Home[]} data 住宅信息
 * @returns {string} 转换后的住宅信息
 */
function transHome (data: TGApp.Game.Record.Home[]): string {
  const homes: TGApp.Sqlite.Record.Home[] = data.map(item => {
    return {
      comfortIcon: item.comfort_level_icon,
      comfortName: item.comfort_level_name,
      name: item.name,
      level: item.level,
      comfort: item.comfort_num,
      furniture: item.item_num,
      visit: item.visit_num,
      bg: item.icon,
    } as TGApp.Sqlite.Record.Home;
  });
  return JSON.stringify(homes);
}
