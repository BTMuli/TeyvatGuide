/**
 * 用户成就模块
 * @since Beta v0.12.1
 */

import { UiafAchiStatEnum } from "@enum/uiaf.js";
import { path } from "@tauri-apps/api";
import appFs from "@utils/appFs.js";
import fmtUtil from "@utils/fmtUtil.js";
import TGLogger from "@utils/TGLogger.js";
import { compareVersions } from "@utils/toolFunc.js";

import TGSqlite from "../index.js";

import { AppAchiData } from "@/data/index.js";

const achievementCategoryMap: ReadonlyMap<number, TGApp.App.Achievement.Category> = new Map(
  AppAchiData.categories.map((category): [number, TGApp.App.Achievement.Category] => [
    category.id,
    category,
  ]),
);
const achievementMap: ReadonlyMap<number, TGApp.App.Achievement.Definition> = new Map(
  AppAchiData.categories.flatMap((category) =>
    category.achievements.map((achievement): [number, TGApp.App.Achievement.Definition] => [
      achievement.id,
      achievement,
    ]),
  ),
);
const achievementsByCategoryMap: ReadonlyMap<
  number,
  ReadonlyArray<TGApp.App.Achievement.Definition>
> = new Map(
  AppAchiData.categories.map(
    (category): [number, ReadonlyArray<TGApp.App.Achievement.Definition>] => [
      category.id,
      category.achievements,
    ],
  ),
);
const achievementStageRootMap: ReadonlyMap<number, number> = new Map(
  [...achievementMap.keys()].map((id): [number, number] => {
    let rootId = id;
    const visited = new Set<number>();
    while (!visited.has(rootId)) {
      visited.add(rootId);
      const current = achievementMap.get(rootId);
      if (current?.preStageId === undefined) break;
      rootId = current.preStageId;
    }
    return [id, rootId];
  }),
);

/**
 * 根据 ID 获取成就静态定义
 * @since Beta v0.12.1
 * @param id - 成就 ID
 * @returns 成就定义；未找到时为 undefined
 */
function getAchievementById(id: number): TGApp.App.Achievement.Definition | undefined {
  return achievementMap.get(id);
}

/**
 * 根据 ID 获取成就分类
 * @since Beta v0.12.1
 * @param id - 分类 ID
 * @returns 成就分类；未找到时为 undefined
 */
function getAchievementCategoryById(id: number): TGApp.App.Achievement.Category | undefined {
  return achievementCategoryMap.get(id);
}

/**
 * 根据分类 ID 获取该分类下的全部成就定义
 * @since Beta v0.12.1
 * @param id - 分类 ID
 * @returns 成就定义列表；未找到时为 undefined
 */
function getAchievementsByCategoryId(
  id: number,
): ReadonlyArray<TGApp.App.Achievement.Definition> | undefined {
  return achievementsByCategoryMap.get(id);
}

/**
 * 根据成就 ID 获取完整阶段链（从根阶段到末阶段）
 * @since Beta v0.12.1
 * @param id - 成就 ID
 * @returns 阶段链成就定义；未找到时为 undefined
 */
function getAchievementStageChain(id: number): Array<TGApp.App.Achievement.Definition> | undefined {
  const rootId = achievementStageRootMap.get(id);
  if (rootId === undefined) return undefined;
  const chain: Array<TGApp.App.Achievement.Definition> = [];
  const visited = new Set<number>();
  let currentId: number | undefined = rootId;
  while (currentId !== undefined && !visited.has(currentId)) {
    visited.add(currentId);
    const current = achievementMap.get(currentId);
    if (current === undefined) break;
    chain.push(current);
    currentId = current.postStageId;
  }
  return chain;
}

/**
 * UIAF 未记录完成时间的哨兵秒数
 * @since Beta v0.12.1
 */
const UIAFMagicTime = 253402271999;

type AchievementProgressUpdateItem = {
  definition: TGApp.App.Achievement.Definition;
  previous: TGApp.Sqlite.Achievement.UserState;
  next: TGApp.Sqlite.Achievement.UserState;
};

