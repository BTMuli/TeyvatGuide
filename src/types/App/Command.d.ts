/**
 * Tauri command 响应类型定义
 * @since Beta v0.11.3
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
}
