/**
 * 离线养成材料计算
 * @remarks 计算规则参考 Snap.Hutao Service/Cultivation/Offline
 * @since Beta v0.11.2
 */

/** 单项养成材料需求 */
export type CultivationMaterial = {
  /** 材料 ID */
  id: number;
  /** 所需数量 */
  count: number;
};

/** 材料 ID 偏移量与需求数量 */
type OffsetCount = readonly [offset: number, count: number];

const MORA_ID = 202;
const HEROES_WIT_ID = 104003;
const MYSTIC_ENHANCEMENT_ORE_ID = 104013;
const CROWN_OF_INSIGHT_ID = 104319;

const ASCENSION_LEVELS = <const>[20, 40, 50, 60, 70, 80];
const AVATAR_ASCENSION_MORA = <const>[20000, 40000, 60000, 80000, 100000, 120000];
const AVATAR_BOSS_COUNTS = <const>[0, 2, 4, 8, 12, 20];
const AVATAR_SPECIALTY_COUNTS = <const>[3, 10, 20, 30, 45, 60];
const AVATAR_GEM_COUNTS: ReadonlyArray<OffsetCount> = [
  [0, 1],
  [1, 3],
  [1, 6],
  [2, 3],
  [2, 6],
  [3, 6],
];
const AVATAR_MONSTER_COUNTS: ReadonlyArray<OffsetCount> = [
  [2, 3],
  [2, 15],
  [1, 12],
  [1, 18],
  [0, 12],
  [0, 24],
];

const TALENT_MORA = [0, 12500, 17500, 25000, 30000, 37500, 120000, 260000, 450000, 700000];
const WEEKLY_BOSS_COUNTS = [0, 0, 0, 0, 0, 0, 1, 1, 2, 2];
const TALENT_BOOK_COUNTS: ReadonlyArray<OffsetCount> = [
  [0, 0],
  [2, 3],
  [1, 2],
  [1, 4],
  [1, 6],
  [1, 9],
  [0, 4],
  [0, 6],
  [0, 12],
  [0, 16],
];
const TALENT_MONSTER_COUNTS: ReadonlyArray<OffsetCount> = [
  [0, 0],
  [2, 6],
  [1, 3],
  [1, 4],
  [1, 6],
  [1, 9],
  [0, 4],
  [0, 6],
  [0, 9],
  [0, 12],
];

const WEAPON_ASCENSION_MORA: Readonly<Record<number, ReadonlyArray<number>>> = {
  1: [0, 5000, 5000, 10000, 0, 0],
  2: [5000, 5000, 10000, 15000, 0, 0],
  3: [5000, 10000, 15000, 20000, 25000, 30000],
  4: [5000, 15000, 20000, 30000, 35000, 45000],
  5: [10000, 20000, 30000, 45000, 55000, 65000],
};
const WEAPON_MATERIAL_COUNTS: Readonly<Record<number, ReadonlyArray<OffsetCount>>> = {
  1: [
    [2, 1],
    [1, 1],
    [1, 2],
    [0, 1],
    [0, 0],
    [0, 0],
  ],
  2: [
    [2, 1],
    [1, 1],
    [1, 3],
    [0, 1],
    [0, 0],
    [0, 0],
  ],
  3: [
    [3, 2],
    [2, 2],
    [2, 4],
    [1, 2],
    [1, 4],
    [0, 3],
  ],
  4: [
    [3, 3],
    [2, 3],
    [2, 6],
    [1, 3],
    [1, 6],
    [0, 4],
  ],
  5: [
    [3, 5],
    [2, 5],
    [2, 9],
    [1, 5],
    [1, 9],
    [0, 6],
  ],
};
const WEAPON_MONSTER_A_COUNTS: Readonly<Record<number, ReadonlyArray<OffsetCount>>> = {
  1: [
    [1, 1],
    [1, 4],
    [0, 2],
    [0, 4],
    [0, 0],
    [0, 0],
  ],
  2: [
    [1, 1],
    [1, 5],
    [0, 3],
    [0, 5],
    [0, 0],
    [0, 0],
  ],
  3: [
    [2, 2],
    [2, 8],
    [1, 4],
    [1, 8],
    [0, 6],
    [0, 12],
  ],
  4: [
    [2, 3],
    [2, 12],
    [1, 6],
    [1, 12],
    [0, 9],
    [0, 18],
  ],
  5: [
    [2, 5],
    [2, 18],
    [1, 9],
    [1, 18],
    [0, 14],
    [0, 27],
  ],
};
const WEAPON_MONSTER_B_COUNTS: Readonly<Record<number, ReadonlyArray<OffsetCount>>> = {
  1: [
    [1, 1],
    [1, 2],
    [0, 2],
    [0, 3],
    [0, 0],
    [0, 0],
  ],
  2: [
    [1, 1],
    [1, 4],
    [0, 3],
    [0, 4],
    [0, 0],
    [0, 0],
  ],
  3: [
    [2, 1],
    [2, 5],
    [1, 4],
    [1, 6],
    [0, 4],
    [0, 8],
  ],
  4: [
    [2, 2],
    [2, 8],
    [1, 6],
    [1, 9],
    [0, 6],
    [0, 12],
  ],
  5: [
    [2, 3],
    [2, 12],
    [1, 9],
    [1, 14],
    [0, 9],
    [0, 18],
  ],
};

