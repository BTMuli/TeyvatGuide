/**
 * 养成计算页的角色与武器选项推导。
 * @since Beta v0.13.0
 */

import { getRcStar, getZhElement } from "@utils/common/toolFunc.js";
import userCalc from "@utils/game/userCalc.js";
import { computed } from "vue";
import type { ComputedRef, Ref } from "vue";

import { AppCharacterData, AppWeaponData, wwWeapon } from "@/data/index.js";

/** 养成计算中排除的特殊角色（绮良良观察 etc.）。 */
export const EXCLUDED_CHARACTER_IDS: ReadonlySet<number> = new Set([10000117, 10000118]);
/** 旅行者角色 ID。 */
export const TRAVELER_IDS: ReadonlySet<number> = new Set([10000005, 10000007]);
const CHARACTER_WIKI_ORDER = new Map(
  [...AppCharacterData]
    .sort(
      (a, b) =>
        (b.star % 100) - (a.star % 100) ||
        new Date(b.release).getTime() - new Date(a.release).getTime() ||
        b.id - a.id,
    )
    .map((character, index) => [character.id, index]),
);
const WEAPON_WIKI_ORDER = new Map(
  [...AppWeaponData]
    .sort((a, b) => b.star - a.star || a.weapon.localeCompare(b.weapon) || b.id - a.id)
    .map((weapon, index) => [weapon.id, index]),
);

/** 选项域依赖的共享状态。 */
type CultivationOptionsDeps = {
  /** 本地战绩角色列表 */
  roles: Ref<Array<TGApp.Sqlite.Character.TableTrans>>;
  /** 本地武器选项列表 */
  weapons: Ref<Array<TGApp.App.UserCalc.WeaponOption>>;
  /** 接口角色目录 */
  apiAvatars: Ref<Array<TGApp.Game.Calculate.AvatarListItem>>;
  /** 接口武器目录 */
  apiWeapons: Ref<Array<TGApp.Game.Calculate.WeaponListItem>>;
  /** 战绩缓存角色列表 */
  recordAvatars: Ref<Array<TGApp.Game.Record.Avatar>>;
  /** 接口同步角色列表 */
  syncAvatars: Ref<Array<TGApp.Game.Calculate.SyncAvatar>>;
  /** 当前选中的角色 ID */
  selectedCharacterId: Ref<number | null>;
  /** 当前选中的武器选项键 */
  selectedWeaponKey: Ref<string | null>;
  /** 是否使用背包武器来源 */
  useBagWeaponSource: Ref<boolean>;
  /** 是否使用接口计算 */
  useApiCalculation: ComputedRef<boolean>;
  /** 武器选择是否只读（编辑已保存目标时） */
  weaponSelectionReadonly: ComputedRef<boolean>;
  /** 正在编辑的计划条目 */
  editingEntry: Ref<TGApp.Sqlite.Cultivation.EntryWithItems | undefined>;
};

/**
 * 创建养成计算的角色与武器选项推导。
 * @since Beta v0.13.0
 * @param deps - 共享状态依赖
 * @returns 选项 computed、选中项与选择恢复/优选函数
 */
