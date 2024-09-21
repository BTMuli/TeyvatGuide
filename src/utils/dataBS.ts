/**
 * @file utils/dataBS.ts
 * @description 用户数据的备份、恢复、迁移
 * @since Beta v0.6.0
 */

import { path } from "@tauri-apps/api";
import { exists, mkdir, writeTextFile, readDir, readTextFile } from "@tauri-apps/plugin-fs";

import showSnackbar from "../components/func/snackbar.js";
import TGSqlite from "../plugins/Sqlite/index.js";
import TSUserAbyss from "../plugins/Sqlite/modules/userAbyss.js";
import TSUserAchi from "../plugins/Sqlite/modules/userAchi.js";
import TSUserGacha from "../plugins/Sqlite/modules/userGacha.js";

import TGLogger from "./TGLogger.js";
import { exportUigfData, readUigfData, verifyUigfData } from "./UIGF.js";

/**
 * @description 备份用户数据
 * @since Beta v0.6.0
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function backUpUserData(dir: string): Promise<void> {
  if (!(await exists(dir))) {
    console.log("备份目录不存在，创建备份目录");
    await mkdir(dir, { recursive: true });
  }
  // 备份成就
  await TSUserAchi.backupUiaf(dir);
  // 备份 ck
  const dataCK = await TGSqlite.getCookie();
  await writeTextFile(`${dir}${path.sep()}cookie.json`, JSON.stringify(dataCK));
  // 备份深渊数据
  await TSUserAbyss.backupAbyss(dir);
  // 备份祈愿数据
  const uidList = await TSUserGacha.getUidList();
  for (const uid of uidList) {
    const dataGacha = await TSUserGacha.getGachaRecords(uid);
    const savePath = `${dir}${path.sep()}UIGF_${uid}.json`;
    await exportUigfData(uid, dataGacha, savePath);
  }
}

/**
 * @description 恢复用户数据
 * @since Beta v0.6.0
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function restoreUserData(dir: string): Promise<void> {
  let errNum = 0;
  if (!(await exists(dir))) {
    showSnackbar({ text: "备份目录不存在", color: "error" });
    return;
  }
  const filesRead = await readDir(dir);
  const files = filesRead.filter((item) => item.isFile && item.name.endsWith(".json"));
  await TGLogger.Info(`[DataBS][restoreUserData] files: ${JSON.stringify(files)}`);
  const restoreAchi = await TSUserAchi.restoreUiaf(dir);
  if (!restoreAchi) {
    showSnackbar({ text: `成就数据恢复失败`, color: "error" });
    errNum++;
  }
  // 恢复 ck
  const ckFind = files.find((item) => item.name === "cookie.json");
  if (ckFind) {
    try {
      const dataCK = await readTextFile(ckFind.name);
      await TGSqlite.saveAppData("cookie", JSON.stringify(JSON.parse(dataCK)));
      await TGLogger.Info(`[DataBS][restoreUserData] Cookie 数据恢复成功`);
    } catch (e) {
      showSnackbar({ text: `Cookie 数据恢复失败 ${e}`, color: "error" });
      await TGLogger.Error(`[DataBS][restoreUserData] Cookie 数据恢复失败 ${e}`);
      errNum++;
    }
  } else {
    showSnackbar({ text: "Cookie 数据恢复失败，备份文件不存在", color: "warn" });
    await TGLogger.Warn(`[DataBS][restoreUserData] 未检测到 Cookie 数据备份文件`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  // 恢复深渊数据
  const restoreAbyss = await TSUserAbyss.restoreAbyss(dir);
  if (!restoreAbyss) {
    showSnackbar({ text: "深渊数据恢复失败", color: "error" });
    errNum++;
  }
  // 恢复祈愿数据
  const reg = /UIGF_(\d+).json/;
  const dataGachaList = files.filter((item) => reg.test(item.name));
  for (const item of dataGachaList) {
    const check = await verifyUigfData(item.name);
    if (!check) {
      errNum++;
      continue;
    }
    const data = await readUigfData(item.name);
    const uid = data.info.uid;
    try {
      await TSUserGacha.mergeUIGF(uid, data.list);
      await TGLogger.Info(`[DataBS][restoreUserData] UID: ${uid} 祈愿数据恢复成功`);
    } catch (e) {
      showSnackbar({ text: `UID: ${uid} 祈愿数据恢复失败`, color: "error" });
      await TGLogger.Error(`[DataBS][restoreUserData] UID: ${uid} 祈愿数据恢复失败 ${e}`);
      errNum++;
    }
  }
  if (errNum === 0) {
    showSnackbar({ text: "数据恢复成功", color: "success" });
  } else {
    showSnackbar({ text: `数据恢复失败，失败数量：${errNum}`, color: "error" });
  }
}
