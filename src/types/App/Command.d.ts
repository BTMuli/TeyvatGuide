/**
 * Tauri command 响应类型定义
 * @since Beta v0.12.0
 */

declare namespace TGApp.App.Command {
  /**
   * 回环豁免执行结果
   * @since Beta v0.11.3
   */
  type LoopbackExemptResp = {
    /** 是否成功执行豁免 */
    success: boolean;
    /** 提示信息 */
    message: string;
    /** 实际执行命令（用于手动复制） */
    command: string;
  };

  /**
   * 备份/恢复目录项，字段对齐 `@tauri-apps/plugin-fs` 的 `DirEntry`。
   * @since Beta v0.12.0
   */
  type FsDirEntry = {
    /** 条目名称 */
    name: string;
    /** 是否为目录 */
    isDirectory: boolean;
    /** 是否为文件 */
    isFile: boolean;
    /** 是否为符号链接 */
    isSymlink: boolean;
  };
}
