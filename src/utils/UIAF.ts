/**
 * @file utils UIAF.ts
 * @description UIAF工具类
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

// tauri
import { app, fs, path } from "@tauri-apps/api";
// data
import { TGAppData } from "../data";
// utils
import { UpdateTGDataByKey } from "./TGIndex";

/**
 * @description 时间戳转换为日期
 * @since Alpha v0.1.4
 * @param {number} timestamp - 时间戳
 * @returns {string} 日期
 */
export function timestampToDate (timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("zh", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * @description 根据 completed 跟 progress 获取 status
 * @since Alpha v0.1.4
 * @param {boolean} completed - 是否完成
 * @param {number} progress - 进度
 * @returns {number} status
 */
export function getUiafStatus (completed: boolean, progress: number): number {
  if (progress !== 0 && !completed) {
    return 1;
  } else if (progress === 0 && completed) {
    return 2;
  } else if (progress !== 0 && completed) {
    return 3;
  } else {
    return 0;
  }
}

/**
 * @description 获取 UIAF 头部信息
 * @since Alpha v0.1.3
 * @returns {Promise<TGPlugin.UIAF.Header>}
 */
export async function getUiafHeader (): Promise<TGPlugin.UIAF.Header> {
  return {
    // eslint-disable-next-line camelcase
    export_app: "Tauri.Genshin",
    // eslint-disable-next-line camelcase
    export_timestamp: Math.floor(Date.now() / 1000),
    // eslint-disable-next-line camelcase
    export_app_version: await app.getVersion(),
    // eslint-disable-next-line camelcase
    uiaf_version: "v1.1",
  };
}

/**
 * @description 检测是否存在 UIAF 数据
 * @description 粗略检测，不保证数据完整性
 * @since Alpha v0.1.3
 * @param {string} path - UIAF 数据路径
 * @returns {Promise<boolean>} 是否存在 UIAF 数据
 */
export async function verifyUiafData (path: string): Promise<boolean> {
  const fileData: string = await fs.readTextFile(path);
  const UiafData: TGPlugin.UIAF.Header = JSON.parse(fileData).info;
  return UiafData.uiaf_version !== undefined;
}

/**
 * @description 读取 UIAF 数据
 * @since Alpha v0.1.3
 * @param {string} userPath - UIAF 数据路径
 * @returns {Promise<string|false>} UIAF 数据
 */
export async function readUiafData (userPath: string): Promise<string | false> {
  if (await fs.exists(userPath)) {
    const fileData = await fs.readTextFile(userPath);
    if (fileData !== undefined && fileData !== null && fileData !== "" && fileData !== "{}") {
      return fileData;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

/**
 * @description 根据成就数据导出 UIAF 数据
 * @since Alpha v0.1.4
 * @param {BTMuli.Genshin.Achievement[]} achievementData - 成就数据
 * @returns {Promise<void>}
 */
export async function backupUiafData (achievementData: BTMuli.Genshin.Achievement[]): Promise<void> {
  const res = [] as TGPlugin.UIAF.Achievement[];
  const savePath = `${await path.appLocalDataDir()}\\userData\\UIAF.json`;
  achievementData.forEach((achievement) => {
    if (achievement.completed || achievement.progress !== 0) {
      return res.push({
        id: achievement.id,
        timestamp: achievement.completed && achievement.completed_time ? Math.round(new Date(achievement.completed_time).getTime() / 1000) : 0,
        current: achievement.progress,
        status: getUiafStatus(achievement.completed, achievement.progress),
      });
    }
  });
  await fs.writeTextFile(savePath, JSON.stringify(res, null, 2));
}

/**
 * @description 根据 UIAF 数据恢复成就数据
 * @since Alpha v0.1.4
 * @returns {Promise<{total: number, completed: number}> | false} 恢复的成就数量
 */
export async function restoreUiafData (): Promise<{ total: number, completed: number } | false> {
  const uiafPath = `${await path.appLocalDataDir()}\\userData\\UIAF.json`;
  // 检测是否存在 UIAF 数据
  if (!await fs.exists(uiafPath)) {
    return false;
  }
  const uiafData = JSON.parse(await fs.readTextFile(uiafPath)) as TGPlugin.UIAF.Achievement[];
  const achievementData = TGAppData.achievements;
  const seriesData = TGAppData.achievementSeries;
  uiafData.forEach((uiafAchievement) => {
    // 更新成就数据
    const localAchievement = achievementData[uiafAchievement.id];
    localAchievement.completed = uiafAchievement.status === 2 || uiafAchievement.status === 3;
    localAchievement.progress = uiafAchievement.current;
    // eslint-disable-next-line camelcase
    localAchievement.completed_time = uiafAchievement.timestamp !== 0 ? timestampToDate(uiafAchievement.timestamp) : "";
    UpdateTGDataByKey("Achievements", localAchievement);
    // 更新成就系列数据
    if (localAchievement.completed) {
      const localSeries = seriesData[localAchievement.series];
      // eslint-disable-next-line camelcase
      localSeries.completed_count += 1;
      seriesData[localAchievement.series] = localSeries;
      UpdateTGDataByKey("AchievementSeries", localSeries);
    }
  });
  // 获取 total 和 completed
  let total = 0;
  let completed = 0;
  Object.values(seriesData).forEach((series) => {
    total += series.total_count;
    completed += series.completed_count;
  });
  // 返回
  return {
    total,
    completed,
  };
}
