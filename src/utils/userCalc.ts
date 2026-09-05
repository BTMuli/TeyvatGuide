/**
 * 离线养成材料计算
 * @remarks 计算规则参考 Snap.Hutao Service/Cultivation/Offline
 * @since Beta v0.12.2
 */

/** 单项养成材料需求 */
export type CultivationMaterial = {
  /** 材料 ID */
  id: number;
  /** 所需数量 */
  count: number;
};

/**
 * 用于按突破区间分配经验材料的等级目标。
 * @since Beta v0.12.2
 */
export type ExperienceTarget = {
  type: "avatar" | "weapon";
  currentLevel: number;
  targetLevel: number;
  star: number;
};

/**
 * 单项材料的可合成结果
 * @since Beta v0.11.2
 */
export type CraftableMaterial = {
  /** 可用于补足需求的合成数量 */
  count: number;
  /** 合成方案实际消耗的背包材料 */
  consumed: Array<CultivationMaterial>;
};

/**
 * 材料合成后的分配结果
 * @since Beta v0.11.4
 */
export type CraftingAllocation = {
  /** 各需求材料可通过合成补足的数量及实际消耗 */
  materials: Map<number, CraftableMaterial>;
  /** 预留直接需求并扣除合成消耗后的剩余背包材料 */
  remainingInventory: Map<number, number>;
};

/**
 * 战绩技能与本地 Wiki 技能的对应关系。
 * @since Beta v0.11.2
 */
export type RecordTalentSkill = {
  /** 战绩接口返回的技能。 */
  recordSkill: TGApp.Game.Avatar.Skill;
  /** 通过技能名称匹配到的本地 Wiki 技能。 */
  wikiSkill: TGApp.App.Character.WikiSkill;
};

/** 可按名称匹配到 Wiki 的技能等级。 */
export type NamedTalentLevel = {
  /** 技能名称。 */
  name: string;
  /** 战绩接口返回的显示等级。 */
  level: number;
};

/** 材料 ID 偏移量与需求数量 */
type OffsetCount = readonly [offset: number, count: number];

/** 材料合成计算上下文 */
type CraftingContext = {
  /** 可用于合成的剩余背包材料 */
  inventory: Map<number, number>;
  /** 材料 Wiki 索引 */
  materials: ReadonlyMap<number, TGApp.App.Material.WikiItem>;
  /** 是否允许使用含嬗变之尘的配方 */
  useDust: boolean;
  /** 是否允许使用含异梦溶媒的配方 */
  useSolvent: boolean;
};

const MORA_ID = 202;
const AVATAR_EXP_MATERIALS = <const>[
  [104003, 20000],
  [104002, 5000],
  [104001, 1000],
];
const WEAPON_EXP_MATERIALS = <const>[
  [104013, 10000],
  [104012, 2000],
  [104011, 400],
];
const MASTERLESS_STELLA_FORTUNA_ID = 104300;
const CROWN_OF_INSIGHT_ID = 104319;
const DUST_OF_AZOTH_ID = 104201;
const DREAM_SOLVENT_ID = 113021;
const CONSTELLATION_TALENT_BONUS = 3;
const TARTAGLIA_ID = 10000033;
const TARTAGLIA_NORMAL_ATTACK_ID = 10331;
const TARTAGLIA_MASTER_OF_WEAPONRY_NAME = "诸武精通";
const AVATAR_REGULAR_MAX_LEVEL = 90;
const AVATAR_LIMIT_BREAK_COSTS: ReadonlyArray<readonly [level: number, count: number]> = [
  [95, 1],
  [100, 2],
];

/**
 * 角色与武器的突破临界等级。
 * @since Beta v0.11.2
 */
export const ASCENSION_LEVELS = <const>[20, 40, 50, 60, 70, 80];
const AVATAR_TALENT_LEVEL_CAPS = <const>[
  [40, 1],
  [50, 2],
  [60, 4],
  [70, 6],
  [80, 8],
  [90, 10],
];
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

/**
 * 根据技能 luc 与角色命座移除天赋等级加成。
 *
 * @param levels - 技能显示等级
 * @param lucLevels - 各技能获得等级加成所需的命座层数
 * @param constellation - 角色当前命座层数
 * @returns 校正后的实际培养等级
 * @since Beta v0.11.2
 */
