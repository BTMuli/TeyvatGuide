/**
 * UIAF工具类
 * @since Beta v0.6.0
 */

import showSnackbar from "@comp/func/snackbar.js";
import { app } from "@tauri-apps/api";
import { readTextFile } from "@tauri-apps/plugin-fs";
import Ajv from "ajv";
import type { ErrorObject } from "ajv/lib/types/index.js";

import TGLogger from "./TGLogger.js";

import { UiafSchema } from "@/data/index.js";

/**
 * 获取 UIAF 头部信息
 * @since Beta v0.3.4
 * @returns UIAF 头部信息
 */
export async function getUiafHeader(): Promise<TGApp.Plugins.UIAF.Export> {
  return {
    export_app: "TeyvatGuide",
    export_timestamp: Math.floor(Date.now() / 1000),
    export_app_version: await app.getVersion(),
    uiaf_version: "v1.1",
  };
}

/**
 * 检测是否存在 UIAF 数据，采用 ajv 验证 schema
 * @since Beta v0.5.0
 * @param path - UIAF 数据路径
 * @returns 是否存在 UIAF 数据
 */
export async function verifyUiafData(path: string): Promise<boolean> {
  const fileData: string = await readTextFile(path);
  // @ts-expect-error-next-line
  const ajv = new Ajv();
  const validate = ajv.compile(UiafSchema);
  try {
    const fileJson = JSON.parse(fileData);
    if (!validate(fileJson)) {
      if (validate.errors === undefined || validate.errors === null) return false;
      const error: ErrorObject = validate.errors[0];
      showSnackbar.error(`${error.instancePath || error.schemaPath} ${error.message}`);
      await TGLogger.Error(`UIAF 数据验证失败，文件路径：${path}`);
      await TGLogger.Error(`错误信息 ${validate.errors?.toString()}`);
      return false;
    }
    return true;
  } catch (e) {
    showSnackbar.error(`UIAF 数据格式错误 ${e}`);
    await TGLogger.Error(`UIAF 数据格式错误，文件路径：${path}`);
    await TGLogger.Error(`错误信息 ${e}`);
    return false;
  }
}

/**
 * 验证UIAF数据-剪贴板
 * @since Beta v0.4.7
 * @returns 是否验证通过
 */
export async function verifyUiafDataClipboard(): Promise<boolean> {
  // @ts-expect-error-next-line
  const ajv = new Ajv();
  const validate = ajv.compile(UiafSchema);
  const data = await window.navigator.clipboard.readText();
  try {
    const fileJson = JSON.parse(data);
    if (!validate(fileJson)) {
      if (validate.errors === undefined || validate.errors === null) return false;
      const error: ErrorObject = validate.errors[0];
      showSnackbar.error(`${error.instancePath || error.schemaPath} ${error.message}`);
      await TGLogger.Error(`UIAF 数据验证失败，剪贴板数据：${data}`);
      await TGLogger.Error(`错误信息 ${validate.errors}`);
      return false;
    }
    return true;
  } catch (e) {
    showSnackbar.error(`UIAF 数据格式错误 ${e}`);
    await TGLogger.Error(`UIAF 数据格式错误，剪贴板数据：${data}`);
    await TGLogger.Error(`错误信息 ${e}`);
    return false;
  }
}

/**
 * 读取 UIAF 数据
 * @since Beta v0.5.0
 * @param userPath - UIAF 数据路径
 * @returns UIAF 数据
 */
export async function readUiafData(userPath: string): Promise<TGApp.Plugins.UIAF.Data> {
  const fileData = await readTextFile(userPath);
  return JSON.parse(fileData) satisfies TGApp.Plugins.UIAF.Data;
}