type AchievementProgressUpdate = {
  uid: number;
  progress: number;
  updated: string;
  items: Array<AchievementProgressUpdateItem>;
};

type AchievementProgressPreviewItem = {
  id: number;
  name: string;
  target: number;
  previousProgress: number;
  progress: number;
  previousStatus: TGApp.Plugins.UIAF.AchiItemStatEnum;
  status: TGApp.Plugins.UIAF.AchiItemStatEnum;
};

type AchievementProgressPreview = {
  progress: number;
  maxProgress: number;
  items: Array<AchievementProgressPreviewItem>;
};

/**
 * 判断 UIAF 状态是否已完成
 * @since Beta v0.12.1
 * @param status - UIAF 成就状态
 * @returns 是否已完成
 */
function isAchiCompleted(status: TGApp.Plugins.UIAF.AchiItemStatEnum): boolean {
  return status === UiafAchiStatEnum.Finished || status === UiafAchiStatEnum.RewardTaken;
}

function getEmptyUserState(id: number, uid: number): TGApp.Sqlite.Achievement.UserState {
  return {
    id,
    uid,
    isCompleted: false,
    completedTime: "",
    progress: 0,
    status: UiafAchiStatEnum.Unfinished,
    updated: "",
  };
}

function getUserState(raw: TGApp.Sqlite.Achievement.TableRaw): TGApp.Sqlite.Achievement.UserState {
  return {
    ...raw,
    isCompleted: isAchiCompleted(raw.status),
  };
}

function resolveProgressStatus(
  status: TGApp.Plugins.UIAF.AchiItemStatEnum,
  completed: boolean,
): TGApp.Plugins.UIAF.AchiItemStatEnum {
  if (completed) {
    return isAchiCompleted(status) ? status : UiafAchiStatEnum.RewardTaken;
  }
  return isAchiCompleted(status) ? UiafAchiStatEnum.Unfinished : status;
}

async function buildAchievementProgressUpdate(
  uid: number,
  achievementId: number,
  progress: number,
): Promise<AchievementProgressUpdate> {
  const chain = getAchievementStageChain(achievementId);
  if (chain === undefined || chain.length === 0) {
    throw new Error(`未找到成就 ${achievementId}`);
  }
  const maxProgress = Math.max(...chain.map((item) => item.target));
  if (!Number.isSafeInteger(progress) || progress < 0 || progress > maxProgress) {
    throw new Error(`成就进度必须是 0 到 ${maxProgress} 之间的整数`);
  }
  const db = await TGSqlite.getDB();
  const placeholders = chain.map(() => "?").join(", ");
  const userData = await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
    `SELECT * FROM Achievements WHERE uid = ? AND id IN (${placeholders});`,
    [uid, ...chain.map((item) => item.id)],
  );
  const userStateMap = new Map<number, TGApp.Sqlite.Achievement.UserState>(
    userData.map((item) => [item.id, getUserState(item)]),
  );
  const updated = fmtUtil.dateTime(new Date().getTime());
  const items = chain.map((definition): AchievementProgressUpdateItem => {
    const previous = userStateMap.get(definition.id) ?? getEmptyUserState(definition.id, uid);
    const completed = progress >= definition.target;
    const status = resolveProgressStatus(previous.status, completed);
    const newlyCompleted = completed && !isAchiCompleted(previous.status);
    const completedTime =
      newlyCompleted && previous.completedTime === "" ? updated : previous.completedTime;
    return {
      definition,
      previous,
      next: {
        ...previous,
        isCompleted: isAchiCompleted(status),
        completedTime,
        progress,
        status,
        updated,
      },
    };
  });
  return { uid, progress, updated, items };
}

/**
 * 获取最新成就版本
 * @since Beta v0.12.1
 * @returns 最新成就版本
 */
function getLatestAchiVersion(): string {
  let maxVersion = "";
  for (const category of AppAchiData.categories) {
    if (maxVersion === "" || compareVersions(category.version, maxVersion) > 0) {
      maxVersion = category.version;
    }
  }
  return maxVersion;
}