export function useCultivationOptions(deps: CultivationOptionsDeps) {
  const {
    roles,
    weapons,
    apiAvatars,
    apiWeapons,
    recordAvatars,
    syncAvatars,
    selectedCharacterId,
    selectedWeaponKey,
    useBagWeaponSource,
    useApiCalculation,
    weaponSelectionReadonly,
    editingEntry,
  } = deps;

  const localCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() => {
    const roleMap = new Map(roles.value.map((role) => [role.cid, role]));
    const characterCatalog = Array.from(
      new Map(
        AppCharacterData.filter((character) => !EXCLUDED_CHARACTER_IDS.has(character.id)).map(
          (character) => [character.id, character],
        ),
      ).values(),
    );
    const options = characterCatalog.map((character) => {
      const role = roleMap.get(character.id);
      return role
        ? createLocalCharacterOption(role)
        : {
            title: `${character.name} · 未拥有`,
            value: character.id,
            name: character.name,
            icon: `/WIKI/character/${character.id}.webp`,
            element: character.element,
            star: character.star % 100,
            level: 1,
            owned: false,
            constellation: 0,
            fetter: 0,
            weaponType: character.weapon,
          };
    });
    for (const role of roles.value) {
      if (!options.some((option) => option.value === role.cid)) {
        options.push(createLocalCharacterOption(role));
      }
    }
    return options.sort(compareCharacterOptions);
  });
  const apiAvatarCatalog = computed<Array<TGApp.Game.Calculate.AvatarListItem>>(() => {
    const catalogMap = new Map<number, TGApp.Game.Calculate.AvatarListItem>();
    for (const avatar of apiAvatars.value) {
      if (TRAVELER_IDS.has(avatar.id) || catalogMap.has(avatar.id)) continue;
      catalogMap.set(avatar.id, avatar);
    }
    const traveler = findCurrentTraveler(apiAvatars.value, recordAvatars.value, syncAvatars.value);
    if (traveler) catalogMap.set(traveler.id, traveler);
    return Array.from(catalogMap.values());
  });
  const apiCharacterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() => {
    const options = apiAvatarCatalog.value.map((avatar) => {
      const synced = findSyncedAvatar(avatar, syncAvatars.value);
      return {
        title: synced ? `${avatar.name} · Lv.${synced.level_current}` : `${avatar.name} · 未拥有`,
        value: avatar.id,
        name: avatar.name,
        icon: avatar.icon,
        element: getElementNameByAttrId(avatar.element_attr_id),
        star: avatar.avatar_level,
        level: synced?.level_current ?? 1,
        owned: synced !== undefined,
        constellation: synced?.constellation_num ?? 0,
        fetter: synced?.fetter_level ?? 0,
        weaponType: getWeaponTypeByCategory(avatar.weapon_cat_id),
      };
    });
    for (const avatar of syncAvatars.value) {
      if (options.some((option) => option.value === avatar.id)) continue;
      options.push(createSyncCharacterOption(avatar));
    }
    return options.sort(compareCharacterOptions);
  });
  const characterOptions = computed<Array<TGApp.App.UserCalc.CharacterOption>>(() =>
    useApiCalculation.value ? apiCharacterOptions.value : localCharacterOptions.value,
  );
  const selectedCharacter = computed<TGApp.App.UserCalc.CharacterOption | undefined>(() =>
    characterOptions.value.find((option) => option.value === selectedCharacterId.value),
  );
  const selectedRole = computed<TGApp.Sqlite.Character.TableTrans | undefined>(() =>
    useApiCalculation.value
      ? undefined
      : roles.value.find((role) => role.cid === selectedCharacterId.value),
  );
  const selectedApiAvatar = computed<TGApp.Game.Calculate.AvatarListItem | undefined>(() =>
    useApiCalculation.value
      ? apiAvatarCatalog.value.find((avatar) => avatar.id === selectedCharacterId.value)
      : undefined,
  );
  const selectedSyncAvatar = computed<TGApp.Game.Calculate.SyncAvatar | undefined>(() =>
    useApiCalculation.value
      ? selectedApiAvatar.value
        ? findSyncedAvatar(selectedApiAvatar.value, syncAvatars.value)
        : syncAvatars.value.find((avatar) => avatar.id === selectedCharacterId.value)
      : undefined,
  );
  const selectedRoleWeaponType = computed<string>(() => {
    return selectedCharacter.value?.weaponType ?? "";
  });
  const hasBagWeaponData = computed<boolean>(
    () => !useApiCalculation.value && weapons.value.some((weapon) => weapon.source === "bag"),
  );
  const weaponOptions = computed<Array<TGApp.App.UserCalc.WeaponOption>>(() => {
    if (useApiCalculation.value) {
      return buildApiWeaponOptions(apiWeapons.value, syncAvatars.value).filter(
        (weapon) =>
          !selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value,
      );
    }
    const selectedSource = hasBagWeaponData.value && useBagWeaponSource.value ? "bag" : "equipped";
    const sourceWeaponIds = new Set(
      weapons.value
        .filter((weapon) => weapon.source === selectedSource)
        .map((weapon) => weapon.wiki.id),
    );
    return weapons.value.filter(
      (weapon) =>
        (weapon.source === selectedSource ||
          (weapon.source === "catalog" && !sourceWeaponIds.has(weapon.wiki.id))) &&
        (!selectedRoleWeaponType.value || weapon.wiki.weapon === selectedRoleWeaponType.value),
    );
  });
  const selectedWeapon = computed<TGApp.App.UserCalc.WeaponOption | undefined>(() =>
    weaponOptions.value.find((weapon) => weapon.key === selectedWeaponKey.value),
  );

  /**
   * 数据重载后恢复角色选择。
   * @since Beta v0.13.0
   * @param previousCharacterId - 重载前选中的角色 ID
   * @param options - 重载后的角色选项
   * @returns 应恢复为选中的角色 ID
   */
  function restoreCharacterSelection(
    previousCharacterId: number | null,
    options: ReadonlyArray<TGApp.App.UserCalc.CharacterOption>,
  ): number | null {
    if (options.some((option) => option.value === previousCharacterId)) return previousCharacterId;
    if (editingEntry.value !== undefined) return previousCharacterId;
    return options[0]?.value ?? null;
  }

  /**
   * 解析当前角色最合适的武器选项键。
   * @since Beta v0.13.0
   * @param options - 武器选项列表
   * @returns 首选武器选项键
   */
  function resolvePreferredWeaponKey(
    options: ReadonlyArray<TGApp.App.UserCalc.WeaponOption>,
  ): string | null {
    const equippedWeaponKey = options.find(
      (weapon) => weapon.equippedBy === selectedCharacterId.value,
    )?.key;
    if (equippedWeaponKey !== undefined) return equippedWeaponKey;
    const roleWeaponId = selectedSyncAvatar.value?.weapon.id ?? selectedRole.value?.weapon.id;
    if (roleWeaponId === undefined) return null;
    return options.find((weapon) => weapon.wiki.id === roleWeaponId)?.key ?? null;
  }

  /**
   * 选择当前角色最合适的武器。
   * @since Beta v0.13.0
   * @param force - 是否在已有有效选择时仍强制重选
   */
  function selectPreferredWeapon(force = false): void {
    const options = weaponOptions.value;
    if (options.length === 0) {
      selectedWeaponKey.value = null;
      return;
    }
    const currentValid = options.some((weapon) => weapon.key === selectedWeaponKey.value);
    if (currentValid && (!force || weaponSelectionReadonly.value)) return;
    const preferredKey = resolvePreferredWeaponKey(options);
    if (preferredKey !== null) {
      selectedWeaponKey.value = preferredKey;
      return;
    }
    if (!currentValid) selectedWeaponKey.value = null;
  }

  return {
    localCharacterOptions,
    apiCharacterOptions,
    characterOptions,
    selectedCharacter,
    selectedRole,
    selectedApiAvatar,
    selectedSyncAvatar,
    selectedRoleWeaponType,
    hasBagWeaponData,
    weaponOptions,
    selectedWeapon,
    restoreCharacterSelection,
    selectPreferredWeapon,
  };
}

