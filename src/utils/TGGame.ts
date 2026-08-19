/**
 * 游戏文件相关功能
 * @since Beta v0.11.5
 */

import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import gameEnum from "@enum/game.js";
import passportReq from "@req/passportReq.js";
import TSGameInstallation from "@Sqlm/gameInstallation.js";
import { invoke } from "@tauri-apps/api/core";
import { documentDir, resourceDir, sep } from "@tauri-apps/api/path";
import { copyFile, exists, mkdir, readDir, readTextFile, stat } from "@tauri-apps/plugin-fs";
import { platform } from "@tauri-apps/plugin-os";
import {
  inspectGameInstallation,
  launchGameInstallation,
  listGameInstallations,
} from "@utils/TGGameLauncher.js";
import TGHttps from "@utils/TGHttps.js";
import TGLogger from "@utils/TGLogger.js";
import { parse } from "ini";

// YAE支持的游戏版本
export const YAE_GAME_VER: Readonly<string> = "7.0.0";
// v0.11.3 发版时间，该版本更新了 dll 版本
const YAE_DLL_UPDATE_TIME = Date.parse("2026-08-12");

/**
 * 从旧 gameDir 设置迁移当前游戏安装。
 * @since Beta v0.11.5
 * @param gameDir - 旧版游戏目录
 * @returns 是否已存在或成功迁移安装
 */
export async function migrateLegacyGameInstallation(gameDir: string): Promise<boolean> {
  if (!gameDir || gameDir === "未设置") return false;
  try {
    const installations = await listGameInstallations();
    if (installations.length > 0) return true;
    const installation = await inspectGameInstallation(`${gameDir}${sep()}YuanShen.exe`);
    if (installation.status === gameEnum.installation.status.UNSUPPORTED) {
      await TGLogger.Warn(`[TGGame][migrateLegacyGameInstallation] ${installation.statusMessage}`);
      return false;
    }
    await TSGameInstallation.save(installation);
    await TGLogger.Info(
      `[TGGame][migrateLegacyGameInstallation] 已迁移旧游戏目录：${installation.status}`,
    );
    return true;
  } catch (error) {
    await TGLogger.Warn(`[TGGame][migrateLegacyGameInstallation] 迁移失败：${error}`);
    return false;
  }
}

/**
 * 启动当前登记的游戏安装。
 * @since Beta v0.11.5
 * @param account - 当前米游社游戏账号
 * @param cookie - 当前米游社 Cookie
 */
export async function tryLaunchGame(
  account?: TGApp.Sqlite.Account.Game,
  cookie?: TGApp.App.Account.Cookie,
): Promise<void> {
  let installations: Array<TGApp.Game.Installation.Item>;
  try {
    installations = await listGameInstallations();
  } catch (error) {
    showSnackbar.error(`读取游戏安装失败：${error}`);
    return;
  }
  const installation = installations.find((item) => item.isChosen) ?? installations[0];
  if (!installation) {
    showSnackbar.warn("请先在游戏安装页面登记游戏安装");
    return;
  }
  if (installation.status !== gameEnum.installation.status.KNOWN) {
    showSnackbar.warn(installation.statusMessage);
    return;
  }

  let ticket: string | undefined;
  if (installation.schemeId === gameEnum.installation.scheme.CN_OFFICIAL) {
    if (!account?.uid || !cookie) {
      showSnackbar.warn("启动国服官服前请先登录米游社");
      return;
    }
    if (account.isOfficial !== 1) {
      showSnackbar.warn("当前米游社账号不是官服账号");
      return;
    }
    try {
      const response = await passportReq.authTicket(account, cookie);
      if (response.retcode !== 0) {
        showSnackbar.error(`[${response.retcode}] ${response.message}`);
        await TGLogger.Warn(
          `[TGGame][tryLaunchGame] 获取官服 ticket 失败：${response.retcode}-${response.message}`,
        );
        return;
      }
      ticket = response.data.ticket;
    } catch (error) {
      const message = TGHttps.getErrMsg(error);
      showSnackbar.error(`获取 authTicket 失败：${message}`);
      await TGLogger.Error(`[TGGame][tryLaunchGame] 获取官服 ticket 异常：${message}`);
      return;
    }
  }

  try {
    await launchGameInstallation(installation.id, ticket);
    showSnackbar.success(`正在启动${gameEnum.installation.schemeDesc(installation.schemeId)}`);
  } catch (error) {
    showSnackbar.error(`启动游戏失败：${error}`);
  }
}