export function applyTalentLevelCorrections(
  levels: ReadonlyArray<number>,
  lucLevels: ReadonlyArray<number | null>,
  constellation: number,
): Array<number> {
  return levels.map((level, index) => {
    const luc = lucLevels[index];
    return luc !== null && luc !== undefined && constellation >= luc
      ? Math.max(level - CONSTELLATION_TALENT_BONUS, 1)
      : level;
  });
}

/**
 * 获取战绩角色的可培养技能，并按本地 Wiki 的 A/E/Q 顺序返回。
 *
 * @remarks 战绩技能与本地 Wiki 技能通过名称匹配，不依赖两侧的技能 ID。
 * @param role - 用户战绩中的角色数据
 * @param wiki - 角色 Wiki 数据
 * @returns 战绩技能与 Wiki 技能的对应关系
 * @since Beta v0.11.2
 */
export function getRecordTalentSkills(
  role: TGApp.Sqlite.Character.TableTrans,
  wiki: TGApp.App.Character.WikiItem,
): Array<RecordTalentSkill> {
  const recordSkillMap = new Map(
    role.skills.filter((skill) => skill.is_unlock).map((skill) => [skill.name, skill]),
  );
  const talentSkills: Array<RecordTalentSkill> = [];
  for (const wikiSkill of wiki.skills) {
    if (wikiSkill.maxLv === 1) continue;
    const recordSkill = recordSkillMap.get(wikiSkill.name);
    if (recordSkill) talentSkills.push({ recordSkill, wikiSkill });
  }
  return talentSkills;
}

/**
 * 按技能名称移除命座天赋等级加成。
 *
 * @remarks 技能对应关系只使用名称，不依赖战绩技能 ID、技能组 ID 或数组顺序。
 * @param constellation - 角色当前命座层数
 * @param skills - 战绩接口返回的技能等级
 * @param wiki - 角色 Wiki 数据
 * @returns 与传入技能顺序一致的实际培养等级
 * @since Beta v0.11.2
 */
export function getCorrectedNamedTalentLevels(
  constellation: number,
  skills: ReadonlyArray<NamedTalentLevel>,
  wiki: TGApp.App.Character.WikiItem,
): Array<number> {
  const wikiSkillMap = new Map(
    wiki.skills.filter((skill) => skill.maxLv > 1).map((skill) => [skill.name, skill]),
  );
  const matchedWikiSkills = skills.map((skill) => wikiSkillMap.get(skill.name));
  return applyTalentLevelCorrections(
    skills.map((skill) => skill.level),
    matchedWikiSkills.map((skill) => skill?.luc ?? null),
    constellation,
  );
}

/**
 * 获取战绩角色用于背包计算的实际培养天赋等级。
 *
 * @param role - 用户战绩中的角色数据
 * @param wiki - 角色 Wiki 数据
 * @returns 校正后的实际培养等级
 * @since Beta v0.11.2
 */
export function getRecordTalentLevels(
  role: TGApp.Sqlite.Character.TableTrans,
  wiki: TGApp.App.Character.WikiItem,
): Array<number> {
  const skills = getRecordTalentSkills(role, wiki);
  const levels = getCorrectedNamedTalentLevels(
    role.avatar.actived_constellation_num,
    skills.map(({ recordSkill }) => ({ name: recordSkill.name, level: recordSkill.level })),
    wiki,
  );
  const isMasterOfWeaponryUnlocked = role.skills.some(
    (skill) => skill.name === TARTAGLIA_MASTER_OF_WEAPONRY_NAME && skill.is_unlock,
  );
  if (role.cid !== TARTAGLIA_ID || !isMasterOfWeaponryUnlocked) return levels;
  const normalAttackIndex = skills.findIndex(
    ({ wikiSkill }) => wikiSkill.id === TARTAGLIA_NORMAL_ATTACK_ID,
  );
  if (normalAttackIndex !== -1) {
    levels[normalAttackIndex] = Math.max(levels[normalAttackIndex] - 1, 1);
  }
  return levels;
}

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

/**
 * 按突破区间分配经验材料，溢出经验不计入下一区间。
 * @since Beta v0.12.2
 */