/**
 * 获取成就概况
 * @since Beta v0.12.1
 * @param uid - 存档UID
 * @param categoryId - 分类ID
 * @remarks categoryId 为可选参数
 * - 当传入 categoryId 时，统计该分类成就
 * - 否则，统计全部成就
 * @returns 成就概况
 */
async function getOverview(
  uid: number,
  categoryId?: number,
): Promise<TGApp.App.Achievement.Overview> {
  const db = await TGSqlite.getDB();
  let totalAchi: Array<number>;
  if (categoryId === undefined) {
    totalAchi = AppAchiData.categories.flatMap((category) =>
      category.achievements.map((achievement) => achievement.id),
    );
  } else {
    totalAchi = (getAchievementsByCategoryId(categoryId) ?? []).map(
      (achievement) => achievement.id,
    );
  }
  const totalAchiSet = new Set<number>(totalAchi);
  const userData = (
    await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
      "SELECT * FROM Achievements WHERE uid = $1 AND status IN (2, 3);",
      [uid],
    )
  ).filter((item) => totalAchiSet.has(item.id));
  return { total: totalAchi.length, fin: userData.length };
}

/**
 * 合并成就数据
 * @since Beta v0.12.1
 * @param raw - 元数据
 * @param uid - 存档 UID，可选参数
 * @param data - 数据库数据，可选参数
 * @returns 渲染数据
 */
function getRenderAchi(
  raw: TGApp.App.Achievement.Definition,
  uid?: number,
  data?: TGApp.Sqlite.Achievement.TableRaw,
): TGApp.App.Achievement.RenderItem {
  const emptyAchi: TGApp.Sqlite.Achievement.TableRaw = {
    id: 0,
    uid: uid ?? 0,
    isCompleted: 0,
    completedTime: "",
    progress: 0,
    status: UiafAchiStatEnum.Unfinished,
    updated: "",
  };
  const achiData = data ?? emptyAchi;
  const status = achiData.status ?? UiafAchiStatEnum.Unfinished;
  const isCompleted = isAchiCompleted(status);
  return {
    ...raw,
    uid: achiData.uid,
    status,
    isCompleted,
    completedTime: achiData.completedTime,
    progress: achiData.progress,
    updated: achiData.updated,
  };
}

/**
 * 对混合系列成就数据进行排序
 * @since Beta v0.12.1
 * @param data - 成旧数据
 * @returns 排序后的成就数据
 */
function sortMixAchi(
  data: Array<TGApp.App.Achievement.RenderItem>,
): Array<TGApp.App.Achievement.RenderItem> {
  return data.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return Number(a.isCompleted) - Number(b.isCompleted);
    if (!a.isCompleted) {
      const versionCompare = compareVersions(b.version, a.version);
      if (versionCompare !== 0) return versionCompare;
      return a.order - b.order;
    }
    if (b.completedTime !== a.completedTime) return b.completedTime.localeCompare(a.completedTime);
    const versionCompare = compareVersions(b.version, a.version);
    if (versionCompare !== 0) return versionCompare;
    return b.order - a.order;
  });
}

/**
 * 获取成就数据
 * @since Beta v0.12.1
 * @param uid - 存档 UID
 * @param categoryId - 成就分类ID
 * @returns 成就数据
 */
async function getAchievements(
  uid: number,
  categoryId?: number,
): Promise<Array<TGApp.App.Achievement.RenderItem>> {
  const db = await TGSqlite.getDB();
  const userData = await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
    "SELECT * FROM Achievements WHERE uid = ?;",
    [uid],
  );
  const userStateMap = new Map<number, TGApp.Sqlite.Achievement.TableRaw>(
    userData.map((item) => [item.id, item]),
  );
  let rawData: ReadonlyArray<TGApp.App.Achievement.Definition>;
  if (categoryId === undefined || categoryId === -1) {
    rawData = AppAchiData.categories.flatMap((category) => category.achievements);
  } else {
    rawData = getAchievementsByCategoryId(categoryId) ?? [];
  }
  let res = rawData.map((achi) => getRenderAchi(achi, uid, userStateMap.get(achi.id)));
  if (categoryId !== undefined && categoryId !== -1) {
    res.sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted) || a.order - b.order);
  } else {
    res = sortMixAchi(res);
  }
  return res;
}