/**
 * 验证游戏格式
 * @since Beta v0.9.9
 * @param data - ini数据
 * @returns 类型收束
 */
function verifyConfigIni(data: object): data is TGApp.Game.Config.GameConf {
  if (!("general" in data) || typeof data.general !== "object" || data.general === null)
    return false;
  if (!("game_version" in data.general) || typeof data.general.game_version !== "string")
    return false;
  // 简单验证general跟game_version
  return true;
}

/**
 * 尝试获取游戏版本
 * @since Beta v0.10.2
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
  if (!(await exists(gameDir))) {
    await TGLogger.Warn(`[TGGame][tryReadGameVer] 游戏目录不存在: ${gameDir}`);
    return false;
  }
  const iniPath = `${gameDir}${sep()}config.ini`;
  if (await exists(iniPath)) {
    const iniRead = await readTextFile(iniPath);
    try {
      const iniParse = parse(iniRead);
      if (verifyConfigIni(iniParse)) return iniParse.general.game_version;
    } catch (e) {
      console.error(`config.ini格式异常,${e}`);
      showSnackbar.warn("config.ini 配置格式异常");
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
 * @since Beta v0.9.9
 */
export async function isRunInAdmin(): Promise<boolean> {
  try {
    return await invoke<boolean>("is_in_admin");
  } catch (err) {
    showSnackbar.error(`检测管理员权限失败：${err}`);
    await TGLogger.Error(`[TGGame][isRunInAdmin]检测管理员权限失败:${err}`);
    return false;
  }
}

/**
 * 尝试移动dll
 * @since Beta v0.11.5
 * @returns 是否存在 YaeAchievementLib.dll
 */
export async function tryCopyYae(): Promise<boolean> {
  const targetDir = `${await documentDir()}${sep()}TeyvatGuide`;
  const targetPath = `${targetDir}${sep()}YaeAchievementLib.dll`;
  const check = await exists(targetPath);
  if (check) {
    const dllModifiedTime = (await stat(targetPath)).mtime?.getTime();
    if (dllModifiedTime !== undefined && dllModifiedTime >= YAE_DLL_UPDATE_TIME) return true;
  }
  await mkdir(targetDir, { recursive: true });
  const srcDllPath = `${await resourceDir()}${sep()}resources${sep()}YaeAchievementLib.dll`;
  await copyFile(srcDllPath, targetPath);
  const check2 = await exists(targetPath);
  if (!check2) {
    showSnackbar.warn("移动 dll 失败，请手动移动");
    return false;
  }
  return true;
}

/**
 * 尝试调用Yae
 * @since Beta v0.9.6
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
  if (!(await exists(gameDir))) {
    showSnackbar.warn("游戏目录不存在，请检查设置");
    await TGLogger.Warn(`[TGGame][tryCallYae] 游戏目录不存在: ${gameDir}`);
    return;
  }
  const dirRead = await readDir(gameDir);
  const find = dirRead.find((i) => i.isFile && i.name.toLowerCase() === "yuanshen.exe");
  if (!find) {
    showSnackbar.warn("未检测到游戏本体");
    return;
  }
  const gamePath = `${gameDir}${sep()}${find.name}`;
  const isRun = await invoke<boolean>("is_process_running", { processName: "Yuanshen.exe" });
  if (isRun) {
    showSnackbar.warn("检测到已启动的原神进程，请关闭进程（Yuanshen.exe）后重试");
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
  const isMsix = await invoke<boolean>("is_msix");
  if (isMsix) await tryCopyYae();
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
    await invoke("call_yae_dll", { gamePath: gamePath, uid: input, isMsix: isMsix });
  } catch (err) {
    showSnackbar.error(`调用Yae DLL失败: ${err}`);
  }
}