function addExperienceMaterials(
  items: Map<number, number>,
  data: ReadonlyArray<number>,
  current: number,
  target: number,
  materials: ReadonlyArray<readonly [id: number, experience: number]>,
  moraDivisor: number,
): void {
  if (current < 1 || current >= target || target >= data.length) return;
  const minimumExp = materials[materials.length - 1][1];
  const boundaries = [
    ...ASCENSION_LEVELS.filter((level) => level > current && level < target),
    target,
  ];
  let start = current;
  for (const end of boundaries) {
    // 先按最小材料取整，再优先使用高档材料，避免可整合的低档材料占用更多数量。
    let remaining = Math.ceil(sumExperience(data, start, end) / minimumExp) * minimumExp;
    for (const [id, experience] of materials) {
      const count = Math.floor(remaining / experience);
      add(items, id, count);
      add(items, MORA_ID, (count * experience) / moraDivisor);
      remaining -= count * experience;
    }
    start = end;
  }
}

/** 获取目标各突破区间的经验需求。 */
function getExperienceSegments(target: ExperienceTarget): Array<number> {
  const data = target.type === "avatar" ? AVATAR_LEVEL_EXP : WEAPON_LEVEL_EXP[target.star];
  const end = target.type === "avatar" ? Math.min(target.targetLevel, 90) : target.targetLevel;
  if (!data || target.currentLevel < 1 || end >= data.length) return [];
  let start = target.currentLevel;
  const segments: Array<number> = [];
  for (const boundary of [...ASCENSION_LEVELS, end]) {
    if (boundary <= start || boundary > end) continue;
    segments.push(sumExperience(data, start, boundary));
    start = boundary;
  }
  return segments;
}

/** 从三档整件材料中选择足够经验且溢出最少的组合；不足时使用全部库存。 */
function selectExperienceMaterials(
  experience: number,
  values: ReadonlyArray<number>,
  stock: ReadonlyArray<number>,
): Array<number> {
  const total = stock.reduce((sum, count, index) => sum + count * values[index], 0);
  if (total < experience) return [...stock];
  let best: Array<number> = [];
  let bestExperience = Infinity;
  let bestCount = Infinity;
  const highLimit = Math.min(stock[0], Math.ceil(experience / values[0]));
  for (let high = 0; high <= highLimit; high++) {
    const rest = Math.max(experience - high * values[0], 0);
    // 面额逐档整除，低两档只需比较向下取整后补小档与直接向上取整。
    const mediumFloor = Math.min(stock[1], Math.floor(rest / values[1]));
    const mediumCeil = Math.min(stock[1], Math.ceil(rest / values[1]));
    for (const medium of new Set([mediumFloor, mediumCeil])) {
      const low = Math.max(Math.ceil((rest - medium * values[1]) / values[2]), 0);
      if (low > stock[2]) continue;
      const supplied = high * values[0] + medium * values[1] + low * values[2];
      const count = high + medium + low;
      if (supplied < bestExperience || (supplied === bestExperience && count < bestCount)) {
        best = [high, medium, low];
        bestExperience = supplied;
        bestCount = count;
      }
    }
  }
  return best;
}

/**
 * 按可用库存重新组合经验材料需求，保留实际材料 ID 和整件数量。
 * @since Beta v0.12.2
 * @param requirements - 原始材料需求
 * @param inventory - 可用背包库存，不会被修改
 * @param targets - 等级目标；省略时将每类已有经验需求作为单一区间
 * @returns 按库存替代后的材料需求，包含对应的摩拉调整
 */