/**
 * 将接口元素属性 ID 转为中文元素名。
 * @since Beta v0.13.0
 * @param elementAttrId - 接口元素属性 ID
 * @returns 中文元素名
 */
export function getElementNameByAttrId(elementAttrId: number): string {
  switch (elementAttrId) {
    case 1:
      return "火";
    case 2:
      return "风";
    case 3:
      return "岩";
    case 4:
      return "草";
    case 5:
      return "雷";
    case 6:
      return "水";
    case 7:
      return "冰";
    default:
      return "未知";
  }
}

/**
 * 在接口目录中定位当前元素的旅行者。
 * @since Beta v0.13.0
 * @param catalog - 接口角色目录
 * @param records - 战绩缓存角色列表
 * @param syncedAvatars - 接口同步角色列表
 * @returns 当前元素的旅行者目录条目
 */
function findCurrentTraveler(
  catalog: ReadonlyArray<TGApp.Game.Calculate.AvatarListItem>,
  records: ReadonlyArray<TGApp.Game.Record.Avatar>,
  syncedAvatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): TGApp.Game.Calculate.AvatarListItem | undefined {
  // 同步数据决定当前元素，避免旧战绩缓存覆盖已拥有的旅行者。
  const synced = syncedAvatars.find((avatar) => TRAVELER_IDS.has(avatar.id));
  if (synced) {
    return catalog.find(
      (avatar) => avatar.id === synced.id && avatar.element_attr_id === synced.element_attr_id,
    );
  }
  const record = records.find((avatar) => TRAVELER_IDS.has(avatar.id));
  if (record) {
    const recordElement = getZhElement(record.element);
    const normalizedElement = recordElement === "未知" ? record.element : recordElement;
    const matched = catalog.find(
      (avatar) =>
        avatar.id === record.id &&
        getElementNameByAttrId(avatar.element_attr_id) === normalizedElement,
    );
    if (matched) return matched;
  }
  return undefined;
}

/**
 * 在同步列表中定位目录角色对应的同步数据。
 * @since Beta v0.13.0
 * @param catalogAvatar - 接口目录角色
 * @param syncedAvatars - 接口同步角色列表
 * @returns 匹配的同步角色
 */
function findSyncedAvatar(
  catalogAvatar: TGApp.Game.Calculate.AvatarListItem,
  syncedAvatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): TGApp.Game.Calculate.SyncAvatar | undefined {
  return syncedAvatars.find(
    (avatar) =>
      avatar.id === catalogAvatar.id &&
      (!TRAVELER_IDS.has(avatar.id) || avatar.element_attr_id === catalogAvatar.element_attr_id),
  );
}