/**
 * 获取成就完整阶段链的渲染数据
 * @since Beta v0.12.1
 * @param uid - 存档 UID
 * @param achievementId - 成就 ID
 * @returns 从根阶段到末阶段排列的成就渲染数据
 */
async function getAchievementStageItems(
  uid: number,
  achievementId: number,
): Promise<Array<TGApp.App.Achievement.RenderItem>> {
  const chain = getAchievementStageChain(achievementId);
  if (chain === undefined || chain.length === 0) return [];
  const db = await TGSqlite.getDB();
  const placeholders = chain.map(() => "?").join(", ");
  const userData = await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
    `SELECT * FROM Achievements WHERE uid = ? AND id IN (${placeholders});`,
    [uid, ...chain.map((item) => item.id)],
  );
  const userStateMap = new Map<number, TGApp.Sqlite.Achievement.TableRaw>(
    userData.map((item) => [item.id, item]),
  );
  return chain.map((definition) => getRenderAchi(definition, uid, userStateMap.get(definition.id)));
}

/**
 * 查找成就数据
 * @since Beta v0.12.1
 * @remarks 支持三种搜索方式：
 * - 版本搜索：输入 vx.x 格式的关键词（如 v1.2），搜索对应版本的成就
 * - ID搜索：输入 ixxx 格式的关键词（如 i1001），搜索对应ID的成就
 * - 文本搜索：输入任意关键词，搜索成就名称、描述或关联任务名称
 * @param uid - 存档 UID
 * @param keyword - 关键词
 * @returns 成就数据
 */
async function searchAchi(
  uid: number,
  keyword: string,
): Promise<Array<TGApp.App.Achievement.RenderItem>> {
  if (keyword === "") return await getAchievements(uid);
  const versionReg = /^v\d+(\.\d+)?$/;
  const idReg = /^i\d+$/;
  let rawData: ReadonlyArray<TGApp.App.Achievement.Definition>;
  if (versionReg.test(keyword)) {
    const version = keyword.replace("v", "");
    rawData = AppAchiData.categories.flatMap((category) =>
      category.achievements.filter((achievement) => achievement.version.includes(version)),
    );
  } else if (idReg.test(keyword)) {
    const id = parseInt(keyword.replace("i", ""));
    const find = getAchievementById(id);
    rawData = find === undefined ? [] : [find];
  } else {
    rawData = AppAchiData.categories.flatMap((category) =>
      category.achievements.filter(
        (achievement) =>
          achievement.name.includes(keyword) ||
          achievement.description.includes(keyword) ||
          achievement.trigger.tasks.some((task) => task.name.includes(keyword)),
      ),
    );
  }
  const db = await TGSqlite.getDB();
  const userData = await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
    "SELECT * FROM Achievements WHERE uid = ?;",
    [uid],
  );
  const userStateMap = new Map<number, TGApp.Sqlite.Achievement.TableRaw>(
    userData.map((item) => [item.id, item]),
  );
  const res = rawData.map((data) => getRenderAchi(data, uid, userStateMap.get(data.id)));
  return sortMixAchi(res);
}

/**
 * 更新成就数据
 * @since Beta v0.12.1
 * @param data - 成就数据
 * @returns 无返回值
 */
async function updateAchi(data: TGApp.App.Achievement.RenderItem): Promise<void> {
  const db = await TGSqlite.getDB();
  const isCompleted = isAchiCompleted(data.status);
  const updated = fmtUtil.dateTime(new Date().getTime());
  await db.execute(
    `INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, status, updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT(id, uid) DO UPDATE SET
       isCompleted = $3,
       completedTime = $4,
       progress = $5,
       status = $6,
       updated = $7;`,
    [
      data.id,
      data.uid,
      isCompleted ? 1 : 0,
      data.completedTime,
      data.progress,
      data.status,
      updated,
    ],
  );
}