export function allocateExperienceRequirements(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  targets: ReadonlyArray<ExperienceTarget> = [],
): Array<CultivationMaterial> {
  const items = new Map<number, number>();
  for (const item of requirements) add(items, item.id, item.count);
  for (const type of <const>["avatar", "weapon"]) {
    const materials = type === "avatar" ? AVATAR_EXP_MATERIALS : WEAPON_EXP_MATERIALS;
    const divisor = type === "avatar" ? 5 : 10;
    const originalExperience = materials.reduce(
      (sum, [id, value]) => sum + (items.get(id) ?? 0) * value,
      0,
    );
    if (originalExperience <= 0) continue;
    const matchingTargets = targets.filter((target) => target.type === type);
    const segments =
      matchingTargets.length > 0
        ? matchingTargets.flatMap(getExperienceSegments)
        : [originalExperience];
    // 无有效等级区间时保留原始需求，兼容缺失等级信息的旧数据。
    if (segments.length === 0) continue;
    const stock = materials.map(([id]) => Math.max(Math.floor(inventory.get(id) ?? 0), 0));
    const values = materials.map(([, value]) => value);
    for (const [id] of materials) items.delete(id);
    let suppliedExperience = 0;
    for (const segment of segments) {
      const consumed = selectExperienceMaterials(segment, values, stock);
      let supplied = 0;
      for (const [index, count] of consumed.entries()) {
        add(items, materials[index][0], count);
        stock[index] -= count;
        supplied += count * values[index];
      }
      // 缺口按最小档取整后推荐高档优先的组合，不把溢出写回库存。
      const minimum = values[values.length - 1];
      let missing = Math.ceil(Math.max(segment - supplied, 0) / minimum) * minimum;
      suppliedExperience += supplied + missing;
      for (const [id, value] of materials) {
        const count = Math.floor(missing / value);
        add(items, id, count);
        missing -= count * value;
      }
    }
    if (items.has(MORA_ID)) {
      items.set(
        MORA_ID,
        Math.max(
          (items.get(MORA_ID) ?? 0) + (suppliedExperience - originalExperience) / divisor,
          0,
        ),
      );
    }
  }
  return toList(items);
}

/**
 * 获取可选的角色等级。
 *
 * @param maxLevel - 角色等级上限
 * @returns 1 至 90 级及不超过上限的特殊突破等级
 * @since Beta v0.11.4
 */