/**
 * 将接口武器类别 ID 转为中文武器类型。
 * @since Beta v0.13.0
 * @param weaponCategoryId - 接口武器类别 ID
 * @returns 中文武器类型
 */
function getWeaponTypeByCategory(weaponCategoryId: number): string {
  switch (weaponCategoryId) {
    case 1:
      return "单手剑";
    case 10:
      return "法器";
    case 11:
      return "双手剑";
    case 12:
      return "弓";
    case 13:
      return "长柄武器";
    default:
      return "未知武器";
  }
}

/**
 * 由本地战绩角色构建角色选项。
 * @since Beta v0.13.0
 * @param role - 本地战绩角色
 * @returns 角色选项
 */
function createLocalCharacterOption(
  role: TGApp.Sqlite.Character.TableTrans,
): TGApp.App.UserCalc.CharacterOption {
  const weaponType = wwWeapon.find((weapon) => weapon.id === role.weapon.id)?.weapon ?? "未知武器";
  return {
    title: `${role.avatar.name} · Lv.${role.avatar.level}`,
    value: role.cid,
    name: role.avatar.name,
    icon: `/WIKI/character/${role.cid}.webp`,
    element: getZhElement(role.avatar.element),
    star: getRcStar(role.cid, role.avatar.rarity),
    level: role.avatar.level,
    owned: true,
    constellation: role.avatar.actived_constellation_num,
    fetter: role.avatar.fetter,
    weaponType,
  };
}

/**
 * 由接口同步角色构建角色选项。
 * @since Beta v0.13.0
 * @param avatar - 接口同步角色
 * @returns 角色选项
 */
function createSyncCharacterOption(
  avatar: TGApp.Game.Calculate.SyncAvatar,
): TGApp.App.UserCalc.CharacterOption {
  return {
    title: `${avatar.name} · Lv.${avatar.level_current}`,
    value: avatar.id,
    name: avatar.name,
    icon: avatar.icon,
    element: getElementNameByAttrId(avatar.element_attr_id),
    star: avatar.avatar_level,
    level: avatar.level_current,
    owned: true,
    constellation: avatar.constellation_num,
    fetter: avatar.fetter_level,
    weaponType: getWeaponTypeByCategory(avatar.weapon_cat_id),
  };
}

/**
 * 由接口目录与同步数据构建武器选项。
 * @since Beta v0.13.0
 * @param catalog - 接口武器目录
 * @param avatars - 接口同步角色列表
 * @returns 排序后的武器选项
 */
function buildApiWeaponOptions(
  catalog: ReadonlyArray<TGApp.Game.Calculate.WeaponListItem>,
  avatars: ReadonlyArray<TGApp.Game.Calculate.SyncAvatar>,
): Array<TGApp.App.UserCalc.WeaponOption> {
  const result: Array<TGApp.App.UserCalc.WeaponOption> = [];
  const catalogMap = new Map(catalog.map((weapon) => [weapon.id, weapon]));
  const equippedWeaponIds = new Set<number>();
  for (const avatar of avatars) {
    const weapon = avatar.weapon;
    const api = catalogMap.get(weapon.id);
    const wiki = createApiWeaponWiki(api ?? weapon);
    equippedWeaponIds.add(weapon.id);
    result.push({
      key: `sync-${avatar.id}-${weapon.id}`,
      title: `${weapon.name} · Lv.${weapon.level_current}`,
      icon: weapon.icon,
      wiki,
      level: weapon.level_current,
      promoteLevel: userCalc.resolvePromoteLevel(weapon.level_current),
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "equipped",
      api,
      equippedBy: avatar.id,
    });
  }
  for (const weapon of catalog) {
    if (equippedWeaponIds.has(weapon.id)) continue;
    result.push({
      key: `api-${weapon.id}`,
      title: `${weapon.name} · 未拥有`,
      icon: weapon.icon,
      wiki: createApiWeaponWiki(weapon),
      level: 1,
      promoteLevel: 0,
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "catalog",
      api: weapon,
    });
  }
  return result.sort(compareWeaponOptions);
}

/**
 * 为接口武器补全 Wiki 条目。
 * @since Beta v0.13.0
 * @param weapon - 接口武器数据
 * @returns Wiki 武器条目
 */
