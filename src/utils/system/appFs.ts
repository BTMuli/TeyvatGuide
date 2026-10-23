/**
 * 备份/恢复文件读写，绕过 fs 插件对 WebView 数据目录的 forbid。
 * @since Beta v0.12.0
 */

import { core } from "@tauri-apps/api";

type AppFsMkdirOptions = {
  recursive?: boolean;
};

/**
 * 判断路径是否存在。
 * @since Beta v0.12.0
 * @param path - 目标路径
 * @returns 是否存在
 */
async function exists(path: string): Promise<boolean> {
  return await core.invoke<boolean>("app_fs_exists", { path });
}

/**
 * 创建目录。
 * @since Beta v0.12.0
 * @param path - 目录路径
 * @param options - 创建选项
 * @returns 无返回值
 */
async function mkdir(path: string, options?: AppFsMkdirOptions): Promise<void> {
  await core.invoke("app_fs_mkdir", { path, recursive: options?.recursive === true });
}

/**
 * 写入文本文件。
 * @since Beta v0.12.0
 * @param path - 文件路径
 * @param contents - 文本内容
 * @returns 无返回值
 */
async function writeTextFile(path: string, contents: string): Promise<void> {
  await core.invoke("app_fs_write_text_file", { path, contents });
}

/**
 * 读取文本文件。
 * @since Beta v0.12.0
 * @param path - 文件路径
 * @returns 文件文本
 */
async function readTextFile(path: string): Promise<string> {
  return await core.invoke<string>("app_fs_read_text_file", { path });
}

/**
 * 读取目录项。
 * @since Beta v0.12.0
 * @param path - 目录路径
 * @returns 目录项列表
 */
async function readDir(path: string): Promise<Array<TGApp.App.Command.FsDirEntry>> {
  return await core.invoke<Array<TGApp.App.Command.FsDirEntry>>("app_fs_read_dir", { path });
}

/**
 * 备份/恢复文件读写方法集合。
 * @since Beta v0.12.0
 */
const appFs = {
  exists,
  mkdir,
  writeTextFile,
  readTextFile,
  readDir,
};

export default appFs;