export function getAvatarLevelOptions(maxLevel = 100): Array<number> {
  const regularMaxLevel = Math.min(Math.max(Math.floor(maxLevel), 1), AVATAR_REGULAR_MAX_LEVEL);
  const regularLevels = Array.from({ length: regularMaxLevel }, (_, index) => index + 1);
  const limitBreakLevels = AVATAR_LIMIT_BREAK_COSTS.map(([level]) => level).filter(
    (level) => level <= maxLevel,
  );
  return [...regularLevels, ...limitBreakLevels];
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

/**
 * 根据角色等级获取可培养天赋的等级上限。
 * @param level - 角色等级
 * @param ascendedAtThreshold - 位于临界等级时是否已完成突破
 * @since Beta v0.11.2
 */
export function getAvatarTalentMaxLevel(level: number, ascendedAtThreshold = false): number {
  const capIndex = AVATAR_TALENT_LEVEL_CAPS.findIndex(([maxLevel]) => level <= maxLevel);
  if (capIndex === -1) return 10;
  const [maxLevel] = AVATAR_TALENT_LEVEL_CAPS[capIndex];
  const targetIndex =
    ascendedAtThreshold && level === maxLevel
      ? Math.min(capIndex + 1, AVATAR_TALENT_LEVEL_CAPS.length - 1)
      : capIndex;
  return AVATAR_TALENT_LEVEL_CAPS[targetIndex][1];
}

/** 判断对象是否已完成当前临界等级的突破。 */
export function isAscendedAtThreshold(level: number, promoteLevel?: number): boolean {
  const thresholdIndex = ASCENSION_LEVELS.findIndex((ascensionLevel) => ascensionLevel === level);
  return thresholdIndex !== -1 && (promoteLevel ?? 0) > thresholdIndex;
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
 * 根据角色当前状态计算等级、突破及天赋升级材料。
 * @since Beta v0.12.2
 * @param wiki - 角色 Wiki 数据
 * @param currentLevel - 当前等级
 * @param currentPromoteLevel - 已完成的突破次数
 * @param currentTalentLevels - 当前可升级天赋等级
 * @param targetLevel - 目标等级
 * @param targetTalentLevels - 目标天赋等级
 * @param targetAscendedAtThreshold - 到达目标临界等级后是否继续突破
 * @returns 材料需求
 */
export function calculateAvatarMaterialsFromState(
  wiki: TGApp.App.Character.WikiItem,
  currentLevel: number,
  currentPromoteLevel: number,
  currentTalentLevels: ReadonlyArray<number>,
  targetLevel: number,
  targetTalentLevels: ReadonlyArray<number>,
  targetAscendedAtThreshold = false,
): Array<CultivationMaterial> {
  const items = new Map<number, number>();
  addExperienceMaterials(
    items,
    AVATAR_LEVEL_EXP,
    currentLevel,
    Math.min(targetLevel, AVATAR_REGULAR_MAX_LEVEL),
    AVATAR_EXP_MATERIALS,
    5,
  );
  for (const [level, count] of AVATAR_LIMIT_BREAK_COSTS) {
    if (currentLevel < level && targetLevel >= level) {
      add(items, MASTERLESS_STELLA_FORTUNA_ID, count);
    }
  }

  const ascensions = requiredAscensionIndices(
    currentLevel,
    targetLevel,
    currentPromoteLevel,
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

  for (const [skillIndex, currentLevelValue] of currentTalentLevels.entries()) {
    const currentTalentLevel = Math.min(currentLevelValue, 10);
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
  const currentLevel = role.avatar.level;
  const avatarWithPromote = <TGApp.Game.Avatar.Avatar & { promote_level?: number }>role.avatar;
  const currentTalentLevels = getRecordTalentLevels(role, wiki);
  return calculateAvatarMaterialsFromState(
    wiki,
    currentLevel,
    currentPromoteLevel ?? resolvePromoteLevel(currentLevel, avatarWithPromote.promote_level),
    currentTalentLevels,
    targetLevel,
    targetTalentLevels,
    targetAscendedAtThreshold,
  );
}

/**
 * 计算武器等级与突破所需的材料。
 * @since Beta v0.12.2
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
  addExperienceMaterials(items, experience, currentLevel, targetLevel, WEAPON_EXP_MATERIALS, 10);

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

/**
 * 尝试消耗指定数量的材料，不足部分递归使用 Wiki 配方合成。
 *
 * @param id - 待消耗材料 ID
 * @param count - 待消耗数量
 * @param context - 当前合成上下文
 * @param visiting - 当前递归链上的材料 ID
 */
function consumeCraftingMaterial(
  id: number,
  count: number,
  context: CraftingContext,
  visiting: ReadonlySet<number>,
): CraftingContext | undefined {
  const nextContext: CraftingContext = {
    ...context,
    inventory: new Map(context.inventory),
  };
  const owned = Math.min(nextContext.inventory.get(id) ?? 0, count);
  nextContext.inventory.set(id, (nextContext.inventory.get(id) ?? 0) - owned);

  let remaining = count - owned;
  while (remaining > 0) {
    const craftedContext = tryCraftMaterial(id, nextContext, visiting);
    if (!craftedContext) return undefined;
    nextContext.inventory = craftedContext.inventory;
    remaining--;
  }
  return nextContext;
}

/** 尝试使用任意一条 Wiki 配方合成一个指定材料。 */
function tryCraftMaterial(
  id: number,
  context: CraftingContext,
  visiting: ReadonlySet<number>,
): CraftingContext | undefined {
  if (visiting.has(id)) return undefined;
  const material = context.materials.get(id);
  if (!material) return undefined;
  const nextVisiting = new Set(visiting).add(id);

  for (const recipe of material.convert) {
    if (
      !context.useDust &&
      recipe.source.some((source) => Number(source.id) === DUST_OF_AZOTH_ID)
    ) {
      continue;
    }
    if (
      !context.useSolvent &&
      recipe.source.some((source) => Number(source.id) === DREAM_SOLVENT_ID)
    ) {
      continue;
    }
    let recipeContext: CraftingContext | undefined = {
      ...context,
      inventory: new Map(context.inventory),
    };
    for (const source of recipe.source) {
      const sourceId = Number(source.id);
      if (!Number.isInteger(sourceId) || source.count <= 0) {
        recipeContext = undefined;
        break;
      }
      recipeContext = consumeCraftingMaterial(sourceId, source.count, recipeContext, nextVisiting);
      if (!recipeContext) break;
    }
    if (recipeContext && recipe.source.length > 0) return recipeContext;
  }
  return undefined;
}

/**
 * 根据背包余量与材料 Wiki 配方计算合成分配结果。
 *
 * @remarks 已直接满足材料需求的持有量会被优先保留，剩余材料按星级从高到低分配，
 * 同一份背包材料不会被重复计入多项合成结果。
 * @param requirements - 材料需求列表
 * @param inventory - 背包材料数量
 * @param materials - 材料 Wiki 数据
 * @param useDust - 是否允许使用含嬗变之尘的配方
 * @param useSolvent - 是否允许使用含异梦溶媒的配方
 * @returns 各需求材料的合成结果及扣除预留和合成消耗后的库存
 * @since Beta v0.11.4
 */
export function calculateCraftingAllocation(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  useDust = false,
  useSolvent = false,
): CraftingAllocation {
  const requiredCounts = new Map<number, number>();
  for (const requirement of requirements) add(requiredCounts, requirement.id, requirement.count);

  const context: CraftingContext = {
    inventory: new Map(inventory),
    materials: new Map(materials.map((material) => <const>[material.id, material])),
    useDust,
    useSolvent,
  };
  for (const [id, required] of requiredCounts) {
    const owned = context.inventory.get(id) ?? 0;
    context.inventory.set(id, Math.max(owned - required, 0));
  }

  const craftable = new Map<number, CraftableMaterial>();
  const pending = Array.from(requiredCounts, ([id, required]) => ({
    id,
    count: Math.max(required - (inventory.get(id) ?? 0), 0),
    star: context.materials.get(id)?.star ?? 0,
  })).sort((a, b) => b.star - a.star || a.id - b.id);

  for (const item of pending) {
    const inventoryBefore = new Map(context.inventory);
    let count = 0;
    while (count < item.count) {
      const craftedContext = tryCraftMaterial(item.id, context, new Set());
      if (!craftedContext) break;
      context.inventory = craftedContext.inventory;
      count++;
    }
    if (count > 0) {
      const consumed = Array.from(inventoryBefore, ([id, before]) => ({
        id,
        count: before - (context.inventory.get(id) ?? 0),
      })).filter((material) => material.count > 0);
      craftable.set(item.id, { count, consumed });
    }
  }
  return {
    materials: craftable,
    remainingInventory: context.inventory,
  };
}

/**
 * 根据背包余量与材料 Wiki 配方计算各项需求可通过合成补足的数量。
 *
 * @remarks 已直接满足材料需求的持有量会被优先保留，剩余材料按星级从高到低分配，
 * 同一份背包材料不会被重复计入多项合成结果。
 * @param requirements - 材料需求列表
 * @param inventory - 背包材料数量
 * @param materials - 材料 Wiki 数据
 * @param useDust - 是否允许使用含嬗变之尘的配方
 * @param useSolvent - 是否允许使用含异梦溶媒的配方
 * @returns 各需求材料可通过合成补足的数量及实际消耗
 * @since Beta v0.11.2
 */
export function calculateCraftableMaterials(
  requirements: ReadonlyArray<CultivationMaterial>,
  inventory: ReadonlyMap<number, number>,
  materials: ReadonlyArray<TGApp.App.Material.WikiItem>,
  useDust = false,
  useSolvent = false,
): Map<number, CraftableMaterial> {
  return calculateCraftingAllocation(requirements, inventory, materials, useDust, useSolvent)
    .materials;
}

/** 根据武器星级获取等级上限。 */
export function getWeaponMaxLevel(star: number): number {
  return star <= 2 ? 70 : 90;
}

/** 用户养成计算工具。 */
const userCalc = {
  avatar: calculateAvatarMaterials,
  avatarFromState: calculateAvatarMaterialsFromState,
  avatarLevelOptions: getAvatarLevelOptions,
  craft: calculateCraftableMaterials,
  weapon: calculateWeaponMaterials,
  merge: mergeCultivationMaterials,
  weaponMaxLevel: getWeaponMaxLevel,
  avatarTalentMaxLevel: getAvatarTalentMaxLevel,
  isAscensionLevel,
  isAscendedAtThreshold,
  correctTalentLevels: applyTalentLevelCorrections,
  correctedNamedTalentLevels: getCorrectedNamedTalentLevels,
  recordTalentLevels: getRecordTalentLevels,
  recordTalentSkills: getRecordTalentSkills,
  resolvePromoteLevel,
};

export default userCalc;
