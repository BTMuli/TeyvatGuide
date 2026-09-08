/**
 * 用户背包合并视图的纯数据投影。
 * @since Beta v0.12.2
 */

type RelicGroupOptions = {
  equipAvatarMap?: ReadonlyMap<string, number>;
  setNameMap?: ReadonlyMap<number, string>;
  getPositionName?: (position: number) => string;
};

/**
 * 获取武器精炼等级。
 * @since Beta v0.12.2
 */
export function getWeaponRefineLevel(item: TGApp.App.UserBag.WeaponItem): number {
  const affixMap = item.tb.info.affix_map;
  if (!affixMap) return 1;
  const values = Object.values(affixMap);
  return values.length > 0 ? values[0] + 1 : 1;
}

/**
 * 生成不依赖 GUID 的武器组键。
 * @since Beta v0.12.2
 */
export function getWeaponGroupKey(item: TGApp.App.UserBag.WeaponItem): string {
  return JSON.stringify([item.info.name, item.info.star]);
}

/**
 * 生成不依赖物品 ID 与星级的圣遗物组键。
 * @since Beta v0.12.2
 */
export function getRelicGroupKey(item: TGApp.Sqlite.UserBag.RelicTable): string {
  return JSON.stringify([item.sets]);
}

/**
 * 按合并视图规则稳定排序组内武器。
 * @since Beta v0.12.2
 */
export function sortWeaponGroupItems(
  items: Array<TGApp.App.UserBag.WeaponItem>,
  equipAvatarMap: ReadonlyMap<string, number> = new Map(),
): Array<TGApp.App.UserBag.WeaponItem> {
  return [...items].sort(
    (a, b) =>
      Number(equipAvatarMap.has(b.tb.guid)) - Number(equipAvatarMap.has(a.tb.guid)) ||
      b.tb.info.level - a.tb.info.level ||
      getWeaponRefineLevel(b) - getWeaponRefineLevel(a) ||
      Number(b.tb.info.is_locked) - Number(a.tb.info.is_locked) ||
      a.tb.guid.localeCompare(b.tb.guid),
  );
}

/**
 * 按合并视图规则稳定排序组内圣遗物。
 * @since Beta v0.12.2
 */
export function sortRelicGroupItems(
  items: Array<TGApp.Sqlite.UserBag.RelicTable>,
  equipAvatarMap: ReadonlyMap<string, number> = new Map(),
): Array<TGApp.Sqlite.UserBag.RelicTable> {
  return [...items].sort(
    (a, b) =>
      b.brief.star - a.brief.star ||
      Number(equipAvatarMap.has(b.guid)) - Number(equipAvatarMap.has(a.guid)) ||
      Number(b.is_marked) - Number(a.is_marked) ||
      Number(b.is_locked) - Number(a.is_locked) ||
      b.level - a.level ||
      a.guid.localeCompare(b.guid),
  );
}

/**
 * 将武器实例投影为合并组；只返回至少有一个可见实例的组。
 * @since Beta v0.12.2
 */
export function groupWeapons(
  allItems: Array<TGApp.App.UserBag.WeaponItem>,
  visibleItems: Array<TGApp.App.UserBag.WeaponItem>,
  equipAvatarMap: ReadonlyMap<string, number> = new Map(),
): Array<TGApp.App.UserBag.WeaponGroup> {
  const allGroups = collectByKey(allItems, getWeaponGroupKey);
  const visibleGroups = collectByKey(visibleItems, getWeaponGroupKey);
  const groups: Array<TGApp.App.UserBag.WeaponGroup> = [];

  for (const [key, matchingItems] of visibleGroups) {
    const items = sortWeaponGroupItems(allGroups.get(key) ?? matchingItems, equipAvatarMap);
    const sortedVisibleItems = sortWeaponGroupItems(matchingItems, equipAvatarMap);
    const representative = items[0];
    const levels = items.map((item) => item.tb.info.level);
    const refineLevels = items.map(getWeaponRefineLevel);
    groups.push({
      key,
      name: representative.info.name,
      star: representative.info.star,
      weaponType: representative.info.weapon,
      items,
      visibleItems: sortedVisibleItems,
      totalCount: items.length,
      visibleCount: sortedVisibleItems.length,
      representative,
      minLevel: Math.min(...levels),
      maxLevel: Math.max(...levels),
      minRefine: Math.min(...refineLevels),
      maxRefine: Math.max(...refineLevels),
      equippedCount: items.filter((item) => equipAvatarMap.has(item.tb.guid)).length,
      lockedCount: items.filter((item) => item.tb.info.is_locked).length,
    });
  }

  return groups.sort(
    (a, b) =>
      b.star - a.star ||
      a.weaponType.localeCompare(b.weaponType) ||
      a.name.localeCompare(b.name) ||
      a.key.localeCompare(b.key),
  );
}

/**
 * 将圣遗物实例投影为合并组；只返回至少有一个可见实例的组。
 * @since Beta v0.12.2
 */
export function groupRelics(
  allItems: Array<TGApp.Sqlite.UserBag.RelicTable>,
  visibleItems: Array<TGApp.Sqlite.UserBag.RelicTable>,
  options: RelicGroupOptions = {},
): Array<TGApp.App.UserBag.RelicGroup> {
  const equipAvatarMap = options.equipAvatarMap ?? new Map<string, number>();
  const allGroups = collectByKey(allItems, getRelicGroupKey);
  const visibleGroups = collectByKey(visibleItems, getRelicGroupKey);
  const groups: Array<TGApp.App.UserBag.RelicGroup> = [];

  for (const [key, matchingItems] of visibleGroups) {
    const items = sortRelicGroupItems(allGroups.get(key) ?? matchingItems, equipAvatarMap);
    const sortedVisibleItems = sortRelicGroupItems(matchingItems, equipAvatarMap);
    const representative = items[0];
    const setId = representative.sets;
    const starCounts = new Map<number, number>();
    const positionCounts = new Map<number, number>();
    for (const item of items) {
      starCounts.set(item.brief.star, (starCounts.get(item.brief.star) ?? 0) + 1);
      positionCounts.set(item.brief.pos, (positionCounts.get(item.brief.pos) ?? 0) + 1);
    }
    groups.push({
      key,
      setId,
      setName: options.setNameMap?.get(setId) ?? `套装 ${setId}`,
      items,
      visibleItems: sortedVisibleItems,
      totalCount: items.length,
      visibleCount: sortedVisibleItems.length,
      representative,
      starCounts: [...starCounts.entries()]
        .sort(([starA], [starB]) => starB - starA)
        .map(([star, count]) => ({ star, count })),
      positionCounts: [...positionCounts.entries()]
        .sort(([positionA], [positionB]) => positionA - positionB)
        .map(([position, count]) => ({
          position,
          name: options.getPositionName?.(position) ?? `部位 ${position}`,
          count,
        })),
      equippedCount: items.filter((item) => equipAvatarMap.has(item.guid)).length,
      markedCount: items.filter((item) => item.is_marked).length,
      lockedCount: items.filter((item) => item.is_locked).length,
    });
  }

  return groups.sort(
    (a, b) =>
      b.representative.brief.star - a.representative.brief.star ||
      a.setName.localeCompare(b.setName) ||
      a.key.localeCompare(b.key),
  );
}

function collectByKey<T>(items: Array<T>, getKey: (item: T) => string): Map<string, Array<T>> {
  const result = new Map<string, Array<T>>();
  for (const item of items) {
    const key = getKey(item);
    const group = result.get(key);
    if (group) group.push(item);
    else result.set(key, [item]);
  }
  return result;
}