function createApiWeaponWiki(
  weapon: TGApp.Game.Calculate.WeaponListItem | TGApp.Game.Calculate.SyncAvatarWeapon,
): TGApp.App.Weapon.WikiItem {
  const local = wwWeapon.find((item) => item.id === weapon.id);
  if (local) return local;
  return {
    id: weapon.id,
    name: weapon.name,
    description: "",
    star: weapon.weapon_level,
    weapon: getWeaponTypeByCategory(weapon.weapon_cat_id),
    materials: [],
    curves: [],
    story: [],
  };
}

/**
 * 构建武器选项列表
 * @since Beta v0.13.0
 * @param bagWeapons - 背包武器数据
 * @param roleData - 战绩角色数据
 * @param equipMap - 武器 GUID 到角色 ID 的映射（Yae 本地角色数据）
 * @returns 武器选项列表
 */
export function buildWeaponOptions(
  bagWeapons: Array<TGApp.Sqlite.UserBag.WeaponTable>,
  roleData: Array<TGApp.Sqlite.Character.TableTrans>,
  equipMap?: ReadonlyMap<string, number>,
): Array<TGApp.App.UserCalc.WeaponOption> {
  const result: Array<TGApp.App.UserCalc.WeaponOption> = [];
  for (const bagWeapon of bagWeapons) {
    const wiki = wwWeapon.find((weapon) => weapon.id === bagWeapon.id);
    if (!wiki) continue;
    const affixValues = Object.values(bagWeapon.info.affix_map);
    result.push({
      key: `bag-${bagWeapon.guid}`,
      title: `${wiki.name} · Lv.${bagWeapon.info.level}`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: bagWeapon.info.level,
      promoteLevel: bagWeapon.info.promote_level,
      affixLevel: Math.max(0, ...affixValues) + 1,
      fromBag: true,
      locked: bagWeapon.info.is_locked,
      source: "bag",
      guid: bagWeapon.guid,
      equippedBy: equipMap?.get(bagWeapon.guid),
    });
  }
  for (const role of roleData) {
    const roleWeapon = role.weapon;
    const wiki = wwWeapon.find((weapon) => weapon.id === roleWeapon.id);
    if (!wiki) continue;
    result.push({
      key: `role-${role.cid}-${roleWeapon.id}`,
      title: `${wiki.name} · Lv.${roleWeapon.level}`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: roleWeapon.level,
      promoteLevel: roleWeapon.promote_level,
      affixLevel: roleWeapon.affix_level,
      fromBag: false,
      locked: false,
      source: "equipped",
      equippedBy: role.cid,
    });
  }
  for (const wiki of wwWeapon) {
    result.push({
      key: `wiki-${wiki.id}`,
      title: `${wiki.name} · 未拥有`,
      icon: `/WIKI/weapon/${wiki.id}.webp`,
      wiki,
      level: 1,
      promoteLevel: 0,
      affixLevel: 1,
      fromBag: false,
      locked: false,
      source: "catalog",
    });
  }
  return result.sort(compareWeaponOptions);
}

/**
 * 比较两个角色选项的展示顺序。
 * @since Beta v0.13.0
 * @param a - 角色选项
 * @param b - 角色选项
 * @returns 排序结果
 */
function compareCharacterOptions(
  a: TGApp.App.UserCalc.CharacterOption,
  b: TGApp.App.UserCalc.CharacterOption,
): number {
  return (
    Number(b.owned) - Number(a.owned) ||
    (b.star % 100) - (a.star % 100) ||
    a.level - b.level ||
    b.constellation - a.constellation ||
    (CHARACTER_WIKI_ORDER.get(a.value) ?? Number.MAX_SAFE_INTEGER) -
      (CHARACTER_WIKI_ORDER.get(b.value) ?? Number.MAX_SAFE_INTEGER) ||
    a.value - b.value
  );
}

/**
 * 比较两个武器选项的展示顺序。
 * @since Beta v0.13.0
 * @param a - 武器选项
 * @param b - 武器选项
 * @returns 排序结果
 */
function compareWeaponOptions(
  a: TGApp.App.UserCalc.WeaponOption,
  b: TGApp.App.UserCalc.WeaponOption,
): number {
  return (
    Number(b.source !== "catalog") - Number(a.source !== "catalog") ||
    b.wiki.star - a.wiki.star ||
    a.level - b.level ||
    b.affixLevel - a.affixLevel ||
    (WEAPON_WIKI_ORDER.get(a.wiki.id) ?? Number.MAX_SAFE_INTEGER) -
      (WEAPON_WIKI_ORDER.get(b.wiki.id) ?? Number.MAX_SAFE_INTEGER) ||
    a.key.localeCompare(b.key)
  );
}
