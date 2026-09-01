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
 * 根据 completed 跟 progress 获取 status
 * @since Beta v0.9.0
 * @param completed - 是否完成
 * @param progress - 进度
 * @returns 完成状态
 */
function getUiafStatus(completed: boolean, progress: number): TGApp.Plugins.UIAF.AchiItemStatEnum {
  if (!completed) return UiafAchiStatEnum.Unfinished;
  if (progress === 0) return UiafAchiStatEnum.Finished;
  if (progress !== 0) return UiafAchiStatEnum.RewardTaken;
  return UiafAchiStatEnum.Invalid;
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
      "SELECT * FROM Achievements WHERE uid = ? AND isCompleted = 1;",
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
    updated: "",
  };
  const achiData = data ?? emptyAchi;
  const isCompleted = achiData.isCompleted === 1;
  return {
    ...raw,
    uid: achiData.uid,
    status: getUiafStatus(isCompleted, achiData.progress),
    isCompleted,
    completedTime: achiData.completedTime,
    progress: achiData.progress,
    partialTimestamps: new Map<number, number>(),
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
 * 查找成就数据
 * @since Beta v0.12.1
 * @remarks 支持三种搜索方式：
 * - 版本搜索：输入 vx.x 格式的关键词（如 v1.2），搜索对应版本的成就
 * - ID搜索：输入 ixxx 格式的关键词（如 i1001），搜索对应ID的成就
 * - 名称/描述搜索：输入任意关键词，搜索成就名称或描述中包含该关键词的成就
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
          achievement.name.includes(keyword) || achievement.description.includes(keyword),
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
  await db.execute(
    "INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, updated) \
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id,uid) DO UPDATE \
      SET isCompleted=?,completedTime=?,progress=?,updated=?;",
    [
      data.id,
      data.uid,
      data.isCompleted ? 1 : 0,
      data.completedTime,
      data.progress,
      fmtUtil.dateTime(new Date().getTime()),
      data.isCompleted ? 1 : 0,
      data.completedTime,
      data.progress,
      fmtUtil.dateTime(new Date().getTime()),
    ],
  );
}

/**
 * 将数据库数据转换为UIAF数据
 * @since Beta v0.6.0
 * @param data - 数据库数据
 * @returns UIAF数据
 */
function transDb2Uiaf(data: TGApp.Sqlite.Achievement.TableRaw): TGApp.Plugins.UIAF.Achievement {
  let timestamp = 0;
  if (data.isCompleted === 1) timestamp = Math.floor(new Date(data.completedTime).getTime() / 1000);
  const status = getUiafStatus(data.isCompleted === 1, data.progress);
  return { id: data.id, timestamp: timestamp, current: data.progress, status };
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
  const db = await TGSqlite.getDB();
  for (const achi of data) {
    const status =
      achi.status === UiafAchiStatEnum.Finished || achi.status === UiafAchiStatEnum.RewardTaken
        ? 1
        : 0;
    const timeC = status === 1 ? fmtUtil.dateTime(achi.timestamp * 1000) : "";
    const timeN = fmtUtil.dateTime(new Date().getTime());
    await db.execute(
      "INSERT INTO Achievements(id, uid, isCompleted, completedTime, progress, updated) \
    VALUES (?,?,?,?,?,?) ON CONFLICT(id,uid) DO UPDATE  SET\
    isCompleted=?,completedTime=?,progress=?,updated=?;",
      [achi.id, uid, status, timeC, achi.current, timeN, status, timeC, achi.current, timeN],
    );
  }
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
  getAllUid,
  getUiafData,
  searchAchi,
  updateAchi,
  mergeUiaf,
  backupUiaf,
  restoreUiaf,
  delUid,
};

export default TSUserAchi;
