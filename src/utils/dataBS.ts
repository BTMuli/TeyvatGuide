/**
 * @file utils/dataBS.ts
 * @description 用户数据的备份、恢复、迁移
 * @since Beta v0.4.1
 */

import { fs, path } from "@tauri-apps/api";

import showSnackbar from "../components/func/snackbar";
import TGSqlite from "../plugins/Sqlite";

/**
 * @description 备份用户数据
 * @since Beta v0.4.1
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function backUpUserData(dir: string): Promise<void> {
  if (!(await fs.exists(dir))) {
    console.log("备份目录不存在，创建备份目录");
    await fs.createDir(dir, { recursive: true });
  }
  // 备份成就数据
  const dataAchi = await TGSqlite.getUIAF();
  await fs.writeTextFile(`${dir}${path.sep}UIAF.json`, JSON.stringify(dataAchi));
  // 备份 ck
  const dataCK = await TGSqlite.getCookie();
  await fs.writeTextFile(`${dir}${path.sep}cookie.json`, JSON.stringify(dataCK));
  // 备份深渊数据
  const dataAbyss = await TGSqlite.getAbyss();
  await fs.writeTextFile(`${dir}${path.sep}abyss.json`, JSON.stringify(dataAbyss));
  // todo 添加祈愿数据备份支持
}

/**
 * @description 恢复用户数据
 * @since Beta v0.4.1
 * @param {string} dir 备份目录路径
 * @returns {Promise<void>}
 */
export async function restoreUserData(dir: string): Promise<void> {
  let errNum = 0;
  if (!(await fs.exists(dir))) {
    showSnackbar({
      text: "备份目录不存在",
      color: "error",
    });
    return;
  }
  // 恢复成就数据
  const dataAchiPath = `${dir}${path.sep}UIAF.json`;
  if (await fs.exists(dataAchiPath)) {
    try {
      const dataAchi: TGApp.Plugins.UIAF.Achievement[] = JSON.parse(
        await fs.readTextFile(dataAchiPath),
      );
      await TGSqlite.mergeUIAF(dataAchi);
    } catch (e) {
      showSnackbar({
        text: "成就数据恢复失败",
        color: "error",
      });
      errNum++;
    }
  } else {
    showSnackbar({
      text: "成就数据恢复失败，备份文件不存在",
      color: "warn",
    });
  }
  // 恢复 ck
  const dataCKPath = `${dir}${path.sep}cookie.json`;
  if (await fs.exists(dataCKPath)) {
    try {
      const dataCK = await fs.readTextFile(dataCKPath);
      await TGSqlite.saveAppData("cookie", JSON.stringify(JSON.parse(dataCK)));
    } catch (e) {
      showSnackbar({
        text: "Cookie 数据恢复失败",
        color: "error",
      });
      errNum++;
    }
  } else {
    showSnackbar({
      text: "Cookie 数据恢复失败，备份文件不存在",
      color: "warn",
    });
  }
  // 恢复深渊数据
  const dataAbyssPath = `${dir}${path.sep}abyss.json`;
  if (await fs.exists(dataAbyssPath)) {
    try {
      const dataAbyss: TGApp.Sqlite.Abyss.SingleTable[] = JSON.parse(
        await fs.readTextFile(dataAbyssPath),
      );
      await TGSqlite.restoreAbyss(dataAbyss);
    } catch (e) {
      showSnackbar({
        text: "深渊数据恢复失败",
        color: "error",
      });
      errNum++;
    }
  } else {
    showSnackbar({
      text: "深渊数据恢复失败，备份文件不存在",
      color: "warn",
    });
  }
  if (errNum === 0) {
    showSnackbar({
      text: "数据恢复成功",
      color: "success",
    });
  } else {
    showSnackbar({
      text: `数据恢复失败，失败数量：${errNum}`,
      color: "error",
    });
  }
}
