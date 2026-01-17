/**
 * 游戏文件相关功能
 * @since Beta v0.9.2
 */

import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import { invoke } from "@tauri-apps/api/core";
import { appConfigDir, resourceDir, sep } from "@tauri-apps/api/path";
import { copyFile, exists, readTextFile, readTextFileLines } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import TGLogger from "@utils/TGLogger.js";

// YAE支持的游戏版本
export const YAE_GAME_VER: Readonly<string> = "6.3.0";

/**
 * 尝试获取游戏版本
 * @since Beta v0.9.1
 * @remarks
 * 1. 读取 config.ini 下的 game_version
 * 2. 没有 config.ini ，读取 YuanShen_Data\\Persistent\\ScriptVersion
 * @param gameDir - 游戏目录
 * @returns 版本或 false
 */
export async function tryReadGameVer(gameDir: string): Promise<false | string> {
  if (platform() !== "windows") {
    showSnackbar.warn("该功能仅支持Windows系统");
    return false;
  }
  const iniPath = `${gameDir}${sep()}config.ini`;
  if (await exists(iniPath)) {
    const iniRead = await readTextFileLines(iniPath);
    while (true) {
      const line = await iniRead.next();
      if (line.value.startsWith("game_version=")) return line.value.split("=")[1];
      if (line.done) break;
    }
  }
  const scriptPath = `${gameDir}${sep()}YuanShen_Data${sep()}Persistent${sep()}ScriptVersion`;
  if (await exists(scriptPath)) {
    return await readTextFile(scriptPath);
  }
  return false;
}

/**
 * 判断是否是管理员模式
 * @since Beta v0.9.1
 */
export async function isRunInAdmin(): Promise<boolean> {
  let isAdmin = false;
  try {
    isAdmin = await invoke<boolean>("is_in_admin");
  } catch (err) {
    showSnackbar.error(`检测管理员权限失败：${err}`);
    await TGLogger.Error(`[TGGame][isRunInAdmin]检测管理员权限失败:${err}`);
    return false;
  }
  return isAdmin;
}

/**
 * 尝试移动dll
 * @since Beta v0.9.2
 * @returns 无返回值
 */
export async function tryCopyYae(): Promise<boolean> {
  const srcDllPath = `${await resourceDir()}${sep()}resources${sep()}YaeAchievementLib.dll`;
  console.log(srcDllPath);
  const srcCheck = await exists(srcDllPath);
  if (!srcCheck) {
    showSnackbar.warn("未检测到本地 dll");
    return false;
  }
  const targetPath = `${await appConfigDir()}${sep()}YaeAchievementLib.dll`;
  console.log(targetPath);
  await copyFile(srcDllPath, targetPath);
  const check2 = await exists(targetPath);
  if (!check2) {
    showSnackbar.warn("移动 dll 失败");
    return false;
  }
  return true;
}

/**
 * 尝试调用Yae
 * @since Beta v0.9.2
 * @param gameDir - 游戏目录
 * @param uid - 启动UID
 * @returns void
 */
export async function tryCallYae(gameDir: string, uid?: string): Promise<void> {
  if (platform() !== "windows") {
    showSnackbar.warn("该功能仅支持Windows系统");
    return;
  }
  if (gameDir === "未设置") {
    showSnackbar.warn("请前往设置页面设置游戏安装目录");
    return;
  }
  const gamePath = `${gameDir}${sep()}YuanShen.exe`;
  if (!(await exists(gamePath))) {
    showSnackbar.warn("未检测到游戏本体");
    return;
  }
  const gameVer = await tryReadGameVer(gameDir);
  if (gameVer !== YAE_GAME_VER) {
    const check = await showDialog.check(
      "确认启动?",
      `支持版本:${YAE_GAME_VER}，检测版本:${gameVer === false ? "无数据" : gameVer}`,
    );
    showSnackbar.warn(`游戏版本不一致，支持版本为${YAE_GAME_VER}`);
    if (!check) return;
  }
  const adminCheck = await isRunInAdmin();
  if (!adminCheck) {
    const check = await showDialog.check("是否以管理员模式重启？", "该功能需要管理员权限才能使用");
    if (!check) {
      showSnackbar.cancel("已取消以管理员模式重启");
      return;
    }
    try {
      await invoke("run_with_admin");
    } catch (err) {
      showSnackbar.error(`以管理员模式重启失败：${err}`);
      await TGLogger.Error(`[TGGame][tryCallYae]以管理员模式启动失败 - ${err}`);
      return;
    }
    return;
  }
  const tryCopy = await tryCopyYae();
  if (!tryCopy) return;
  const input = await showDialog.input("请输入存档UID", "UID:", uid);
  if (!input) {
    showSnackbar.cancel("已取消存档导入");
    return;
  }
  if (input === "" || isNaN(Number(input))) {
    showSnackbar.warn("请输入合法数字");
    return;
  }
  try {
    await invoke("call_yae_dll", { gamePath: gamePath, uid: input });
  } catch (err) {
    showSnackbar.error(`调用Yae DLL失败: ${err}`);
  }
}