/**
 * 预览共享进度对成就阶段链的影响
 * @since Beta v0.12.1
 * @param uid - 存档 UID
 * @param achievementId - 成就 ID
 * @param progress - 共享进度
 * @returns 阶段链变更预览
 */
async function getAchievementProgressPreview(
  uid: number,
  achievementId: number,
  progress: number,
): Promise<AchievementProgressPreview> {
  const update = await buildAchievementProgressUpdate(uid, achievementId, progress);
  return {
    progress: update.progress,
    maxProgress: Math.max(...update.items.map((item) => item.definition.target)),
    items: update.items.map((item) => ({
      id: item.definition.id,
      name: item.definition.name,
      target: item.definition.target,
      previousProgress: item.previous.progress,
      progress: item.next.progress,
      previousStatus: item.previous.status,
      status: item.next.status,
    })),
  };
}

/**
 * 在同一事务中更新完整阶段链的共享进度
 * @since Beta v0.12.1
 * @param uid - 存档 UID
 * @param achievementId - 成就 ID
 * @param progress - 共享进度
 * @returns 无返回值
 */
async function updateAchievementProgress(
  uid: number,
  achievementId: number,
  progress: number,
): Promise<void> {
  const update = await buildAchievementProgressUpdate(uid, achievementId, progress);
  const statements = update.items.map((item): TGApp.App.Sqlite.SqlStatement => ({
    query: `INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, status, updated)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT(id, uid) DO UPDATE SET
                isCompleted = $3,
                completedTime = $4,
                progress = $5,
                status = $6,
                updated = $7;`,
    values: [
      item.next.id,
      update.uid,
      item.next.isCompleted ? 1 : 0,
      item.next.completedTime,
      update.progress,
      item.next.status,
      update.updated,
    ],
  }));
  await TGSqlite.executeTransaction(statements);
}

/**
 * 将数据库数据转换为UIAF数据
 * @since Beta v0.6.0
 * @param data - 数据库数据
 * @returns UIAF数据
 */
function transDb2Uiaf(data: TGApp.Sqlite.Achievement.TableRaw): TGApp.Plugins.UIAF.Achievement {
  const status = data.status ?? UiafAchiStatEnum.Unfinished;
  let timestamp = 0;
  if (isAchiCompleted(status)) {
    timestamp =
      data.completedTime === ""
        ? UIAFMagicTime
        : Math.floor(new Date(data.completedTime).getTime() / 1000);
  }
  return { id: data.id, timestamp, current: data.progress, status };
}

/**
 * 获取指定Uid的UIAF数据
 * @since Beta v0.6.0
 * @param uid - 存档UID
 * @returns UIAF数据
 */
async function getUiafData(uid: number): Promise<Array<TGApp.Plugins.UIAF.Achievement>> {
  const db = await TGSqlite.getDB();
  const data = await db.select<Array<TGApp.Sqlite.Achievement.TableRaw>>(
    "SELECT * FROM Achievements WHERE uid=?;",
    [uid],
  );
  const res: Array<TGApp.Plugins.UIAF.Achievement> = [];
  for (const item of data) res.push(transDb2Uiaf(item));
  return res;
}

/**
 * 获取所有存档 uid
 * @since Beta v0.6.0
 * @returns 存档UID列表
 */
async function getAllUid(): Promise<Array<number>> {
  const db = await TGSqlite.getDB();
  type resType = Array<{ uid: number }>;
  const res = await db.select<resType>("SELECT DISTINCT uid FROM Achievements;");
  return res.map((i) => i.uid);
}

/**
 * 备份成就数据
 * @since Beta v0.12.0
 * @param dir - 存档数据
 * @param uid - 存档UID，未指定则导出所有
 * @returns 无返回值
 */
