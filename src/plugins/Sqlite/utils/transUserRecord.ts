/**
 * 原神战绩数据转换
 * @since Beta v0.12.0
 */

/**
 * 地区特殊资源配置项
 * @since Beta v0.12.0
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
 * @since Beta v0.12.0
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

const EMPTY_TEMPLE_STATUE_ICON = "/UI/record/pos.webp";

/**
 * 不参与世界探索展示合并的区域
 * @since Beta v0.12.0
 */
const UNMERGED_WORLD_AREA_NAMES = new Set<string>([
  "层岩巨渊",
  "层岩巨渊·地下矿区",
  "沉玉谷",
  "来歆山",
  "沉玉谷·南陵",
  "沉玉谷·上谷",
]);

/**
 * 转换战绩口数据
 * @since Beta v0.12.0
 * @param data - 用户战绩数据
 * @returns 转换后的用户战绩数据
 */
export function transUserRecord(
  data: TGApp.Game.Record.FullData,
): TGApp.Sqlite.Record.TableTransData {
  const displayConfig = data.world_explore_display ?? data.world_exploration_display ?? [];
  return {
    role: data.role,
    avatars: data.avatars,
    stats: data.stats,
    wed: transWorld(data.world_explorations, displayConfig),
    homes: data.homes,
  };
}

/**
 * 准备探索展示资源
 * @since Beta v0.12.0
 * @param worlds - 世界探索信息
 * @param displayConfig - 世界探索展示分组配置
 * @returns 合并展示分组、仅覆盖展示资源后的世界探索信息
 */
function transWorld(
  worlds: Array<TGApp.Game.Record.WorldExplore>,
  displayConfig: Array<TGApp.Game.Record.WorldExploreDisplayConfig>,
): Array<TGApp.Game.Record.WorldExploreDisplay> {
  const worldMap = new Map<number, TGApp.Game.Record.WorldExplore>(
    worlds.map((world) => [world.id, world]),
  );

  return displayConfig.flatMap((display) => {
    const world = worldMap.get(display.exploration_id);
    if (world === undefined) return [];
    const staticArea = STATIC_AREA[world.id];
    const displayWorld: TGApp.Game.Record.WorldExplore =
      staticArea !== undefined && staticArea.name === world.name
        ? {
            ...world,
            icon: staticArea.iconLight,
            background_image: staticArea.bg,
          }
        : { ...world };
    const detailWorlds = getWorldDetailWorlds(world.id, worldMap, display);
    const children = getWorldDisplayItems(detailWorlds, worldMap, display);
    return [
      {
        ...displayWorld,
        offerings: transWorldOfferings(world),
        children,
        detail_worlds: detailWorlds,
      },
    ];
  });
}

/**
 * 处理世界探索供奉图标
 * @since Beta v0.12.0
 * @param world - 世界探索信息
 * @returns 处理后的供奉信息
 */
function transWorldOfferings(
  world: TGApp.Game.Record.WorldExplore,
): Array<TGApp.Game.Record.WorldOffering> {
  if (world.id !== 19 || world.offerings.length === 0) return world.offerings;
  return world.offerings.map((offering, index) =>
    index === 0 ? { ...offering, icon: EMPTY_TEMPLE_STATUE_ICON } : offering,
  );
}

/**
 * 获取地区的全部子区域
 * @since Beta v0.12.0
 * @param worldId - 地区 ID
 * @param worldMap - 世界探索索引
 * @param display - 当前父级的展示分组配置
 * @returns 子区域列表
 */
function getWorldDetailWorlds(
  worldId: number,
  worldMap: Map<number, TGApp.Game.Record.WorldExplore>,
  display: TGApp.Game.Record.WorldExploreDisplayConfig,
): Array<TGApp.Game.Record.WorldExplore> {
  const childrenByParent = new Map<number, Array<TGApp.Game.Record.WorldExplore>>();
  for (const world of worldMap.values()) {
    const children = childrenByParent.get(world.parent_id) ?? [];
    children.push(world);
    childrenByParent.set(world.parent_id, children);
  }

  const result: Array<TGApp.Game.Record.WorldExplore> = [];
  const visited = new Set<number>();
  const displayWorlds = display.group.items.flatMap((item) =>
    item.area_ids.flatMap((areaId) => {
      const world = worldMap.get(areaId);
      return world === undefined || world.id === worldId ? [] : [world];
    }),
  );
  const pending = [...(childrenByParent.get(worldId) ?? []), ...displayWorlds];
  while (pending.length > 0) {
    const world = pending.shift();
    if (world === undefined || visited.has(world.id)) continue;
    visited.add(world.id);
    result.push(world);
    pending.push(...(childrenByParent.get(world.id) ?? []));
  }
  return result;
}

/**
 * 合并世界探索展示子项
 * @since Beta v0.12.0
 * @param detailWorlds - 地区的全部子区域
 * @param worldMap - 世界探索索引
 * @param display - 当前父级的展示分组配置
 * @returns 展示子项
 */
function getWorldDisplayItems(
  detailWorlds: Array<TGApp.Game.Record.WorldExplore>,
  worldMap: Map<number, TGApp.Game.Record.WorldExplore>,
  display: TGApp.Game.Record.WorldExploreDisplayConfig | undefined,
): Array<TGApp.Game.Record.WorldExploreDisplayItem> {
  const displayItems =
    display?.group.items.flatMap<TGApp.Game.Record.WorldExploreDisplayItem>((item) => {
      const areaWorlds = item.area_ids
        .map((id) => worldMap.get(id))
        .filter((area): area is TGApp.Game.Record.WorldExplore => area !== undefined);
      if (areaWorlds.length === 0) return [];
      if (areaWorlds.some((area) => UNMERGED_WORLD_AREA_NAMES.has(area.name))) {
        return areaWorlds.map((area) => ({
          area_ids: [area.id],
          name: area.name,
          exploration_percentage: area.exploration_percentage,
        }));
      }
      return [
        {
          area_ids: [...item.area_ids],
          name: areaWorlds.map((area) => area.name).join("、"),
          exploration_percentage: item.exploration_percentage,
        },
      ];
    }) ?? [];
  const displayedAreaIds = new Set(displayItems.flatMap((item) => item.area_ids));
  const fallbackItems = detailWorlds
    .filter((area) => !displayedAreaIds.has(area.id))
    .map((area) => ({
      area_ids: [area.id],
      name: area.name,
      exploration_percentage: area.exploration_percentage,
    }));
  if (displayItems.length === 0) return fallbackItems;
  return [...displayItems, ...fallbackItems];
}