const AVATAR_LEVEL_EXP = [
  0, 1000, 1325, 1700, 2150, 2625, 3150, 3725, 4350, 5000, 5700, 6450, 7225, 8050, 8925, 9825,
  10750, 11725, 12725, 13775, 14875, 16800, 18000, 19250, 20550, 21875, 23250, 24650, 26100, 27575,
  29100, 30650, 32250, 33875, 35550, 37250, 38975, 40750, 42575, 44425, 46300, 50625, 52700, 54775,
  56900, 59075, 61275, 63525, 65800, 68125, 70475, 76500, 79050, 81650, 84275, 86950, 89650, 92400,
  95175, 98000, 100875, 108950, 112050, 115175, 118325, 121525, 124775, 128075, 131400, 134775,
  138175, 148700, 152375, 156075, 159825, 163600, 167425, 171300, 175225, 179175, 183175, 216225,
  243025, 273100, 306800, 344600, 386950, 434425, 487625, 547200, 0,
];

const WEAPON_LEVEL_EXP: Readonly<Record<number, ReadonlyArray<number>>> = {
  5: [
    0, 600, 950, 1350, 1800, 2325, 2925, 3525, 4200, 4950, 5700, 6525, 7400, 8300, 9225, 10200,
    11250, 12300, 13425, 14600, 15750, 17850, 19175, 20550, 21975, 23450, 24950, 26475, 28050,
    29675, 31350, 33050, 34800, 36575, 38400, 40250, 42150, 44100, 46100, 48125, 50150, 54875,
    57125, 59400, 61725, 64100, 66500, 68925, 71400, 73950, 76500, 83075, 85850, 88650, 91550,
    94425, 97400, 100350, 103400, 106475, 109575, 118350, 121700, 125100, 128550, 132050, 135575,
    139125, 142725, 146375, 150075, 161525, 165500, 169500, 173550, 177650, 181800, 186000, 190250,
    194525, 198875, 234725, 263825, 296400, 332975, 373950, 419925, 471375, 529050, 593675, 0,
  ],
  4: [
    0, 400, 625, 900, 1200, 1550, 1950, 2350, 2800, 3300, 3800, 4350, 4925, 5525, 6150, 6800, 7500,
    8200, 8950, 9725, 10500, 11900, 12775, 13700, 14650, 15625, 16625, 17650, 18700, 19775, 20900,
    22025, 23200, 24375, 25600, 26825, 28100, 29400, 30725, 32075, 33425, 36575, 38075, 39600,
    41150, 42725, 44325, 45950, 47600, 49300, 51000, 55375, 57225, 59100, 61025, 62950, 64925,
    66900, 68925, 70975, 73050, 78900, 81125, 83400, 85700, 88025, 90375, 92750, 95150, 97575,
    100050, 107675, 110325, 113000, 115700, 118425, 121200, 124000, 126825, 129675, 132575, 156475,
    175875, 197600, 221975, 249300, 279950, 314250, 352700, 395775, 0,
  ],
  3: [
    0, 275, 425, 600, 800, 1025, 1275, 1550, 1850, 2175, 2500, 2875, 3250, 3650, 4050, 4500, 4950,
    5400, 5900, 6425, 6925, 7850, 8425, 9050, 9675, 10325, 10975, 11650, 12350, 13050, 13800, 14525,
    15300, 16100, 16900, 17700, 18550, 19400, 20275, 21175, 22050, 24150, 25125, 26125, 27150,
    28200, 29250, 30325, 31425, 32550, 33650, 36550, 37775, 39000, 40275, 41550, 42850, 44150,
    45500, 46850, 48225, 52075, 53550, 55050, 56550, 58100, 59650, 61225, 62800, 64400, 66025,
    71075, 72825, 74575, 76350, 78150, 80000, 81850, 83700, 85575, 87500, 103275, 116075, 130425,
    146500, 164550, 184775, 207400, 232775, 261200, 0,
  ],
  2: [
    0, 175, 275, 400, 550, 700, 875, 1050, 1250, 1475, 1700, 1950, 2225, 2475, 2775, 3050, 3375,
    3700, 4025, 4375, 4725, 5350, 5750, 6175, 6600, 7025, 7475, 7950, 8425, 8900, 9400, 9900, 10450,
    10975, 11525, 12075, 12650, 13225, 13825, 14425, 15050, 16450, 17125, 17825, 18525, 19225,
    19950, 20675, 21425, 22175, 22950, 24925, 25750, 26600, 27450, 28325, 29225, 30100, 31025,
    31950, 32875, 35500, 36500, 37525, 38575, 39600, 40675, 41750, 42825, 43900, 0,
  ],
  1: [
    0, 125, 200, 275, 350, 475, 575, 700, 850, 1000, 1150, 1300, 1475, 1650, 1850, 2050, 2250, 2450,
    2675, 2925, 3150, 3575, 3825, 4100, 4400, 4700, 5000, 5300, 5600, 5925, 6275, 6600, 6950, 7325,
    7675, 8050, 8425, 8825, 9225, 9625, 10025, 10975, 11425, 11875, 12350, 12825, 13300, 13775,
    14275, 14800, 15300, 16625, 17175, 17725, 18300, 18875, 19475, 20075, 20675, 21300, 21925,
    23675, 24350, 25025, 25700, 26400, 27125, 27825, 28550, 29275, 0,
  ],
};

