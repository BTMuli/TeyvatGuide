/**
 * 分享截图类型
 * @since Beta v0.13.2
 */

declare namespace TGApp.App.Share {
  /**
   * 分享截图进度
   * @since Beta v0.13.2
   */
  type Progress = {
    /** snapshot 背景快照 / bake 毛玻璃烘焙 / capture 最终截图 */
    phase: "snapshot" | "bake" | "capture";
    /** 已完成数量 */
    current: number;
    /** 总数量 */
    total: number;
  };

  /**
   * 分享截图进度回调
   * @since Beta v0.13.2
   * @param progress - 当前阶段的进度
   */
  type ProgressCallback = (progress: Progress) => void;
}