async function backupUiaf(dir: string, uid?: number): Promise<void> {
  let uidList = [];
  if (uid === undefined) uidList = await getAllUid();
  else uidList.push(uid);
  if (!(await appFs.exists(dir))) {
    await TGLogger.Warn("不存在指定的成就备份目录，即将创建");
    await appFs.mkdir(dir, { recursive: true });
  }
  for (const uidItem of uidList) {
    const data = await getUiafData(uidItem);
    const fileName = `UIAF_${uidItem}`;
    await appFs.writeTextFile(`${dir}${path.sep()}${fileName}.json`, JSON.stringify(data, null, 2));
    await TGLogger.Info(`成功备份${uidItem}的成就存档`);
  }
}

/**
 * 恢复成就数据
 * @since Beta v0.12.0
 * @param dir - 数据目录
 * @returns 是否恢复成功
 */
async function restoreUiaf(dir: string): Promise<boolean> {
  if (!(await appFs.exists(dir))) return false;
  const filesRead = await appFs.readDir(dir);
  // 校验 UIAF_xxx.json 文件
  const fileRegex = /^UIAF_\d+\.json$/;
  const files = filesRead.filter((item) => item.isFile && fileRegex.test(item.name));
  if (files.length === 0) return false;
  for (const file of files) {
    try {
      const uid = parseInt(file.name.replace("UIAF_", "").replace(".json", ""));
      const filePath = `${dir}${path.sep()}${file.name}`;
      const data: Array<TGApp.Plugins.UIAF.Achievement> = JSON.parse(
        await appFs.readTextFile(filePath),
      );
      await TSUserAchi.mergeUiaf(data, uid);
    } catch (e) {
      await TGLogger.Error(`[UIAF][RESTORE] 恢复成就数据${file.name} `);
      await TGLogger.Error(`${e}`);
      return false;
    }
  }
  return true;
}

/**
 * 导入Uiaf数据
 * @since Beta v0.7.8
 * @param data - 成就数据
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function mergeUiaf(data: Array<TGApp.Plugins.UIAF.Achievement>, uid: number): Promise<void> {
  const updated = fmtUtil.dateTime(new Date().getTime());
  const statements: Array<TGApp.App.Sqlite.SqlStatement> = [];
  for (const achi of data) {
    const status =
      achi.status >= UiafAchiStatEnum.Invalid && achi.status <= UiafAchiStatEnum.RewardTaken
        ? achi.status
        : UiafAchiStatEnum.Unfinished;
    if (status !== achi.status) {
      await TGLogger.Warn(`[Achievements][mergeUiaf] 非法 status ${achi.status}，按未完成处理`);
    }
    const isCompleted = isAchiCompleted(status);
    const timeC = isCompleted
      ? achi.timestamp === UIAFMagicTime
        ? ""
        : fmtUtil.dateTime(achi.timestamp * 1000)
      : "";
    statements.push({
      query: `INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, status, updated)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT(id, uid) DO UPDATE SET
                isCompleted = $3,
                completedTime = $4,
                progress = $5,
                status = $6,
                updated = $7;`,
      values: [achi.id, uid, isCompleted ? 1 : 0, timeC, achi.current, status, updated],
    });
  }
  if (statements.length > 0) await TGSqlite.executeTransaction(statements);
}

/**
 * 删除指定 UID 存档的数据
 * @since Beta v0.6.0
 * @param uid - 存档UID
 * @returns 无返回值
 */
async function delUid(uid: number): Promise<void> {
  const db = await TGSqlite.getDB();
  await db.execute("DELETE FROM Achievements WHERE uid=?;", [uid]);
}

/**
 * 用户成就数据库操作类
 * @since Beta v0.12.1
 */
const TSUserAchi = {
  getAchievementById,
  getAchievementCategoryById,
  getAchievementsByCategoryId,
  getAchievementStageChain,
  getLatestAchiVersion,
  getOverview,
  getAchievements,
  getAchievementStageItems,
  getAllUid,
  getUiafData,
  searchAchi,
  updateAchi,
  getAchievementProgressPreview,
  updateAchievementProgress,
  mergeUiaf,
  backupUiaf,
  restoreUiaf,
  delUid,
};

export default TSUserAchi;