/** 将材料数量累加到需求表中。 */
function add(items: Map<number, number>, id: number, count: number): void {
  if (count <= 0) return;
  items.set(id, (items.get(id) ?? 0) + count);
}

/** 计算从当前等级提升至目标等级所需的总经验。 */
function sumExperience(data: ReadonlyArray<number>, current: number, target: number): number {
  if (current < 1 || current >= target || target >= data.length) return 0;
  return data.slice(current, target).reduce((sum, value) => sum + value, 0);
}

/** 获取等级区间内需要完成的突破阶段索引。 */
function requiredAscensionIndices(
  currentLevel: number,
  targetLevel: number,
  currentPromoteLevel: number,
  targetAscendedAtThreshold: boolean,
): Array<number> {
  let lower = Math.max(0, currentPromoteLevel);
  while (lower < ASCENSION_LEVELS.length && ASCENSION_LEVELS[lower] < currentLevel) lower++;
  let upper = 0;
  while (upper < ASCENSION_LEVELS.length && ASCENSION_LEVELS[upper] < targetLevel) upper++;
  if (targetAscendedAtThreshold && ASCENSION_LEVELS[upper] === targetLevel) upper++;
  return lower >= upper ? [] : Array.from({ length: upper - lower }, (_, index) => lower + index);
}

/** 根据角色等级推断已完成的突破次数。 */
function inferAvatarPromoteLevel(level: number): number {
  return ASCENSION_LEVELS.filter((ascensionLevel) => ascensionLevel < level).length;
}

/** 判断等级是否为突破临界等级。 */
export function isAscensionLevel(level: number): boolean {
  return ASCENSION_LEVELS.some((ascensionLevel) => ascensionLevel === level);
}

/** 判断对象是否已完成当前临界等级的突破。 */
export function isAscendedAtThreshold(level: number, promoteLevel?: number): boolean {
  const thresholdIndex = ASCENSION_LEVELS.findIndex((ascensionLevel) => ascensionLevel === level);
  return thresholdIndex !== -1 && (promoteLevel ?? 0) > thresholdIndex;
}

/**
 * 将背包导入数据在突破临界等级上的阶段索引转换为计算使用的已完成突破数。
 * 背包快照在恰好处于临界等级时使用当前突破项索引，而养成计算使用已完成项数量。
 */
export function resolveBagWeaponPromoteLevel(level: number, storedPromoteLevel: number): number {
  const thresholdIndex = ASCENSION_LEVELS.findIndex((ascensionLevel) => ascensionLevel === level);
  if (thresholdIndex !== -1 && storedPromoteLevel === thresholdIndex) return storedPromoteLevel + 1;
  return storedPromoteLevel;
}

/**
 * 解析计算使用的已完成突破次数。
 *
 * @param level - 当前或目标等级
 * @param storedPromoteLevel - 存档中的突破阶段
 * @param ascendedAtThreshold - 位于临界等级时是否已突破
 */
export function resolvePromoteLevel(
  level: number,
  storedPromoteLevel?: number,
  ascendedAtThreshold?: boolean,
): number {
  const thresholdIndex = ASCENSION_LEVELS.findIndex((ascensionLevel) => ascensionLevel === level);
  if (thresholdIndex !== -1 && ascendedAtThreshold !== undefined) {
    return thresholdIndex + (ascendedAtThreshold ? 1 : 0);
  }
  return storedPromoteLevel ?? inferAvatarPromoteLevel(level);
}

/** 将材料需求表转换为材料列表。 */
function toList(items: Map<number, number>): Array<CultivationMaterial> {
  return Array.from(items, ([id, count]) => ({ id, count }));
}

/**
 * 计算角色等级、突破及天赋升级所需的材料。
 *
 * @param role - 用户存档中的角色数据
 * @param wiki - 角色 Wiki 数据
 * @param targetLevel - 目标等级
 * @param targetTalentLevels - 可升级天赋的目标等级
 * @param currentPromoteLevel - 已完成的突破次数
 * @param targetAscendedAtThreshold - 到达目标临界等级后是否继续突破
 */
export function calculateAvatarMaterials(
  role: TGApp.Sqlite.Character.TableTrans,
  wiki: TGApp.App.Character.WikiItem,
  targetLevel: number,
  targetTalentLevels: ReadonlyArray<number>,
  currentPromoteLevel?: number,
  targetAscendedAtThreshold = false,
): Array<CultivationMaterial> {
  const items = new Map<number, number>();
  const currentLevel = role.avatar.level;
  const avatarWithPromote = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  const levelExp = sumExperience(AVATAR_LEVEL_EXP, currentLevel, targetLevel);
  const expBookCount = Math.ceil(levelExp / 20000);
  add(items, HEROES_WIT_ID, expBookCount);
  add(items, MORA_ID, expBookCount * 4000);

  const ascensions = requiredAscensionIndices(
    currentLevel,
    targetLevel,
    currentPromoteLevel ?? resolvePromoteLevel(currentLevel, avatarWithPromote.promote_level),
    targetAscendedAtThreshold,
  );
  for (const index of ascensions) {
    const gem = AVATAR_GEM_COUNTS[index];
    const monster = AVATAR_MONSTER_COUNTS[index];
    add(items, MORA_ID, AVATAR_ASCENSION_MORA[index]);
    add(items, wiki.materials[0].id - 3 + gem[0], gem[1]);
    add(items, wiki.materials[1].id, AVATAR_BOSS_COUNTS[index]);
    add(items, wiki.materials[2].id, AVATAR_SPECIALTY_COUNTS[index]);
    add(items, wiki.materials[3].id - monster[0], monster[1]);
  }

  const levelableSkillIds = new Set(
    wiki.skills.filter((skill) => skill.maxLv !== 1).map((skill) => skill.id),
  );
  const skills = role.skills.filter(
    (skill) => skill.is_unlock && levelableSkillIds.has(skill.skill_id),
  );
  for (const [skillIndex, skill] of skills.entries()) {
    const currentTalentLevel = Math.min(skill.level, 10);
    const targetTalentLevel = Math.max(
      currentTalentLevel,
      Math.min(targetTalentLevels[skillIndex] ?? currentTalentLevel, 10),
    );
    for (let index = currentTalentLevel; index < targetTalentLevel; index++) {
      const book = TALENT_BOOK_COUNTS[index];
      const monster = TALENT_MONSTER_COUNTS[index];
      add(items, MORA_ID, TALENT_MORA[index]);
      add(items, wiki.materials[4].id - book[0], book[1]);
      add(items, wiki.materials[3].id - monster[0], monster[1]);
      add(items, wiki.materials[5].id, WEEKLY_BOSS_COUNTS[index]);
      if (index === 9) add(items, CROWN_OF_INSIGHT_ID, 1);
    }
  }
  return toList(items);
}

/**
 * 计算武器等级与突破所需的材料。
 *
 * @param weapon - 武器 Wiki 数据
 * @param currentLevel - 当前等级
 * @param currentPromoteLevel - 已完成的突破次数
 * @param targetLevel - 目标等级
 * @param targetAscendedAtThreshold - 到达目标临界等级后是否继续突破
 */
export function calculateWeaponMaterials(
  weapon: TGApp.App.Weapon.WikiItem,
  currentLevel: number,
  currentPromoteLevel: number,
  targetLevel: number,
  targetAscendedAtThreshold = false,
): Array<CultivationMaterial> {
  const items = new Map<number, number>();
  const experience = WEAPON_LEVEL_EXP[weapon.star];
  if (!experience) return [];
  const levelExp = sumExperience(experience, currentLevel, targetLevel);
  const oreCount = Math.ceil(levelExp / 10000);
  add(items, MYSTIC_ENHANCEMENT_ORE_ID, oreCount);
  add(items, MORA_ID, oreCount * 1000);

  const ascensions = requiredAscensionIndices(
    currentLevel,
    targetLevel,
    currentPromoteLevel,
    targetAscendedAtThreshold,
  );
  for (const index of ascensions) {
    const weaponMaterial = WEAPON_MATERIAL_COUNTS[weapon.star][index];
    const monsterA = WEAPON_MONSTER_A_COUNTS[weapon.star][index];
    const monsterB = WEAPON_MONSTER_B_COUNTS[weapon.star][index];
    add(items, MORA_ID, WEAPON_ASCENSION_MORA[weapon.star][index]);
    add(items, weapon.materials[0].id - weaponMaterial[0], weaponMaterial[1]);
    add(items, weapon.materials[1].id - monsterA[0], monsterA[1]);
    add(items, weapon.materials[2].id - monsterB[0], monsterB[1]);
  }
  return toList(items);
}

/** 合并多组养成材料需求。 */
export function mergeCultivationMaterials(
  ...groups: Array<ReadonlyArray<CultivationMaterial>>
): Array<CultivationMaterial> {
  const items = new Map<number, number>();
  for (const group of groups) {
    for (const item of group) add(items, item.id, item.count);
  }
  return toList(items);
}

/** 根据武器星级获取等级上限。 */
export function getWeaponMaxLevel(star: number): number {
  return star <= 2 ? 70 : 90;
}

/** 用户养成计算工具。 */
const userCalc = {
  avatar: calculateAvatarMaterials,
  weapon: calculateWeaponMaterials,
  merge: mergeCultivationMaterials,
  weaponMaxLevel: getWeaponMaxLevel,
  isAscensionLevel,
  isAscendedAtThreshold,
  resolveBagWeaponPromoteLevel,
  resolvePromoteLevel,
};

export default userCalc;
